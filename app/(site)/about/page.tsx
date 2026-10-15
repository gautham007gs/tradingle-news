import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Tradingle — independent journalism covering India and the world.",
  alternates: { canonical: absoluteUrl("/about") },
};

export default function AboutPage() {
  return (
    <main className="trd-container static-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">About Tradingle</h1>
      <div className="prose prose-lg">
        <p>
          Tradingle is an independent digital news platform delivering breaking
          news, in-depth analysis, and original reporting across politics,
          business, technology, sports, entertainment, and more.
        </p>
        <p>
          Our journalists are committed to accuracy, transparency, and
          accountability. We follow a strict editorial policy and corrections
          process to ensure readers can trust what we publish.
        </p>
        <p>
          For editorial inquiries, visit our{" "}
          <a href="/contact">contact page</a>. For advertising, see{" "}
          <a href="/advertise">advertise with us</a>.
        </p>
      </div>
    </main>
  );
}
