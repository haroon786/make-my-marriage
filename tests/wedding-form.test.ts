// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingForm } from "@/modules/wedding/components/onboarding-form";

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
const initialValues = { brideName: "Priya", groomName: "Arjun", weddingDate: "2027-03-14", timeZone: "Asia/Kolkata", location: { formattedAddress: "Chennai" }, title: "", description: "" };
let container: HTMLDivElement;
let root: Root;
let fetchMock: ReturnType<typeof vi.fn>;
function button(text: string) {
  const match = Array.from(container.querySelectorAll("button")).find(node => node.textContent === text);
  if (!match) throw new Error(`Missing button: ${text}`);
  return match;
}
async function fill(id: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`[id="${id}"]`)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () => { container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 0; });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  navigation.push.mockReset(); navigation.refresh.mockReset();
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(OnboardingForm, { mode: "edit", weddingId: "wedding-a", initialValues })); });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("wedding edit interactions", () => {
  it("normalizes whitespace-only edits without sending an empty PATCH", async () => {
    await fill("brideName", " Priya "); await submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLInputElement>("#brideName")!.value).toBe("Priya");
    expect(button("Save changes").disabled).toBe(true);
    expect(container.textContent).toContain("No unsaved changes");
  });
  it("shows saving, prevents duplicates, then confirms success beside the button", async () => {
    let finish!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    await fill("title", "Our celebration"); await submit(); await submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button("Saving…").disabled).toBe(true);
    expect(container.querySelector("fieldset")!.disabled).toBe(true);
    const options = fetchMock.mock.calls[0][1];
    expect(JSON.parse(options.body)).toEqual({ title: "Our celebration" });
    expect(options.headers["X-Wedding-Id"]).toBe("wedding-a");
    await act(async () => { finish({ ok: true, json: async () => ({ data: initialValues }) }); });
    expect(container.querySelector('[role="status"]')!.textContent).toBe("Wedding details saved successfully.");
    expect(button("Saved").className).not.toContain("cursor-wait");
    expect(button("Saved").disabled).toBe(true);
    await act(async () => button("Back to dashboard").click());
    expect(navigation.push).toHaveBeenCalledWith("/app");
    expect(navigation.refresh).toHaveBeenCalled();
  });
  it("retains failed edits and permits a successful retry", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await fill("title", "Keep my draft"); await submit();
    expect(container.querySelector<HTMLInputElement>("#title")!.value).toBe("Keep my draft");
    expect(container.querySelector('[role="alert"]')!.textContent).toContain("Your edits are still here");
    expect(button("Try again — Save changes").disabled).toBe(false);
    await submit(); expect(button("Saved").disabled).toBe(true);
  });
  it("retains the draft during session expiry and offers login in another tab", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: { message: "Please log in to continue." } }) }).mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await fill("title", "Recover this draft"); await submit();
    const login = container.querySelector<HTMLAnchorElement>('a[href="/login"]')!;
    expect(login.target).toBe("_blank");
    expect(container.querySelector<HTMLInputElement>("#title")!.value).toBe("Recover this draft");
    await submit(); expect(button("Saved").disabled).toBe(true);
  });
  it("validates location without a request and focuses the invalid field", async () => {
    await fill("location.formattedAddress", ""); await submit();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("location.formattedAddress");
    expect(container.textContent).toContain("Enter the wedding city or venue address.");
  });
  it("keeps the draft when discard is cancelled and navigates only after acceptance", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await fill("title", "Unsaved draft");
    const unload = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(unload);
    expect(unload.defaultPrevented).toBe(true);
    await act(async () => button("Cancel / Back to dashboard").click());
    expect(navigation.push).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLInputElement>("#title")!.value).toBe("Unsaved draft");
    await act(async () => button("Cancel / Back to dashboard").click());
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(navigation.push).toHaveBeenCalledWith("/app");
    const accepted = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(accepted);
    expect(accepted.defaultPrevented).toBe(false);
  });
});
