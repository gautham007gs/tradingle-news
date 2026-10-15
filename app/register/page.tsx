import type { Metadata } from "next";
import { absoluteUrl } from "../../lib/site";
import AutoOpenAuthModal from "../../src/components/auth/AutoOpenAuthModal";

export const metadata: Metadata = {
  title: "Create Account – Tradingle",
  alternates: { canonical: absoluteUrl("/register") },
  robots: { index: false },
};

export default function RegisterPage() {
  return (
    <main className="trd-container py-20 text-center">
      <AutoOpenAuthModal />
      <h1 className="text-2xl font-bold mb-4">Create Account</h1>
      <p className="text-muted-foreground">
        <a href="/" className="text-primary underline">
          Return to homepage
        </a>{" "}
        and use the sign-up option in the navigation.
      </p>
    </main>
  );
}
