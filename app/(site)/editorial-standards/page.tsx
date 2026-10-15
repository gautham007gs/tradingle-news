import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl } from "../../../lib/site";
import JsonLd from "../../../components/JsonLd";
import { buildCollectionPageJsonLd } from "../../../lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Editorial Standards & Ethics | Tradingle",
  description:
    "Tradingle's editorial guidelines, fact-checking policies, AI-usage disclosure, corrections protocol, and source protection rules.",
  alternates: { canonical: absoluteUrl("/editorial-standards") },
  openGraph: {
    title: "Editorial Standards & Ethics | Tradingle",
    description: "Our public code of ethics, fact-checking policies, and editorial guidelines.",
    url: absoluteUrl("/editorial-standards"),
    type: "website",
  },
};

const sections = [
  {
    id: "mission",
    title: "Our Editorial Mission",
    content: `Tradingle is committed to providing accurate, fair, and timely journalism across finance, politics, technology, business, sports, science, health, and local coverage from cities and states across India and the world. Our mission is to inform, not influence — to surface facts and context that help readers understand the world around them.`,
  },
  {
    id: "accuracy",
    title: "Accuracy & Fact-Checking",
    content: `Every published article undergoes a multi-stage editorial review. Facts are verified against primary sources, official statements, or at least two independent secondary sources. If a factual error is discovered post-publication, we issue a correction notice at the top of the affected article and log it in our public Corrections register. We never silently alter published content.`,
  },
  {
    id: "independence",
    title: "Editorial Independence",
    content: `Tradingle's editorial decisions are made independently of commercial or advertising interests. Advertisers and sponsors have no influence over editorial coverage. When commercial relationships are relevant, they are clearly disclosed. Native advertising and sponsored content are permanently labelled "Sponsored" and are visually distinct from editorial content.`,
  },
  {
    id: "bylines",
    title: "Bylines & Author Accountability",
    content: `Every article published on Tradingle carries a named byline linked to the author's public profile page. Anonymous sourcing is permitted for sensitive investigations only and requires editor-in-chief sign-off. Reporters who write about topics where they have a potential conflict of interest must disclose it in writing to an editor before publication.`,
  },
  {
    id: "sources",
    title: "Source Protection",
    content: `Tradingle treats the protection of confidential sources as an absolute obligation. No journalist shall be required by Tradingle to identify a source who was promised confidentiality. Digital communications with sources are conducted using end-to-end encrypted channels.`,
  },
  {
    id: "corrections",
    title: "Corrections Policy",
    content: `We correct errors promptly and transparently. Minor typographical fixes are made silently. Factual corrections are noted at the top of the article with the date of correction and a brief description of what was changed. Significant corrections are also logged in our `,
    correctionLink: true,
  },
  {
    id: "ai",
    title: "AI Usage Disclosure",
    content: `Tradingle may use AI-assisted tools for tasks including grammar checking, SEO analysis, headline ideation, and translation assistance. AI-generated content is always reviewed, edited, and approved by a human editor before publication. We do not publish AI-generated reporting without human verification and attribution.`,
  },
  {
    id: "diversity",
    title: "Diversity & Representation",
    content: `We are committed to accurate and proportionate representation of all communities — by gender, religion, caste, geography, and socioeconomic background. Editorial choices, including story selection, sourcing, and imagery, are made with this principle in mind.`,
  },
  {
    id: "opinion",
    title: "Opinion & Commentary",
    content: `Opinion articles, columns, and editorials are clearly labelled as such and represent the views of the author, not of Tradingle. The editorial board's unsigned editorials represent the institutional view of Tradingle's leadership. Opinion contributors do not receive editorial input on the news desk and vice versa.`,
  },
  {
    id: "contact",
    title: "Editorial Contact",
    content: `If you believe an article contains a factual error, please contact our editorial desk at `,
    contactEmail: true,
  },
];

export default function EditorialStandardsPage() {
  return (
    <main className="trd-container py-10 max-w-3xl mx-auto">
      <JsonLd
        data={buildCollectionPageJsonLd({
          name: "Editorial Standards & Ethics",
          url: "/editorial-standards",
          description: "Tradingle's editorial guidelines, fact-checking policies, AI-usage disclosure, corrections protocol, and source protection rules.",
          breadcrumbItems: [
            { name: "Home", path: "/" },
            { name: "Editorial Standards", path: "/editorial-standards" },
          ],
        })}
      />

      <header className="mb-10 border-b pb-6">
        <nav className="mb-3 text-sm text-muted-foreground">
          <Link href="/" className="hover:underline">Home</Link>
          <span className="mx-1" aria-hidden>/ </span>
          <span>Editorial Standards</span>
        </nav>
        <h1 className="text-4xl font-bold">Editorial Standards & Ethics</h1>
        <p className="mt-3 text-muted-foreground text-lg">
          Our public code of ethics, fact-checking policies, and the principles that guide every
          story we publish.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: June 2026
        </p>
      </header>

      <nav className="mb-8 p-4 bg-muted rounded-lg">
        <p className="text-sm font-semibold mb-2">On this page</p>
        <ul className="space-y-1">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="text-sm text-primary hover:underline"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.id} id={s.id}>
            <h2 className="text-xl font-bold mb-3 border-l-4 border-primary pl-4">
              {s.title}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {s.content}
              {s.correctionLink && (
                <Link href="/corrections" className="text-primary hover:underline">
                  public Corrections Log
                </Link>
              )}
              {s.contactEmail && (
                <a
                  href="mailto:editorial@tradingle.com"
                  className="text-primary hover:underline"
                >
                  editorial@tradingle.com
                </a>
              )}
              {s.contactEmail && (
                <>
                  {" "}or use our{" "}
                  <Link href="/contact" className="text-primary hover:underline">
                    contact form
                  </Link>
                  . We aim to respond within 24 hours.
                </>
              )}
            </p>
          </section>
        ))}
      </div>

      <footer className="mt-14 pt-6 border-t text-sm text-muted-foreground">
        <p>
          These standards are reviewed annually by Tradingle&apos;s editorial leadership. Substantive
          changes are noted with a revision date.
        </p>
        <div className="flex flex-wrap gap-4 mt-4">
          <Link href="/corrections" className="text-primary hover:underline">Corrections Log</Link>
          <Link href="/about" className="text-primary hover:underline">About Tradingle</Link>
          <Link href="/contact" className="text-primary hover:underline">Contact</Link>
        </div>
      </footer>
    </main>
  );
}
