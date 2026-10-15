import Link from "next/link";

export type LegalSection = { title: string; content: string };

type StaticLegalPageProps = {
  kicker?: string;
  title: string;
  effectiveDate?: string;
  intro: string;
  sections: LegalSection[];
  contactLabel?: string;
  contactEmail?: string;
  contactHref?: string;
  children?: React.ReactNode;
};

export default function StaticLegalPage({
  kicker,
  title,
  effectiveDate,
  intro,
  sections,
  contactLabel = "Questions?",
  contactEmail,
  contactHref,
  children,
}: StaticLegalPageProps) {
  return (
    <>
      <div className="static-page-hero" aria-hidden="false">
        <div className="trd-container static-page-hero-inner">
          {kicker && <p className="static-page-kicker">{kicker}</p>}
          <h1 className="static-page-title">{title}</h1>
          {effectiveDate && <p className="static-page-date">{effectiveDate}</p>}
        </div>
      </div>

      <main className="trd-container static-page py-10 sm:py-12">
        <div className="static-page-body">
          <p className="static-page-intro">{intro}</p>

          {children}

          <div className="static-page-sections">
            {sections.map((section, index) => (
              <section key={section.title} className="static-page-section">
                <h2 className="static-page-section-title">
                  {index + 1}. {section.title}
                </h2>
                <p className="static-page-section-copy">{section.content}</p>
              </section>
            ))}
          </div>

          {(contactEmail || contactHref) && (
            <div className="static-page-contact">
              <p>
                {contactLabel}{" "}
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className="static-page-link">
                    {contactEmail}
                  </a>
                ) : contactHref ? (
                  <Link href={contactHref} className="static-page-link">
                    contact page
                  </Link>
                ) : null}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
