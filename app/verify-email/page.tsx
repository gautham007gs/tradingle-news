import type { Metadata } from "next";
import { use } from "react";
import { absoluteUrl } from "../../lib/site";
import VerifyEmailForm from "../../src/components/account/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verify Email – Tradingle",
  alternates: { canonical: absoluteUrl("/verify-email") },
  robots: { index: false },
};

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = use(searchParams);
  const token = params.token ?? "";

  return (
    <main className="trd-container py-20 text-center">
      <h1 className="text-2xl font-bold mb-6">Verify your email</h1>
      {token ? (
        <VerifyEmailForm token={token} />
      ) : (
        <p className="text-muted-foreground">
          Your verification link is missing. Check the email we sent you, or use
          the sign-in flow to resend it.
        </p>
      )}
    </main>
  );
}
