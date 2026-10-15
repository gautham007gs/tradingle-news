import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  fetchAllAuthorSlugs,
  fetchAuthor,
  NotFoundError,
} from "../../../../lib/api";
import { summaryToStory, formatArticleTime } from "../../../../lib/homepage";
import { absoluteUrl } from "../../../../lib/site";
import { buildPersonJsonLd } from "../../../../lib/seo";
import { articlePath } from "@/lib/articlePaths";
import JsonLd from "../../../../components/JsonLd";
import AdSpace from "@/components/news/AdSpace";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  try {
    const slugs = await fetchAllAuthorSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { author } = await fetchAuthor(slug);
    const authorUrl = absoluteUrl(`/author/${slug}`);
    const bio = author.bio || `Read all articles by ${author.displayName} on Tradingle — India's independent news platform.`;

    return {
      title: `${author.displayName} — ${author.roleTitle || "Journalist"} | Tradingle`,
      description: bio.slice(0, 160),
      alternates: { canonical: authorUrl },
      openGraph: {
        title: `${author.displayName} — ${author.roleTitle || "Journalist"}`,
        description: bio.slice(0, 160),
        url: authorUrl,
        type: "profile",
        // Profile-specific OG tags (required when type="profile")
        firstName: author.displayName.split(" ")[0],
        lastName: author.displayName.split(" ").slice(1).join(" ") || undefined,
        username: slug,
        siteName: "Tradingle",
        locale: "en_IN",
        images: author.avatarUrl
          ? [{ url: author.avatarUrl, width: 400, height: 400, alt: author.displayName }]
          : [],
      },
      twitter: {
        card: "summary",
        site: "@tradingle",
        creator: author.socialX
          ? `@${author.socialX.replace(/^@/, "").replace(/^https?:\/\/(x|twitter)\.com\//i, "")}`
          : undefined,
        title: `${author.displayName} — ${author.roleTitle || "Journalist"} | Tradingle`,
        description: bio.slice(0, 160),
        images: author.avatarUrl ? [author.avatarUrl] : [],
      },
    };
  } catch {
    return { title: "Author Not Found", robots: { index: false } };
  }
}

