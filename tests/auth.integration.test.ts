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
import { createWeddingHandler, getWeddingHandler } from "@/modules/wedding/handlers";
import { Wedding } from "@/modules/wedding/models";
import { WeddingMembership } from "@/modules/members/models";
import { weddingDatabase } from "@/modules/wedding/repository";
import { memberDatabase } from "@/modules/members/invitations";
import { MemberInvitation } from "@/modules/members/invitation-model";
import { membersHandler, invitationHandler } from "@/modules/members/handlers";

const invitationMail = vi.hoisted(() => ({ messages: [] as { email: string; token: string }[], fail: false }));
vi.mock("@/server/email/member-invitation", () => ({ sendMemberInvitation: async (email: string, token: string) => { invitationMail.messages.push({ email, token }); if (invitationMail.fail) throw new Error("provider secret"); } }));

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
    instanceOpts: [{ launchTimeout: 60000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = mongo.getUri("mmm_auth_test");
  process.env.APP_URL = "http://localhost:3000";
  process.env.RESEND_API_KEY = "test-only-never-sent";
  process.env.EMAIL_FROM = "test@example.com";
  await authDatabase();
  await weddingDatabase();
  await memberDatabase();
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
beforeEach(async () => {
  invitationMail.messages = []; invitationMail.fail = false;
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

const weddingInput = {
  brideName: "Priya", groomName: "Arjun", weddingDate: "2027-02-14",
  timeZone: "Asia/Kolkata", location: { formattedAddress: "Pune, India" },
  title: "Our wedding", description: "Together with our families",
};
function weddingRequest(cookie?: string, body: unknown = weddingInput, method = "POST", origin = "http://localhost:3000") {
  return new NextRequest(`http://localhost:3000/api/${method === "POST" ? "weddings" : "wedding"}`, {
    method, headers: { origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}) },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
}
describe("wedding onboarding API and transactions", () => {
  it("saves a wedding and Admin membership, keeps it private, and redirects future logins", async () => {
    const { cookie } = await signup();
    const created = await createWeddingHandler(weddingRequest(cookie));
    expect(created.status).toBe(201);
    expect(created.headers.get("cache-control")).toBe("no-store");
    const { data } = await created.json();
    expect(data).toMatchObject({ ...weddingInput, website: { isPublished: false } });
    expect(JSON.stringify(data)).not.toMatch(/tokenHash|createdByUserId/);
    const saved = await Wedding.findById(data.id).select("+gallery.tokenHash").lean();
    expect(saved?.gallery?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(saved?.website?.slug).toContain("priya-arjun-2027-02-14-");
    const membership = await WeddingMembership.findOne().lean();
    expect(membership?.role).toBe("ADMIN");
    expect(String(membership?.weddingId)).toBe(data.id);
    expect(String(saved?.createdByUserId)).toBe(String(membership?.userId));
    const login = await loginHandler(request("login", { email, password }));
    expect((await login.json()).data.hasWedding).toBe(true);
    const current = await getWeddingHandler(weddingRequest(cookie, undefined, "GET"));
    expect((await current.json()).data.id).toBe(data.id);
  });
  it("rejects unauthenticated and cross-origin creation", async () => {
    expect((await createWeddingHandler(weddingRequest())).status).toBe(401);
    const { cookie } = await signup();
    expect((await createWeddingHandler(weddingRequest(cookie, weddingInput, "POST", "https://evil.example"))).status).toBe(403);
    expect(await Wedding.countDocuments()).toBe(0);
  });
  it("rejects expired sessions", async () => {
    const { cookie } = await signup();
    await Session.updateMany({}, { expiresAt: new Date(0) });
    expect((await createWeddingHandler(weddingRequest(cookie))).status).toBe(401);
  });
  it("validates required location at the API boundary without writing", async () => {
    const { cookie } = await signup();
    const response = await createWeddingHandler(weddingRequest(cookie, { ...weddingInput, location: { formattedAddress: " " } }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.details).toHaveProperty("location.formattedAddress");
    expect(await Wedding.countDocuments()).toBe(0);
  });
  it("protects ownership and publication from mass assignment", async () => {
    const { cookie } = await signup();
    const response = await createWeddingHandler(weddingRequest(cookie, { ...weddingInput, role: "MANAGER", createdByUserId: new mongoose.Types.ObjectId(), website: { isPublished: true } }));
    expect(response.status).toBe(400);
    expect(await Wedding.countDocuments()).toBe(0);
  });
  it("rolls back the wedding if membership persistence fails, and permits retry", async () => {
    const { cookie } = await signup();
    const failure = vi.spyOn(WeddingMembership, "create").mockRejectedValueOnce(new Error("private database detail"));
    const response = await createWeddingHandler(weddingRequest(cookie));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("private database detail");
    expect(await Wedding.countDocuments()).toBe(0);
    expect(await WeddingMembership.countDocuments()).toBe(0);
    failure.mockRestore();
    expect((await createWeddingHandler(weddingRequest(cookie))).status).toBe(201);
  });
  it("allows only one winner across concurrent submissions and recovers a lost response", async () => {
    const { cookie } = await signup();
    const responses = await Promise.all(Array.from({ length: 4 }, () => createWeddingHandler(weddingRequest(cookie))));
    expect(responses.map(response => response.status).sort()).toEqual([201, 409, 409, 409]);
    expect(await Wedding.countDocuments()).toBe(1);
    expect(await WeddingMembership.countDocuments()).toBe(1);
    const replay = await createWeddingHandler(weddingRequest(cookie));
    expect(replay.status).toBe(409);
    expect((await replay.json()).error.code).toBe("ALREADY_HAS_WEDDING");
    expect((await getWeddingHandler(weddingRequest(cookie, undefined, "GET"))).status).toBe(200);
  });
  it("does not let an existing Manager create another wedding", async () => {
    const { cookie } = await signup();
    await createWeddingHandler(weddingRequest(cookie));
    await WeddingMembership.updateMany({}, { role: "MANAGER" });
    expect((await createWeddingHandler(weddingRequest(cookie))).status).toBe(409);
    expect(await Wedding.countDocuments()).toBe(1);
  });
  it("isolates wedding reads by membership and hides deleted weddings", async () => {
    const first = await signup();
    const created = await createWeddingHandler(weddingRequest(first.cookie));
    const id = (await created.json()).data.id;
    const second = await signupHandler(request("signup", { name: "Other", email: "other@example.com", password }));
    const otherCookie = `mmm_session=${second.cookies.get("mmm_session")!.value}`;
    expect((await getWeddingHandler(weddingRequest(otherCookie, undefined, "GET"))).status).toBe(404);
    const own = await createWeddingHandler(weddingRequest(otherCookie));
    expect(own.status).toBe(201);
    expect((await own.json()).data.id).not.toBe(id);
    const attempt = new NextRequest(`http://localhost:3000/api/wedding?weddingId=${id}`, { headers: { cookie: otherCookie } });
    expect((await (await getWeddingHandler(attempt)).json()).data.id).not.toBe(id);
    await Wedding.updateOne({ _id: id }, { deletedAt: new Date() });
    expect((await getWeddingHandler(weddingRequest(first.cookie, undefined, "GET"))).status).toBe(404);
  });
});

describe("wedding member invitations", () => {
  const inviteeEmail = "manager@example.com";
  const memberRequest = (cookie: string, method = "GET", body?: unknown) => new NextRequest("http://localhost:3000/api/members", { method, headers: { origin: "http://localhost:3000", "Content-Type": "application/json", cookie }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  async function setup() {
    const admin = await signup();
    await createWeddingHandler(weddingRequest(admin.cookie));
    const recipient = await signupHandler(request("signup", { name: "Manager", email: inviteeEmail, password }));
    expect(recipient.status).toBe(201);
    return { admin: admin.cookie, recipient: `mmm_session=${recipient.cookies.get("mmm_session")!.value}` };
  }
  async function invite(cookie: string) {
    const response = await membersHandler(memberRequest(cookie, "POST", { email: " Manager@Example.com ", role: "MANAGER" }), "invite");
    expect(response.status).toBe(201);
    return (await response.json()).data;
  }
  it("normalizes invitations, hides secrets, and allows only one concurrent pending invitation", async () => {
    const { admin } = await setup();
    const responses = await Promise.all([1, 2].map(() => membersHandler(memberRequest(admin, "POST", { email: inviteeEmail }), "invite")));
    expect(responses.map(item => item.status).sort()).toEqual([201, 409]);
    expect(await MemberInvitation.countDocuments()).toBe(1);
    expect(invitationMail.messages).toHaveLength(1);
    const stored = await MemberInvitation.findOne().select("+tokenHash").lean();
    expect(stored?.tokenHash).toBe(hashToken(invitationMail.messages[0].token));
    const listing = await membersHandler(memberRequest(admin), "invitations");
    const json = await listing.text();
    expect(json).not.toContain("tokenHash");
    expect(json).not.toContain(invitationMail.messages[0].token);
  });
  it("atomically accepts once, supports safe replay, and enforces Manager permissions", async () => {
    const { admin, recipient } = await setup();
    await invite(admin);
    const token = invitationMail.messages[0].token;
    expect((await invitationHandler(memberRequest(""), token, "view")).status).toBe(200);
    expect((await invitationHandler(memberRequest(admin, "POST"), token, "accept")).status).toBe(403);
    const accepted = await Promise.all([1, 2].map(() => invitationHandler(memberRequest(recipient, "POST"), token, "accept")));
    expect(accepted.map(item => item.status)).toEqual([200, 200]);
    expect(await WeddingMembership.countDocuments()).toBe(2);
    expect((await MemberInvitation.findOne().lean())?.status).toBe("ACCEPTED");
    expect((await membersHandler(memberRequest(recipient), "members")).status).toBe(200);
    for (const action of ["invitations", "invite", "remove", "revoke", "resend"] as const)
      expect((await membersHandler(memberRequest(recipient, action === "invitations" ? "GET" : "POST", action === "invitations" ? undefined : { email: "other@example.com" }), action, new mongoose.Types.ObjectId().toString())).status).toBe(403);
    expect((await membersHandler(memberRequest(admin, "POST", { email: inviteeEmail }), "invite")).status).toBe(409);
  });
  it("rolls back acceptance if membership persistence fails", async () => {
    const { admin, recipient } = await setup(); await invite(admin);
    const token = invitationMail.messages[0].token;
    const failure = vi.spyOn(WeddingMembership, "create").mockRejectedValueOnce(new Error("private persistence error"));
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "accept")).status).toBe(500);
    failure.mockRestore();
    expect((await MemberInvitation.findOne().lean())?.status).toBe("PENDING");
    expect(await WeddingMembership.countDocuments()).toBe(1);
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "accept")).status).toBe(200);
  });
  it("keeps failed email sends retryable and rotates links with a send cooldown", async () => {
    const { admin, recipient } = await setup();
    invitationMail.fail = true;
    const created = await invite(admin);
    expect(created.deliveryStatus).toBe("FAILED");
    const oldToken = invitationMail.messages[0].token;
    expect((await membersHandler(memberRequest(admin, "POST"), "resend", created.id)).status).toBe(409);
    await MemberInvitation.updateMany({}, { sendAttemptAt: new Date(Date.now() - 61000) });
    invitationMail.fail = false;
    const resends = await Promise.all([1, 2].map(() => membersHandler(memberRequest(admin, "POST"), "resend", created.id)));
    expect(resends.map(item => item.status).sort()).toEqual([200, 409]);
    expect((await invitationHandler(memberRequest(recipient, "POST"), oldToken, "accept")).status).toBe(410);
    expect((await invitationHandler(memberRequest(recipient, "POST"), invitationMail.messages[1].token, "accept")).status).toBe(200);
  });
  it("declines without creating membership and permits a fresh invitation", async () => {
    const { admin, recipient } = await setup(); await invite(admin);
    const token = invitationMail.messages[0].token;
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "decline")).status).toBe(200);
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "accept")).status).toBe(410);
    expect(await WeddingMembership.countDocuments()).toBe(1);
    await invite(admin);
  });
  it("rejects expired, revoked and malformed links, and requires authentication and same origin", async () => {
    const { admin, recipient } = await setup(); const created = await invite(admin);
    const token = invitationMail.messages[0].token;
    expect((await invitationHandler(memberRequest("", "POST"), token, "accept")).status).toBe(401);
    const foreign = memberRequest(recipient, "POST"); foreign.headers.set("origin", "https://evil.example");
    expect((await invitationHandler(foreign, token, "accept")).status).toBe(403);
    await MemberInvitation.updateMany({}, { expiresAt: new Date(0) });
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "accept")).status).toBe(410);
    expect((await membersHandler(memberRequest(admin, "DELETE"), "revoke", created.id)).status).toBe(200);
    expect((await invitationHandler(memberRequest(""), token, "view")).status).toBe(410);
    expect((await invitationHandler(memberRequest(""), "bad", "view")).status).toBe(410);
  });
  it("prevents a second wedding and cross-wedding mutations, and protects the Admin", async () => {
    const { admin, recipient } = await setup(); const created = await invite(admin);
    const token = invitationMail.messages[0].token;
    await createWeddingHandler(weddingRequest(recipient));
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "accept")).status).toBe(409);
    expect((await membersHandler(memberRequest(recipient, "DELETE"), "revoke", created.id)).status).toBe(410);
    expect((await membersHandler(memberRequest(recipient, "POST"), "resend", created.id)).status).toBe(410);
    const original = await WeddingMembership.findOne().lean();
    expect((await membersHandler(memberRequest(recipient, "DELETE"), "remove", String(original!._id))).status).toBe(404);
    expect((await membersHandler(memberRequest(admin, "DELETE"), "remove", String(original!._id))).status).toBe(409);
    expect((await membersHandler(memberRequest(admin, "POST", { email: "another@example.com", role: "ADMIN" }), "invite")).status).toBe(400);
  });
  it("removes wedding access immediately without deleting the account", async () => {
    const { admin, recipient } = await setup(); await invite(admin);
    const token = invitationMail.messages[0].token;
    await invitationHandler(memberRequest(recipient, "POST"), token, "accept");
    const manager = await WeddingMembership.findOne({ role: "MANAGER" }).lean();
    expect((await membersHandler(memberRequest(admin, "DELETE"), "remove", String(manager!._id))).status).toBe(200);
    expect((await membersHandler(memberRequest(recipient), "members")).status).toBe(403);
    const me = await meHandler(request("me", undefined, recipient));
    expect(me.status).toBe(200); expect((await me.json()).data.membership).toBeNull();
    expect((await invitationHandler(memberRequest(recipient, "POST"), token, "accept")).status).toBe(410);
    expect(await User.countDocuments()).toBe(2);
  });
});

