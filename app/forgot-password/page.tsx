import type { Metadata } from "next";
import { absoluteUrl } from "../../lib/site";
import ForgotPasswordForm from "../../src/components/account/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password – Tradingle",
  alternates: { canonical: absoluteUrl("/forgot-password") },
  robots: { index: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="trd-container py-20 text-center">
      <h1 className="text-2xl font-bold mb-2">Reset your password</h1>
      <p className="text-muted-foreground mb-8">
        Enter the email address you signed up with and we will send you a reset
        link.
      </p>
      <ForgotPasswordForm />
    </main>
  );
}