export default async function AuthorPage({ params }: PageProps) {
  const { slug } = await params;

  let data;
  try {
    data = await fetchAuthor(slug);
  } catch (e) {
    /* The upstream CMS can briefly return 5xx while an editor publish is
       invalidating caches. A profile page has no useful shell without its
       author payload, so serve the real 404 instead of failing the whole
       static build. */
    if (e instanceof NotFoundError) notFound();
    notFound();
  }

  const { author, articles } = data;
  const stories = articles.map(summaryToStory);
  const sidebarStories = stories.slice(0, 5);

  return (
    <main className="it-page-root">
      {/* Single @graph JSON-LD containing Person + ProfilePage + breadcrumb */}
      <JsonLd data={buildPersonJsonLd(author)} />

      {/* ── Full-width "AUTHORS" banner ─────────────────────────── */}
      <div className="it-header-band">
        <div className="trd-container">
          <nav aria-label="Breadcrumb" className="it-breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/author">Authors</Link>
            <span aria-hidden="true">/</span>
            <span>{author.displayName}</span>
          </nav>
          <h1 className="it-header-title">{author.displayName}</h1>
        </div>
      </div>

      {/* ── Leaderboard ad below header ─────────────────────────── */}
      <div className="trd-container">
        <div className="it-leaderboard">
          <AdSpace slotKey="author_leaderboard" height={90} label="Advertisement" />
        </div>
      </div>

      {/* ── Author card + sidebar ────────────────────────────────── */}
      <div className="trd-container">
        <div className="it-layout">
          <div className="it-main">

            {/* Author profile card */}
            <div className="it-author-card">
              <div className="it-author-inner">
                {author.avatarUrl ? (
                  <img
                    src={author.avatarUrl}
                    alt={`${author.displayName} profile photo`}
                    width={96}
                    height={96}
                    className="it-author-avatar"
                    loading="eager"
                  />
                ) : (
                  <div className="it-author-avatar-placeholder" aria-hidden="true">
                    {author.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="it-author-info">
                  <p className="it-author-name">{author.displayName}</p>
                  {author.roleTitle && (
                    <p className="it-author-role">{author.roleTitle}</p>
                  )}
                  {author.bio && (
                    <p className="it-author-bio">{author.bio}</p>
                  )}
                  <div className="it-author-meta">
                    <span className="it-author-count">
                      {articles.length} {articles.length === 1 ? "article" : "articles"}
                    </span>
                    {(author.socialX || author.socialLinkedin || author.socialWebsite) && (
                      <div className="it-author-socials" aria-label="Social links">
                        {author.socialX && (
                          <a
                            href={author.socialX.startsWith("http") ? author.socialX : `https://x.com/${author.socialX.replace(/^@/, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="it-author-social" aria-label="Follow on X"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                            X / Twitter
                          </a>
                        )}
                        {author.socialLinkedin && (
                          <a
                            href={author.socialLinkedin.startsWith("http") ? author.socialLinkedin : `https://linkedin.com/in/${author.socialLinkedin}`}
                            target="_blank" rel="noopener noreferrer"
                            className="it-author-social" aria-label="LinkedIn"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                            LinkedIn
                          </a>
                        )}
                        {author.socialWebsite && (
                          <a
                            href={author.socialWebsite.startsWith("http") ? author.socialWebsite : `https://${author.socialWebsite}`}
                            target="_blank" rel="noopener noreferrer"
                            className="it-author-social" aria-label="Website"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                            </svg>
                            Website
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Article list */}
            {stories.length === 0 ? (
              <div className="tag-empty-state">
                <div className="tag-empty-icon" aria-hidden="true">✍️</div>
                <h2 className="tag-empty-title">No articles yet</h2>
                <p className="tag-empty-desc">{author.displayName} hasn't published any articles yet.</p>
                <Link href="/" className="tag-empty-link">← Back to Home</Link>
              </div>
            ) : (
              <section aria-label={`Articles by ${author.displayName}`}>
                <div className="it-section-heading-row">
                  <h2 className="it-section-heading">All Stories</h2>
                </div>
                <div className="it-rows">
                  {stories.map((story, i) => (
                    <article key={story.slug} className="it-row">
                      <Link href={articlePath(story)} className="it-row-link group">
                        <div className="it-row-body">
                          {story.category && (
                            <span className="it-row-chip">{story.category}</span>
                          )}
                          <h3 className="it-row-title group-hover:text-primary transition-colors">
                            {story.title}
                          </h3>
                          {story.excerpt && (
                            <p className="it-row-excerpt">{story.excerpt}</p>
                          )}
                          <p className="it-row-meta">
                            <time dateTime={story.publishedAt}>{formatArticleTime(story.publishedAt)}</time>
                          </p>
                        </div>
                        {story.image && (
                          <div className="it-row-image-wrap">
                            <img
                              src={story.image}
                              alt={story.title}
                              className="it-row-image"
                              width={180}
                              height={120}
                              loading={i === 0 ? "eager" : "lazy"}
                            />
                          </div>
                        )}
                      </Link>
                      {/* Mid-list ad every 5 stories */}
                      {(i + 1) % 5 === 0 && i < stories.length - 1 && (
                        <div className="it-divider-ad">
                          <AdSpace slotKey={`author_mid_${i}`} height={90} label="Advertisement" />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="it-sidebar" aria-label="Sidebar">
            <div className="it-sidebar-sticky">
              <div className="it-sidebar-ad-block">
                <AdSpace slotKey="author_sidebar_1" height={250} label="Advertisement" />
              </div>

              {sidebarStories.length > 0 && (
                <div className="it-sidebar-stories">
                  <h4 className="it-sidebar-heading">Latest Stories</h4>
                  <ul className="it-sidebar-list">
                    {sidebarStories.map((story) => (
                      <li key={story.slug} className="it-sidebar-item">
                        <Link href={articlePath(story)} className="it-sidebar-story group">
                          {story.image && (
                            <div className="it-sidebar-story-thumb-wrap">
                              <img
                                src={story.image}
                                alt={story.title}
                                className="it-sidebar-story-thumb"
                                width={80}
                                height={54}
                                loading="lazy"
                              />
                            </div>
                          )}
                          <div className="it-sidebar-story-body">
                            {story.category && (
                              <span className="it-sidebar-story-chip">{story.category}</span>
                            )}
                            <p className="it-sidebar-story-title group-hover:text-primary transition-colors">
                              {story.title}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="it-sidebar-ad-block">
                <AdSpace slotKey="author_sidebar_2" height={250} label="Advertisement" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
