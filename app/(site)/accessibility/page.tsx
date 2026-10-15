import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { accessibilitySections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Accessibility Statement",
  description:
    "How Tradingle works to meet WCAG 2.2 AA, what we have built in, the limitations we know about, and how to report an accessibility barrier.",
  alternates: { canonical: absoluteUrl("/accessibility") },
  openGraph: {
    title: "Accessibility Statement | Tradingle",
    description: "Our commitment, the standard we work to, and how to report a barrier.",
    url: absoluteUrl("/accessibility"),
    type: "website",
    siteName: "Tradingle",
  },
};

export default function AccessibilityPage() {
  return (
    <StaticLegalPage
      kicker="Readers"
      title="Accessibility Statement"
      intro="Journalism is only useful if you can read it. This page sets out the standard Tradingle works to, what we have already built in, where we still fall short, and how to tell us when something blocks you."
      sections={accessibilitySections}
      contactLabel="To report an accessibility barrier, email"
      contactEmail="accessibility@tradingle.com"
    />
  );
}
