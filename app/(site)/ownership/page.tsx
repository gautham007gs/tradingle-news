import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";
import StaticLegalPage from "../../../components/legal/StaticLegalPage";
import { ownershipSections } from "../../../components/legal/legalContent";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Ownership And Funding",
  description: "Tradingle ownership, funding, editorial independence, and sponsored content transparency.",
  alternates: { canonical: absoluteUrl("/ownership") },
};

const ownershipCards = [
  { label: "Publisher", value: "Tradingle Media Pvt. Ltd." },
  { label: "Domain", value: "tradingle.com" },
  { label: "Business Model", value: "Advertising, sponsorships, reader products, and future memberships." },
  { label: "Editorial Control", value: "Newsroom editors control independent editorial coverage." },
];

export default function OwnershipPage() {
  return (
    <StaticLegalPage
      kicker="Transparency"
      title="Ownership And Funding"
      intro="Readers deserve to know who publishes Tradingle, how the platform is funded, and how commercial relationships are separated from editorial judgment."
      sections={ownershipSections}
    >
      <div className="static-page-cards">
        {ownershipCards.map((item) => (
          <div key={item.label} className="static-page-card">
            <h2 className="static-page-card-label">{item.label}</h2>
            <p className="static-page-card-value">{item.value}</p>
          </div>
        ))}
      </div>
    </StaticLegalPage>
  );
}
