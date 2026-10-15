/* Shared shell for the site's standalone reader pages (topics index,
   newsletters, sitemap, help, accessibility, copyright).

   The legal pages have their own shell — components/legal/StaticLegalPage —
   which renders a numbered list of prose sections. These pages are indexes and
   forms rather than prose, so they need a header plus a free-form body. */

export default function PageShell({
  kicker,
  title,
  standfirst,
  updated,
  children,
}: {
  kicker: string;
  title: string;
  standfirst?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="trd-page-shell">
      <header className="border-b border-b-[color:var(--rule)] bg-[color:var(--surface)]">
        <div className="trd-container py-8 sm:py-10 lg:py-12">
          <p className="mb-3 border-l-2 border-l-[color:var(--ink-900)] pl-2.5 text-[11px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ink-900)]">
            {kicker}
          </p>
          <h1 className="max-w-[22ch] text-[30px] font-[700] leading-[1.05] tracking-[-0.022em] text-[color:var(--ink-900)] sm:text-[38px] lg:text-[46px]">
            {title}
          </h1>
          {standfirst && (
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-[color:var(--ink-700)] sm:text-[16.5px]">
              {standfirst}
            </p>
          )}
          {updated && (
            <p className="mt-4 text-[11px] font-[600] uppercase tracking-[0.14em] text-[color:var(--ink-600)]">
              {updated}
            </p>
          )}
        </div>
      </header>

      <div className="trd-container py-9 sm:py-11 lg:py-14">{children}</div>
    </main>
  );
}
