import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Tradingle editorial and business teams.",
  alternates: { canonical: absoluteUrl("/contact") },
};

export default function ContactPage() {
  return (
    <main className="trd-container static-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
      <div className="prose prose-lg">
        <p>
          <strong>Editorial:</strong>{" "}
          <a href="mailto:editorial@tradingle.com">editorial@tradingle.com</a>
        </p>
        <p>
          <strong>Business & Advertising:</strong>{" "}
          <a href="mailto:ads@tradingle.com">ads@tradingle.com</a>
        </p>
        <p>
          <strong>General inquiries:</strong>{" "}
          <a href="mailto:hello@tradingle.com">hello@tradingle.com</a>
        </p>
      </div>
    </main>
  );
}
