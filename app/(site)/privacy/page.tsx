import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { privacySections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read Tradingle's privacy policy — how we collect, use, and protect your data.",
  alternates: { canonical: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <StaticLegalPage
      title="Privacy Policy"
      effectiveDate="Last updated: March 1, 2026"
      intro='At Tradingle ("we", "our", "us"), your privacy matters. This policy explains how we collect, use, and protect your information when you visit www.tradingle.com and use our services.'
      sections={privacySections}
      contactLabel="Questions about this policy? Contact our Data Protection Officer at"
      contactEmail="privacy@tradingle.com"
    />
  );
}
