import { afterEach, describe, expect, it, vi } from "vitest";
import { getAppOrigin, getDatabaseEnvironment, getEmailEnvironment } from "@/server/config/env";
import { sendPasswordReset } from "@/server/email/password-reset";
import { assertSameOrigin } from "@/server/security/requests";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("configuration and email boundary", () => {
  it("returns a safe 503 when MongoDB is not configured", () => {
    vi.stubEnv("MONGODB_URI", "");
    expect(getDatabaseEnvironment).toThrow(expect.objectContaining({ code: "SERVICE_UNAVAILABLE", status: 503 }));
  });
  it("requires email credentials and an HTTPS production origin", () => {
    vi.stubEnv("RESEND_API_KEY", ""); vi.stubEnv("EMAIL_FROM", "");
    expect(getEmailEnvironment).toThrow(expect.objectContaining({ status: 503 }));
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(getAppOrigin).toThrow(expect.objectContaining({ status: 503 }));
  });
  it("ignores attacker-controlled Host headers and allows only configured origins", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APP_URL", "https://weddings.example");
    expect(() => assertSameOrigin(new Request("https://weddings.example/api/auth/login", { headers: { origin: "https://attacker.example", host: "attacker.example" } }))).toThrow(expect.objectContaining({ status: 403 }));
  });
  it("sends the reset link only to Resend with a trusted base URL and bounded timeout", async () => {
    vi.stubEnv("APP_URL", "https://weddings.example"); vi.stubEnv("RESEND_API_KEY", "test-key"); vi.stubEnv("EMAIL_FROM", "Accounts <accounts@example.com>");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"id":"test"}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await sendPasswordReset("guest@example.com", "a".repeat(43));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(options.headers.Authorization).toBe("Bearer test-key");
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(options.body);
    expect(body.to).toEqual(["guest@example.com"]);
    expect(body.text).toContain(`https://weddings.example/reset-password?token=${"a".repeat(43)}`);
    expect(body.text).toContain("30 minutes");
  });
});
