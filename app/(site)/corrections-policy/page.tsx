import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { correctionsSections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Corrections Policy",
  description: "How Tradingle corrects errors, updates articles, and handles reader feedback.",
  alternates: { canonical: absoluteUrl("/corrections-policy") },
};

export default function CorrectionsPolicyPage() {
  return (
    <StaticLegalPage
      kicker="Accountability"
      title="Corrections Policy"
      intro="When we make a material error, we correct it clearly and quickly. Readers should be able to understand what changed and why."
      sections={correctionsSections}
      contactLabel="To request a correction, visit our"
      contactHref="/contact"
    />
  );
}
