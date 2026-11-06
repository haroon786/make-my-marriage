// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberManagement } from "@/modules/members/components/member-management";
import { InvitationResponse } from "@/modules/members/components/invitation-response";
import { invitationReturnPath } from "@/modules/members/schemas";

const token = "a".repeat(43);
const members = [{ membershipId: "owner", user: { id: "owner", name: "Owner", email: "owner@example.com" }, role: "ADMIN", joinedAt: "2026-01-01" }];
const invitation = { email: "manager@example.com", role: "MANAGER", wedding: { brideName: "Priya", groomName: "Arjun", weddingDate: "2027-05-09" }, expiresAt: "2027-01-01" };
let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
const response = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => status < 400 ? { data } : { error: { message: data } } });
function button(text: string) {
  const node = Array.from(container.querySelectorAll("button")).find(node => node.textContent === text);
  if (!node) throw new Error(`Missing button ${text}`);
  return node;
}
async function click(text: string) { await act(async () => button(text).click()); }
async function management(admin = true) { await act(async () => root.render(createElement(MemberManagement, { weddingId: "wedding", userId: "owner", admin, initialMembers: members, initialInvitations: [] }))); }
async function submit() { await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))); }
async function fill(value: string) {
  await act(async () => {
    const input = container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  // jsdom does not implement native dialog presentation; browser QA covers focus trapping.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
  fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("member interactions", () => {
  it("validates before sending and protects the creator", async () => {
    await management(); expect(container.textContent).toContain("Protected");
    expect(container.textContent).not.toContain("Remove from wedding");
    await click("+ Invite member"); await fill("invalid"); await submit();
    expect(fetchMock).not.toHaveBeenCalled(); expect(container.querySelector('[role="alert"]')?.textContent).toContain("valid email");
  });
  it("prevents duplicate sends and explains failed email delivery", async () => {
    await management(); await click("+ Invite member"); await fill("Manager@Example.com");
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(response(members)).mockResolvedValueOnce(response([]));
    await submit(); await submit(); expect(fetchMock).toHaveBeenCalledTimes(1); expect(button("Sending…").disabled).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "manager@example.com", role: "MANAGER" });
    expect(fetchMock.mock.calls[0][1].headers["X-Wedding-Id"]).toBe("wedding");
    await act(async () => finish(response({ deliveryStatus: "FAILED" })));
    expect(container.querySelector("dialog")).toBeNull(); expect(container.querySelector('[role="status"]')?.textContent).toContain("email sending failed");
  });
  it("preserves the email after a failed request for retry", async () => {
    await management(); await click("+ Invite member"); await fill("manager@example.com");
    fetchMock.mockRejectedValueOnce(new TypeError("offline")); await submit();
    expect(container.querySelector("input")?.value).toBe("manager@example.com");
    expect(button("Send invitation").disabled).toBe(false); expect(container.textContent).toContain("Refresh the list before retrying");
  });
  it("shows Managers a read-only member list", async () => {
    await management(false); expect(container.textContent).toContain("Manager access");
    expect(container.textContent).not.toContain("Invite member"); expect(container.textContent).not.toContain("Pending invitations");
  });
});
describe("invitation recipient", () => {
  it("preserves a safe invitation return path for login and signup", async () => {
    fetchMock.mockResolvedValueOnce(response(invitation)).mockResolvedValueOnce(response("Sign in", 401));
    await act(async () => root.render(createElement(InvitationResponse, { token })));
    expect(container.querySelector('a[href^="/login?"]')?.getAttribute("href")).toBe(`/login?next=${encodeURIComponent(`/member-invitations/${token}`)}`);
    for (const unsafe of ["https://evil.example", "//evil.example", "/app", `/member-invitations/${token}?next=evil`]) expect(invitationReturnPath(unsafe)).toBeUndefined();
    expect(invitationReturnPath(`/member-invitations/${token}`)).toBe(`/member-invitations/${token}`);
  });
  it("requires switching accounts for an email mismatch", async () => {
    fetchMock.mockResolvedValueOnce(response(invitation)).mockResolvedValueOnce(response({ user: { email: "other@example.com" }, wedding: null }));
    await act(async () => root.render(createElement(InvitationResponse, { token })));
    expect(container.textContent).toContain("different email"); expect(container.textContent).not.toContain("Accept invitation");
  });
  it("retries an unavailable service and accepts once", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline")).mockResolvedValueOnce(response("Sign in", 401));
    await act(async () => root.render(createElement(InvitationResponse, { token })));
    fetchMock.mockResolvedValueOnce(response(invitation)).mockResolvedValueOnce(response({ user: { email: invitation.email }, wedding: null }));
    await click("Try again");
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    await click("Accept invitation"); expect(button("Updating…").disabled).toBe(true);
    await act(async () => finish(response({ accepted: true })));
    expect(container.textContent).toContain("You joined as a Manager"); expect(container.querySelector('a[href="/app"]')).not.toBeNull();
  });
});
