import { AuthForm } from "@/modules/auth/components/auth-form";
import { redirectSignedInUser } from "@/server/auth/redirect";
export const metadata = { title: "Create your account" };
export default async function SignupPage() {
  await redirectSignedInUser();
  return <AuthForm mode="signup" />;
}