describe("wedding editing", () => {
  it("rejects expired sessions and permits retry after login without duplicate weddings", async () => {
    const { updateWeddingHandler } = await import("@/modules/wedding/handlers");
    const { cookie } = await signup();
    await createWeddingHandler(weddingRequest(cookie));
    const patch = (sessionCookie: string) => new NextRequest("http://localhost:3000/api/wedding", { method: "PATCH", headers: { origin: "http://localhost:3000", "Content-Type": "application/json", cookie: sessionCookie }, body: JSON.stringify({ title: "Recovered edit" }) });
    await Session.updateMany({}, { expiresAt: new Date(0) });
    expect((await updateWeddingHandler(patch(cookie))).status).toBe(401);
    expect((await Wedding.findOne().lean())?.title).not.toBe("Recovered edit");
    const login = await loginHandler(request("login", { email, password }));
    const renewedCookie = `mmm_session=${login.cookies.get("mmm_session")!.value}`;
    const failure = vi.spyOn(Wedding, "updateOne").mockRejectedValueOnce(new Error("private database failure"));
    const failed = await updateWeddingHandler(patch(renewedCookie));
    expect(failed.status).toBe(500);
    expect(await failed.text()).not.toContain("private database failure");
    failure.mockRestore();
    expect((await updateWeddingHandler(patch(renewedCookie))).status).toBe(200);
    expect((await updateWeddingHandler(patch(renewedCookie))).status).toBe(200);
    expect(await Wedding.countDocuments()).toBe(1);
    expect((await Wedding.findOne().lean())?.title).toBe("Recovered edit");
  });
  it("updates only allowed fields and preserves stable identifiers", async () => {
    const { updateWeddingHandler } = await import("@/modules/wedding/handlers");
    const { cookie } = await signup();
    await createWeddingHandler(weddingRequest(cookie));
    const before = await Wedding.findOne().select("+gallery.tokenHash").lean();
    const patch = (body: unknown, sessionCookie = cookie) => new NextRequest("http://localhost:3000/api/wedding", { method: "PATCH", headers: { origin: "http://localhost:3000", "Content-Type": "application/json", cookie: sessionCookie }, body: JSON.stringify(body) });
    await Wedding.updateOne({}, { title: "Keep this title", description: "Keep this description" });
    expect((await updateWeddingHandler(patch({ brideName: before!.brideName }))).status).toBe(200);
    const preserved = await Wedding.findOne().lean();
    expect(preserved?.title).toBe("Keep this title");
    expect(preserved?.description).toBe("Keep this description");
    expect((await updateWeddingHandler(patch({ location: { formattedAddress: "Mumbai" }, title: "", description: "" }))).status).toBe(200);
    const after = await Wedding.findOne().select("+gallery.tokenHash").lean();
    expect(after?.location?.formattedAddress).toBe("Mumbai");
    expect(after?.brideName).toBe(before?.brideName);
    expect(after?.title).toBe("");
    expect(after?.description).toBe("");
    expect(after?.website?.slug).toBe(before?.website?.slug);
    expect(after?.gallery?.tokenHash).toBe(before?.gallery?.tokenHash);
    expect((await updateWeddingHandler(patch({ website: { isPublished: true } }))).status).toBe(400);
    expect((await updateWeddingHandler(patch({ location: { formattedAddress: " " } }))).status).toBe(400);
    expect((await updateWeddingHandler(patch({}))).status).toBe(400);
    expect((await updateWeddingHandler(patch({ brideName: "Other" }, ""))).status).toBe(401);
    await WeddingMembership.updateMany({}, { role: "MANAGER" });
    expect((await updateWeddingHandler(patch({ groomName: "Updated" }))).status).toBe(200);
  });
  it("isolates updates and rejects stale-account forms and non-members", async () => {
    const { updateWeddingHandler } = await import("@/modules/wedding/handlers");
    const first = await signup();
    const created = await createWeddingHandler(weddingRequest(first.cookie));
    const id = (await created.json()).data.id;
    const second = await signupHandler(request("signup", { name: "Other", email: "other@example.com", password }));
    const cookie = `mmm_session=${second.cookies.get("mmm_session")!.value}`;
    const patch = () => new NextRequest(`http://localhost:3000/api/wedding?weddingId=${id}`, { method: "PATCH", headers: { origin: "http://localhost:3000", "Content-Type": "application/json", cookie }, body: JSON.stringify({ brideName: "Own wedding only" }) });
    expect((await updateWeddingHandler(patch())).status).toBe(403);
    await createWeddingHandler(weddingRequest(cookie));
    const stale = patch();
    stale.headers.set("X-Wedding-Id", id);
    expect((await updateWeddingHandler(stale)).status).toBe(403);
    expect((await updateWeddingHandler(patch())).status).toBe(200);
    expect((await Wedding.findById(id).lean())?.brideName).toBe(weddingInput.brideName);
    const foreign = patch();
    foreign.headers.set("origin", "https://example.org");
    expect((await updateWeddingHandler(foreign)).status).toBe(403);
  });
});
