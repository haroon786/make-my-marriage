import { AuthForm } from "@/modules/auth/components/auth-form";
import { redirectSignedInUser } from "@/server/auth/redirect";
import { invitationReturnPath } from "@/modules/members/schemas";
export const metadata = { title: "Log in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = invitationReturnPath((await searchParams).next);
  await redirectSignedInUser(next);
  return <AuthForm mode="login" next={next} />;
}
