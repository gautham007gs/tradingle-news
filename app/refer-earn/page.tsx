import type { Metadata } from "next";
import { absoluteUrl } from "../../lib/site";
import ReferEarnContent from "../../components/pages/ReferEarnContent";

export const metadata: Metadata = {
  title: "Refer & Earn",
  description: "Refer friends to Tradingle and earn reward points.",
  alternates: { canonical: absoluteUrl("/refer-earn") },
  robots: { index: true, follow: true },
};

export default function ReferEarnPage() {
  return <ReferEarnContent />;
}
