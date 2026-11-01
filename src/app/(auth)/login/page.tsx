import { AuthForm } from "@/modules/auth/components/auth-form";
import { redirectSignedInUser } from "@/server/auth/redirect";
export const metadata = { title: "Log in" };
export default async function LoginPage() {
  await redirectSignedInUser();
  return <AuthForm mode="login" />;
}
