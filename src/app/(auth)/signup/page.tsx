import { AuthForm } from "@/modules/auth/components/auth-form";
import { redirectSignedInUser } from "@/server/auth/redirect";
import { invitationReturnPath } from "@/modules/members/schemas";
export const metadata = { title: "Create your account" };
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = invitationReturnPath((await searchParams).next);
  await redirectSignedInUser(next);
  return <AuthForm mode="signup" next={next} />;
}
