import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { dmcaSections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Copyright & DMCA",
  description:
    "Copyright in Tradingle content, what requires permission, how to license our work, and how to file or answer an infringement notice.",
  alternates: { canonical: absoluteUrl("/dmca") },
  openGraph: {
    title: "Copyright & DMCA | Tradingle",
    description: "Licensing our journalism, and how to file or answer an infringement notice.",
    url: absoluteUrl("/dmca"),
    type: "website",
    siteName: "Tradingle",
  },
};

export default function DmcaPage() {
  return (
    <StaticLegalPage
      kicker="Legal"
      title="Copyright & DMCA"
      intro="Tradingle's reporting is protected by copyright, and we respect the copyright of others. This page explains what you may do with our work without asking, what needs permission, and how infringement notices are filed and answered."
      sections={dmcaSections}
      contactLabel="For copyright and takedown matters, email"
      contactEmail="dmca@tradingle.com"
    />
  );
}
