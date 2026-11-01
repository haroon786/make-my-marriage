import { AuthForm } from "@/modules/auth/components/auth-form";
export const metadata = { title: "Reset password" };
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthForm
      mode="reset-password"
      token={typeof token === "string" ? token : ""}
    />
  );
}
