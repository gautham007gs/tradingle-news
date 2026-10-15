import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { cookieSections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Tradingle uses cookies and how you can manage your preferences.",
  alternates: { canonical: absoluteUrl("/cookies") },
};

export default function CookiesPage() {
  return (
    <StaticLegalPage
      kicker="Privacy"
      title="Cookie Settings"
      intro="Tradingle uses cookies to deliver core functionality, measure performance, and serve relevant advertising. You can manage non-essential cookies through our banner or browser settings."
      sections={cookieSections}
    >
      <p className="static-page-inline-note">
        See our{" "}
        <Link href="/privacy" className="static-page-link">
          Privacy Policy
        </Link>{" "}
        for full details on data use.
      </p>
    </StaticLegalPage>
  );
}
