import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Editorial Policy",
  description: "Tradingle editorial standards, sourcing practices, and independence principles.",
  alternates: { canonical: absoluteUrl("/editorial-policy") },
};

export default function EditorialPolicyPage() {
  return (
    <main className="trd-container static-page py-10 max-w-3xl">
      <p className="trd-category-tag inline-block mb-3">Standards</p>
      <h1 className="text-3xl sm:text-4xl font-bold mb-4">Editorial Policy</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Tradingle is committed to accurate, fair, and independent journalism. These principles guide every story we publish.
      </p>
      <div className="space-y-6 prose prose-neutral dark:prose-invert max-w-none">
        <section>
          <h2 className="text-xl font-semibold mb-2">Accuracy & Verification</h2>
          <p className="text-muted-foreground leading-relaxed">
            We verify facts before publication, attribute claims to named sources, and distinguish reporting from analysis and opinion.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Independence</h2>
          <p className="text-muted-foreground leading-relaxed">
            Our newsroom operates independently of advertisers and commercial partners. Sponsored content is always clearly labelled.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Corrections & Updates</h2>
          <p className="text-muted-foreground leading-relaxed">
            Material errors are corrected promptly. See our{" "}
            <Link href="/corrections-policy" className="text-primary font-medium hover:underline">Corrections Policy</Link>{" "}
            for how updates are handled.
          </p>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-2">Contact the Newsroom</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tips, feedback, and editorial inquiries:{" "}
            <Link href="/contact" className="text-primary font-medium hover:underline">Contact / Tip Us</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
