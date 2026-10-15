import type { Metadata } from "next";
import { use } from "react";
import { absoluteUrl } from "../../lib/site";
import ResetPasswordForm from "../../src/components/account/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password – Tradingle",
  alternates: { canonical: absoluteUrl("/reset-password") },
  robots: { index: false },
};

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? "";

  return (
    <main className="trd-container py-20 text-center">
      <h1 className="text-2xl font-bold mb-8">Choose a new password</h1>
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-muted-foreground">
          Your reset link is missing or has expired. Use the forgot-password
          flow to request a new one.
        </p>
      )}
    </main>
  );
}
