import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const state = vi.hoisted(() => ({ context: null as unknown }));
vi.mock("@/modules/auth/service", () => ({ getCurrentContext: async () => state.context, SESSION_SECONDS: 604800 }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "test-session" }) }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
import OnboardingPage from "@/app/(onboarding)/onboarding/page";
import ReadyPage from "@/app/(onboarding)/onboarding/ready/page";
import DashboardPage from "@/app/(dashboard)/app/page";
import EditWeddingPage from "@/app/(dashboard)/app/wedding/edit/page";
import { redirectSignedInUser } from "@/server/auth/redirect";
const user = { id: "user", name: "Priya", email: "priya@example.com" };
const wedding = { id: "wedding", brideName: "Priya", groomName: "Arjun", weddingDate: "2027-02-14", timeZone: "Asia/Kolkata", title: "", description: "", location: { formattedAddress: "Pune" }, website: { slug: "our-wedding", isPublished: false } };
beforeEach(() => { state.context = null; });
describe("protected onboarding journey", () => {
  it.each([OnboardingPage, ReadyPage, DashboardPage, EditWeddingPage])("sends signed-out visitors to login", async page => {
    await expect(page()).rejects.toThrow("redirect:/login");
  });
  it("shows an empty setup form to a new account, with required location", async () => {
    state.context = { user, wedding: null, membership: null };
    const html = renderToStaticMarkup(await OnboardingPage());
    expect(html).toContain("Your wedding starts here");
    expect(html).toMatch(/name="location.formattedAddress"[^>]*required=""|required=""[^>]*name="location.formattedAddress"/);
    expect(html).toContain("Asia/Kolkata");
  });
  it("prevents opening success or dashboard before a wedding exists", async () => {
    state.context = { user, wedding: null, membership: null };
    await expect(ReadyPage()).rejects.toThrow("redirect:/onboarding");
    await expect(DashboardPage()).rejects.toThrow("redirect:/onboarding");
    await expect(EditWeddingPage()).rejects.toThrow("redirect:/onboarding");
    await expect(redirectSignedInUser()).rejects.toThrow("redirect:/onboarding");
  });
  it("sends existing members straight to the dashboard", async () => {
    state.context = { user, wedding, membership: { role: "ADMIN" } };
    await expect(OnboardingPage()).rejects.toThrow("redirect:/app");
    await expect(redirectSignedInUser()).rejects.toThrow("redirect:/app");
  });
  it("renders persisted details on the ready screen and dashboard", async () => {
    state.context = { user, wedding, membership: { role: "ADMIN" } };
    const ready = renderToStaticMarkup(await ReadyPage());
    expect(ready).toContain("Your wedding workspace is ready");
    expect(ready).toContain("14 February 2027");
    expect(ready).toContain("Pune");
    expect(ready).toContain('href="/app"');
    expect(ready).toContain("Admin");
    expect(renderToStaticMarkup(await DashboardPage())).toContain("Pune");
  });
  it("prefills the shared edit form for Managers", async () => {
    state.context = { user, wedding, membership: { role: "MANAGER" } };
    const html = renderToStaticMarkup(await EditWeddingPage());
    expect(html).toContain("Edit wedding details");
    expect(html).toContain('value="Pune"');
    expect(html).toContain('value="Priya"');
    expect(html).toContain('value="2027-02-14"');
    expect(html).toContain("Save changes");
    expect(html).toContain("No unsaved changes");
  });
});
