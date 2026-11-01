import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import {
  signupHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "@/modules/auth/handlers";
import { User, Session, PasswordReset } from "@/modules/auth/models";
import { authDatabase, createSession } from "@/modules/auth/repository";
import { currentUser } from "@/modules/auth/service";
import {
  createToken,
  hashToken,
  verifyPassword,
} from "@/server/security/credentials";
import { consumeLimit, limitAuthRequest } from "@/server/security/rate-limit";
import { setSessionCookie } from "@/server/auth/session";
import { NextResponse } from "next/server";

const mail = vi.hoisted(() => ({
  messages: [] as { email: string; token: string }[],
  fail: false,
}));
vi.mock("@/server/email/password-reset", () => ({
  sendPasswordReset: async (email: string, token: string) => {
    if (mail.fail) throw new Error("provider detail must not leak");
    mail.messages.push({ email, token });
  },
}));
const password = "A memorable wedding password";
const email = "Priya@example.com";
let mongo: MongoMemoryReplSet;

function request(
  action: string,
  body?: unknown,
  cookie?: string,
  origin = "http://localhost:3000",
) {
  return new NextRequest(`http://localhost:3000/api/auth/${action}`, {
    method: action === "me" ? "GET" : "POST",
    headers: {
      origin,
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function signup() {
  const response = await signupHandler(
    request("signup", { name: " Priya Sharma ", email, password }),
  );
  expect(response.status).toBe(201);
  const token = response.cookies.get("mmm_session")!.value;
  return { response, token, cookie: `mmm_session=${token}` };
}
beforeAll(async () => {
  // Never load .env.local or connect to the user's configured database.
  mongo = await MongoMemoryReplSet.create({
    binary: { downloadDir: join(tmpdir(), "mmm-mongodb-binaries") },
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = mongo.getUri("mmm_auth_test");
  process.env.APP_URL = "http://localhost:3000";
  process.env.RESEND_API_KEY = "test-only-never-sent";
  process.env.EMAIL_FROM = "test@example.com";
  await authDatabase();
});
afterEach(() => { vi.unstubAllEnvs(); });
beforeEach(async () => {
  if (mongoose.connection.name !== "mmm_auth_test")
    throw new Error("Refusing to clear a non-test database.");
  for (const collection of Object.values(mongoose.connection.collections))
    await collection.deleteMany({});
  mail.messages = [];
  mail.fail = false;
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});

describe("authentication API and MongoDB integration", () => {
  it("creates a normalized account and a hashed server-side session, with a private cookie", async () => {
    const { response, token, cookie } = await signup();
    const data = await response.json();
    expect(data.data.user).toMatchObject({ name: "Priya Sharma", email });
    expect(data.data.hasWedding).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=lax");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const user = await User.findOne().select("+passwordHash").lean();
    expect(user?.emailNormalized).toBe("priya@example.com");
    expect(user?.passwordHash).not.toContain(password);
    expect(await verifyPassword(password, user?.passwordHash)).toBe(true);
    expect((await Session.findOne().lean())?.tokenHash).toBe(hashToken(token));
    const me = await meHandler(request("me", undefined, cookie));
    const payload = await me.json();
    expect(payload.data.membership).toBeNull();
    expect(payload.data.wedding).toBeNull();
    expect(JSON.stringify(payload)).not.toMatch(
      /passwordHash|tokenHash|authVersion/,
    );
  });
  it("rejects duplicate emails despite casing and whitespace differences", async () => {
    await signup();
    const response = await signupHandler(
      request("signup", {
        name: "Other",
        email: " PRIYA@example.com ",
        password,
      }),
    );
    expect(response.status).toBe(409);
    expect(await User.countDocuments()).toBe(1);
  });
  it("creates at most one account when signups race", async () => {
    const responses = await Promise.all(
      [1, 2].map(() =>
        signupHandler(request("signup", { name: "Priya", email, password })),
      ),
    );
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await User.countDocuments()).toBe(1);
    expect(await Session.countDocuments()).toBe(1);
  });
  it("returns identical errors for unknown accounts and incorrect passwords", async () => {
    await signup();
    const known = await loginHandler(
      request("login", { email, password: "wrong" }),
    );
    const unknown = await loginHandler(
      request("login", { email: "unknown@example.com", password: "wrong" }),
    );
    expect(known.status).toBe(401);
    expect(await known.json()).toEqual(await unknown.json());
  });
  it("logs in with a normalized email and revokes the session on logout", async () => {
    await signup();
    const login = await loginHandler(
      request("login", { email: "PRIYA@EXAMPLE.COM", password }),
    );
    expect(login.status).toBe(200);
    const cookie = `mmm_session=${login.cookies.get("mmm_session")!.value}`;
    expect(
      (await logoutHandler(request("logout", undefined, cookie))).status,
    ).toBe(200);
    expect((await meHandler(request("me", undefined, cookie))).status).toBe(
      401,
    );
  });
  it("rejects expired sessions before TTL cleanup and rejects forged cookies", async () => {
    const { token, cookie } = await signup();
    await Session.updateOne(
      { tokenHash: hashToken(token) },
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    expect((await meHandler(request("me", undefined, cookie))).status).toBe(
      401,
    );
    expect(
      (
        await meHandler(
          request("me", undefined, `mmm_session=${createToken()}`),
        )
      ).status,
    ).toBe(401);
    expect((await meHandler(request("me"))).status).toBe(401);
  });
  it("returns only the current user's membership and excludes deleted weddings", async () => {
    const { cookie } = await signup();
    const user = await User.findOne();
    const weddingId = new mongoose.Types.ObjectId();
    await mongoose.connection
      .collection("weddings")
      .insertOne({
        _id: weddingId,
        brideName: "Priya",
        groomName: "Ashu",
        weddingDate: "2027-12-17",
      });
    await mongoose.connection
      .collection("wedding_memberships")
      .insertOne({ userId: user!._id, weddingId, role: "ADMIN" });
    expect(
      (await (await meHandler(request("me", undefined, cookie))).json()).data
        .membership.role,
    ).toBe("ADMIN");
    await mongoose.connection
      .collection("weddings")
      .updateOne({ _id: weddingId }, { $set: { deletedAt: new Date() } });
    expect(
      (await (await meHandler(request("me", undefined, cookie))).json()).data
        .wedding,
    ).toBeNull();
  });
  it("does not reveal whether a reset email belongs to an account", async () => {
    await signup();
    const known = await forgotPasswordHandler(
      request("forgot-password", { email }),
    );
    const unknown = await forgotPasswordHandler(
      request("forgot-password", { email: "unknown@example.com" }),
    );
    expect(known.status).toBe(200);
    expect(await known.json()).toEqual(await unknown.json());
    expect(mail.messages).toHaveLength(1);
    expect((await PasswordReset.findOne().lean())?.tokenHash).toBe(
      hashToken(mail.messages[0].token),
    );
  });
  it("resets once, revokes all sessions and older reset links, and accepts only the new password", async () => {
    const { cookie } = await signup();
    await forgotPasswordHandler(request("forgot-password", { email }));
    await forgotPasswordHandler(request("forgot-password", { email }));
    const token = mail.messages[0].token;
    const nextPassword = "My new memorable password";
    expect(
      (
        await resetPasswordHandler(
          request("reset-password", { token, password: nextPassword }),
        )
      ).status,
    ).toBe(200);
    expect((await meHandler(request("me", undefined, cookie))).status).toBe(
      401,
    );
    expect(
      (
        await resetPasswordHandler(
          request("reset-password", { token, password: nextPassword }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await resetPasswordHandler(
          request("reset-password", {
            token: mail.messages[1].token,
            password: nextPassword,
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await loginHandler(request("login", { email, password }))).status,
    ).toBe(401);
    expect(
      (await loginHandler(request("login", { email, password: nextPassword })))
        .status,
    ).toBe(200);
  });
  it("allows only one concurrent reset to consume a token", async () => {
    await signup();
    await forgotPasswordHandler(request("forgot-password", { email }));
    const token = mail.messages[0].token;
    const results = await Promise.all(
      ["first new password", "second new password"].map((password) =>
        resetPasswordHandler(request("reset-password", { token, password })),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
  });
  it("rejects a session created from pre-reset credentials even after reset commits", async () => {
    await signup();
    const oldUser = await User.findOne().lean();
    await forgotPasswordHandler(request("forgot-password", { email }));
    await resetPasswordHandler(
      request("reset-password", {
        token: mail.messages[0].token,
        password: "a completely new password",
      }),
    );
    const staleToken = createToken();
    await createSession(
      oldUser!._id,
      oldUser!.authVersion,
      hashToken(staleToken),
      new Date(Date.now() + 60_000),
    );
    expect(await currentUser(staleToken)).toBeNull();
  });
  it("rejects expired reset tokens without changing credentials", async () => {
    await signup();
    await forgotPasswordHandler(request("forgot-password", { email }));
    await PasswordReset.updateMany(
      {},
      { $set: { expiresAt: new Date(Date.now() - 1000) } },
    );
    expect(
      (
        await resetPasswordHandler(
          request("reset-password", {
            token: mail.messages[0].token,
            password: "new password is longer",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await loginHandler(request("login", { email, password }))).status,
    ).toBe(200);
  });
  it("keeps email provider failures generic and discards unusable reset tokens", async () => {
    await signup();
    mail.fail = true;
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await forgotPasswordHandler(
      request("forgot-password", { email }),
    );
    expect(await response.json()).toEqual({ success: true });
    expect(await PasswordReset.countDocuments()).toBe(0);
    expect(log).toHaveBeenCalledWith("auth.reset_email_delivery_failed");
    log.mockRestore();
  });
  it("rejects foreign and missing origins before processing mutations", async () => {
    expect(
      (
        await signupHandler(
          request(
            "signup",
            { name: "Priya", email, password },
            undefined,
            "https://attacker.example",
          ),
        )
      ).status,
    ).toBe(403);
    const noOrigin = request("login", { email, password });
    noOrigin.headers.delete("origin");
    expect((await loginHandler(noOrigin)).status).toBe(403);
    expect(await User.countDocuments()).toBe(0);
  });
  it("validates passwords, extra fields, malformed JSON and request size", async () => {
    expect(
      (
        await signupHandler(
          request("signup", {
            name: "P",
            email,
            password: "short",
            role: "ADMIN",
          }),
        )
      ).status,
    ).toBe(400);
    const malformed = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      },
      body: "{",
    });
    expect((await signupHandler(malformed)).status).toBe(400);
    expect(
      (await signupHandler(request("signup", { name: "x".repeat(9000) })))
        .status,
    ).toBe(413);
    const html = request("signup", {});
    html.headers.set("content-type", "text/plain");
    expect((await signupHandler(html)).status).toBe(415);
  });
  it("enforces shared atomic rate limits under concurrent requests", async () => {
    const outcomes = await Promise.allSettled(
      Array.from({ length: 8 }, () => consumeLimit("race-test", 3)),
    );
    expect(outcomes.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    const failures = outcomes.filter((r) => r.status === "rejected");
    expect(failures.every((r) => r.reason.code === "RATE_LIMITED")).toBe(true);
  });
  it("uses Secure cookies in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const response = NextResponse.json({});
      setSessionCookie(response, createToken());
      expect(response.headers.get("set-cookie")).toContain("Secure");
    } finally {
      vi.unstubAllEnvs();
    }
  });
  it("keeps different Vercel clients independent while limiting the same IP across emails", async () => {
    vi.stubEnv("VERCEL", "1");
    const first = request("login", { email, password });
    first.headers.set("x-vercel-forwarded-for", "192.0.2.10");
    for (let i = 0; i < 30; i++) await limitAuthRequest(first, "login");
    const sameIp = request("login", { email: "other@example.com", password });
    sameIp.headers.set("x-vercel-forwarded-for", "192.0.2.10");
    sameIp.headers.set("x-forwarded-for", "192.0.2.99");
    await expect(limitAuthRequest(sameIp, "login")).rejects.toMatchObject({ status: 429 });
    sameIp.headers.set("x-vercel-forwarded-for", "192.0.2.11");
    await expect(limitAuthRequest(sameIp, "login")).resolves.toBeUndefined();
  });
  it("does not pool local users but retains normalized email limits", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "development");
    for (let i = 0; i < 31; i++) {
      const local = request("login", { email: `person${i}@example.com`, password });
      local.headers.set("x-vercel-forwarded-for", "192.0.2.10");
      await limitAuthRequest(local, "login");
    }
    expect(await mongoose.connection.collection("auth_rate_limits").countDocuments()).toBe(0);
    for (let i = 0; i < 3; i++) {
      expect((await forgotPasswordHandler(request("forgot-password", { email: "unknown@example.com" }))).status).toBe(200);
    }
    const blocked = await forgotPasswordHandler(request("forgot-password", { email: "UNKNOWN@example.com" }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("900");
    expect((await forgotPasswordHandler(request("forgot-password", { email: "another@example.com" }))).status).toBe(200);
  });
  it("rejects unsupported production hosting and missing or malformed trusted addresses", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    const incoming = request("login", { email, password });
    incoming.headers.set("x-forwarded-for", "192.0.2.10");
    incoming.headers.set("x-vercel-forwarded-for", "192.0.2.10");
    await expect(limitAuthRequest(incoming, "login")).rejects.toMatchObject({ status: 503 });
    vi.stubEnv("VERCEL", "1");
    for (const value of ["", "not-an-ip", "192.0.2.10, 192.0.2.11"]) {
      incoming.headers.set("x-vercel-forwarded-for", value);
      await expect(limitAuthRequest(incoming, "login")).rejects.toMatchObject({ status: 503 });
    }
    expect(await mongoose.connection.collection("auth_rate_limits").countDocuments()).toBe(0);
  });
  it("canonicalizes IPv6 addresses into the same rate-limit bucket", async () => {
    vi.stubEnv("VERCEL", "1");
    const incoming = request("forgot-password", { email });
    incoming.headers.set("x-vercel-forwarded-for", "2001:db8::1");
    for (let i = 0; i < 10; i++) await limitAuthRequest(incoming, "forgot-password");
    incoming.headers.set("x-vercel-forwarded-for", "2001:0db8:0000:0000:0000:0000:0000:0001");
    await expect(limitAuthRequest(incoming, "forgot-password")).rejects.toMatchObject({ status: 429 });
  });
});
