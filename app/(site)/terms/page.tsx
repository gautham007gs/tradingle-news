import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { termsSections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms and conditions for using Tradingle.com.",
  alternates: { canonical: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <StaticLegalPage
      title="Terms of Use"
      effectiveDate="Effective: March 1, 2026"
      intro="Welcome to Tradingle. These Terms of Use govern your access to and use of www.tradingle.com and all associated services. Please read them carefully."
      sections={termsSections}
      contactLabel="For questions about these terms, contact us at"
      contactEmail="legal@tradingle.com"
    />
  );
}
