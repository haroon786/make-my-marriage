import { AuthForm } from "@/modules/auth/components/auth-form";
export const metadata = { title: "Forgot password" };
export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot-password" />;
}
