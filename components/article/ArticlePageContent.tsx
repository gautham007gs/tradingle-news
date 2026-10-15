"use client";

import MpaLink from "@/components/MpaLink";
import AdSpace from "@/components/news/AdSpace";
import ArticleRightRail from "@/components/news/ArticleRightRail";
import StoryTitle from "@/components/news/StoryTitle";
import ArticleCommentDrawer from "./ArticleCommentDrawer";
import ArticleReadProgress from "./ArticleReadProgress";
import {
  ChevronRight,
  Share2,
  Bookmark,
  ArrowRight,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo, useRef, Suspense, memo } from "react";
import { useToast } from "@/hooks/use-toast";
import { getArticleCityLabel } from "@/lib/articleCity";
import { hostingerApi } from "@/lib/hostingerApi";
import { sanitizeArticleHtml } from "@/lib/contentHtml";
import { trackEvent } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { shareWithWebApi } from "@/lib/webShare";
import { rafThrottle } from "@/lib/rafThrottle";
import { articlePath, formatArticleTime, toIsoDateTime, type StoryCardData } from "../../lib/homepage";
import type { Article } from "../../lib/types";
import RelativeTime from "../RelativeTime";

export interface ArticlePageContentProps {
  article: Article;
  slug: string;
  leftRailRelated: StoryCardData[];
  leftRailTrending: StoryCardData[];
  rightRailDontMiss: StoryCardData | null;
  moreStoryRows: StoryCardData[];
}

interface Comment {
  id?: number;
  user_name?: string;
  guest_name?: string;
  body: string;
}

function looksLikeHtml(content: string) {
  return /<[a-z][\s\S]*>/i.test(content);
}

export default function ArticlePageContent({
  article,
  slug,
  leftRailRelated,
  leftRailTrending,
  rightRailDontMiss,
  moreStoryRows,
}: ArticlePageContentProps) {
  const { toast } = useToast();
  const { user, openAuthModal } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBusy, setCommentBusy] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const scrollMilestones = useRef(new Set<number>());
  const [topAdVisible, setTopAdVisible] = useState(true);
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);

  const publishedIso = toIsoDateTime(article.publishedAt) || "";
  const categorySlug = article.categorySlug;
  const cityLabel = getArticleCityLabel(categorySlug, article.categoryName);
  const isHtml = looksLikeHtml(article.content);

  // Single merged scroll handler — avoids registering two listeners per article
  useEffect(() => {
    const onScroll = rafThrottle(() => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      setReadProgress(progress);
      // Hide top-ad slot after 80px of scroll
      setTopAdVisible(scrollY < 80);
      [25, 50, 75, 100].forEach((milestone) => {
        if (progress >= milestone && !scrollMilestones.current.has(milestone)) {
          scrollMilestones.current.add(milestone);
          trackEvent("article_scroll_depth", { slug, depth: milestone });
        }
      });
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [slug]);

  useEffect(() => {
    window.scrollTo(0, 0);
    scrollMilestones.current.clear();
  }, [slug]);

  useEffect(() => {
    let active = true;
    setCommentsLoading(true);
    hostingerApi
      .comments({ article_id: article.id, slug })
      .then(({ data }) => { if (active) { setComments(data); setCommentsLoading(false); } })
      .catch(() => { if (active) { setComments([]); setCommentsLoading(false); } });
    return () => { active = false; };
  }, [slug, article.id]);

  useEffect(() => {
    let active = true;
    hostingerApi
      .bookmarkStatus({ article_id: article.id, slug })
      .then(({ bookmarked: saved }) => { if (active) setBookmarked(saved); })
      .catch(() => { if (active) setBookmarked(false); });
    return () => { active = false; };
  }, [slug, article.id]);

  const articleHref = useCallback(
    (story: { slug?: string | null }) => articlePath(story),
    [],
  );

  const handleComment = async () => {
    if (!user) {
      openAuthModal();
      toast({ title: "Sign in to comment", description: "Please sign in to share your thoughts." });
      return;
    }
    if (!commentText.trim()) return;
    setCommentBusy(true);
    try {
      await hostingerApi.saveComment({
        article_id: article.id,
        slug,
        body: commentText.trim(),
        guest_name: user.name || "Reader",
        guest_email: user.email || undefined,
      });
      setCommentText("");
      toast({ title: "Comment submitted", description: "It will appear after moderation." });
      const { data } = await hostingerApi.comments({ article_id: article.id, slug });
      setComments(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast({ title: "Comment not saved", description: msg });
    } finally {
      setCommentBusy(false);
    }
  };

  const handleNativeShare = async () => {
    const result = await shareWithWebApi(
      { title: article.title, text: article.excerpt || undefined, url: window.location.href },
      () => toast({ title: "Link copied!", description: "Article link copied to clipboard." }),
    );
    if (result === "shared" || result === "clipboard") {
      trackEvent("article_share", { platform: result === "shared" ? "native" : "clipboard", slug });
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      openAuthModal();
      toast({ title: "Sign in to save articles", description: "Your saved stories appear on the Saved page." });
      return;
    }
    try {
      const { bookmarked: saved } = await hostingerApi.toggleBookmark({
        article_id: article.id,
        slug,
      });
      setBookmarked(saved);
      trackEvent("article_bookmark", { slug, bookmarked: saved });
      toast({ title: saved ? "Article saved" : "Bookmark removed" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Please sign in to save articles.";
      toast({ title: "Sign in required", description: msg });
    }
  };

  const handleShareStory = async (story: { title?: string; slug?: string }) => {
    const url = `${window.location.origin}${articlePath(story)}`;
    const result = await shareWithWebApi(
      { title: story.title || "Read on Tradingle", url },
      () => toast({ title: "Link copied!", description: "Story link copied to clipboard." }),
    );
    if (result === "shared" || result === "clipboard") {
      trackEvent("article_share", { platform: result === "shared" ? "native" : "clipboard", slug: story.slug });
    }
  };

  const handleBookmarkStory = async (story: { slug?: string; title?: string }) => {
    if (!story.slug) return;
    if (!user) {
      openAuthModal();
      toast({ title: "Sign in to save articles" });
      return;
    }
    try {
      const { bookmarked: saved } = await hostingerApi.toggleBookmark({ slug: story.slug });
      toast({ title: saved ? "Article saved" : "Bookmark removed" });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Please try again.";
      toast({ title: "Could not save", description: msg });
    }
  };

  const handleShareComment = async (_commentId: number, text: string) => {
    const result = await shareWithWebApi(
      { title: `Comment on ${article.title}`, text, url: window.location.href },
      () => toast({ title: "Link copied!", description: "Comment link copied to clipboard." }),
    );
    if (result === "shared") {
      trackEvent("article_share", { platform: "native", slug, context: "comment" });
    }
  };

  const bodyContent = useMemo(() => {
    if (isHtml) {
      return (
        <div
          className="cms-article-content"
          dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.content) }}
        />
      );
    }
    return article.content
      .split(/\n{2,}/)
      .filter(Boolean)
      .map((para, i) => (
        <p key={i} style={{ marginBottom: "16px" }}>
          {para}
        </p>
      ));
  }, [article.content, isHtml]);

  return (
    <>
      <ArticleReadProgress progress={readProgress} />

      <div
        className="trd-top-ad-slot hidden sm:block"
        style={{
          minHeight: "90px",
          opacity: topAdVisible ? 1 : 0,
          visibility: topAdVisible ? "visible" : "hidden",
          pointerEvents: topAdVisible ? "auto" : "none",
          transition: "opacity 0.3s ease-out",
        }}
      >
        <Suspense fallback={<div style={{ height: "90px", backgroundColor: "hsl(var(--muted))" }} />}>
          <AdSpace height={90} label="Top Ad" slotKey="article_top_banner" />
        </Suspense>
      </div>

      <div className="trd-container trd-layout-breadcrumbs py-[10px]" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <nav aria-label="Breadcrumb" className="flex items-center gap-[6px] text-[12px]" style={{ color: "hsl(var(--subtext))" }}>
          <MpaLink to="/" className="headline-link" style={{ color: "hsl(var(--primary))" }}>Home</MpaLink>
          <ChevronRight size={12} />
          {/* Canonical category URL is /{slug} — NOT /category/{slug} (that triggers a 301 redirect) */}
          <MpaLink to={`/${categorySlug}`} className="headline-link" style={{ color: "hsl(var(--primary))" }}>
            {article.categoryName}
          </MpaLink>
          <ChevronRight size={12} />
          <span className="truncate max-w-[140px] sm:max-w-[260px] md:max-w-[400px]">{article.title}</span>
        </nav>
      </div>

      <div className="trd-container trd-layout-article-layout article-page-shell article-page-shell--padded py-5 sm:py-7">
        <div className="article-page-grid">
          <article className="article-main-column min-w-0" itemScope itemType="https://schema.org/NewsArticle">
            <div className="trd-article-shell">
              {/* data-speakable attributes match the SpeakableSpecification cssSelector in lib/seo.ts */}
              <h1
                className="trd-headline-hero trd-layout-article-title article-page-title mb-3"
                itemProp="headline"
                data-speakable="headline"
              >
                <StoryTitle title={article.title} as="span" />
              </h1>

              {article.excerpt && (
                <p className="trd-article-deck article-page-deck" data-speakable="description">{article.excerpt}</p>
              )}

              {article.isSponsored && (
                <div className="mb-4 rounded-sm border p-3" style={{ background: "hsl(var(--section-alt-bg))" }}>
                  <p className="text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: "hsl(var(--primary))" }}>
                    Sponsored content
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: "hsl(var(--subtext))" }}>
                    {article.sponsorDisclosure ||
                      (article.sponsorName ? `Sponsored by ${article.sponsorName}.` : "This article is sponsored.")}
                  </p>
                </div>
              )}

              {article.correctionNote && (
                <div
                  className="mb-4 p-3"
                  style={{ borderLeft: "3px solid hsl(var(--primary))", background: "hsl(var(--section-alt-bg))" }}
                >
                  <p style={{ fontSize: "13px", lineHeight: 1.5 }}>
                    <strong>Update:</strong> {article.correctionNote}
                  </p>
                </div>
              )}

              <div className="article-meta-block">
                <div className="article-meta-primary">
                  <p className="article-meta-byline">
                    Written by{" "}
                    <MpaLink to={`/author/${article.author.slug}`} className="article-meta-author headline-link" itemProp="author">
                      {article.author.name}
                    </MpaLink>
                  </p>
                  <div className="article-meta-actions">
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      className="article-meta-action-btn article-meta-action-btn--plain article-meta-share-btn"
                      title="Share article"
                      aria-label="Share article"
                    >
                      <Share2 size={18} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={handleBookmark}
                      className="article-meta-action-btn article-meta-action-btn--plain"
                      style={{
                        color: bookmarked ? "hsl(var(--primary))" : "hsl(var(--subtext))",
                        background: bookmarked ? "hsl(var(--primary) / 0.1)" : "transparent",
                      }}
                      title={bookmarked ? "Remove saved article" : "Save article"}
                      aria-label={bookmarked ? "Remove saved article" : "Save article"}
                    >
                      <Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} />
                    </button>
                  </div>
                </div>
                <p className="article-meta-details">
                  <span>{article.readingTimeMinutes} min read</span>
                  {cityLabel && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>{cityLabel}</span>
                    </>
                  )}
                  <span aria-hidden="true"> · </span>
                  {publishedIso ? (
                    <RelativeTime
                      isoDate={publishedIso}
                      absoluteLabel={formatArticleTime(article.publishedAt)}
                      className="article-meta-datetime"
                      itemProp="datePublished"
                    />
                  ) : (
                    <time className="article-meta-datetime">{formatArticleTime(article.publishedAt)}</time>
                  )}
                </p>
              </div>

              {article.featuredImage && (
                <figure className="mb-6">
                  <img
                    src={article.featuredImage}
                    alt={article.featuredImageAlt || article.title}
                    width={1200}
                    height={675}
                    loading="eager"
                    decoding="async"
                    className="article-featured-image w-full bg-muted object-cover rounded-sm aspect-video"
                    itemProp="image"
                  />
                  {(article.featuredImageCaption || article.imageSource) && (
                    <figcaption className="trd-article-caption mt-2 text-[13px]" style={{ color: "hsl(var(--subtext))" }}>
                      {article.featuredImageCaption}
                      {article.imageSource ? ` (${article.imageSource})` : ""}
                    </figcaption>
                  )}
                </figure>
              )}

              <div className="article-body" style={{ color: "hsl(var(--foreground))" }} itemProp="articleBody" suppressHydrationWarning>
                {bodyContent}
              </div>

              {article.commentsEnabled && (
                <section className="article-comment-entry article-comment-entry-inline">
                  <div className="article-comment-title">
                    <MessageCircle size={18} />
                    <span>Comments ({comments.length})</span>
                  </div>
                  <button type="button" onClick={() => setCommentDrawerOpen(true)} className="article-comment-trigger">
                    Post your comment here
                    <ArrowRight size={16} />
                  </button>
                </section>
              )}

              {article.tags.length > 0 && (
                <nav className="article-topic-nav mt-6 pt-4 border-t border-border" aria-label="Article topics">
                  <span className="article-topic-label">Topics</span>
                  <ul className="article-topic-list">
                    {article.tags.map((tag) => (
                      <li key={tag.slug}>
                        <MpaLink
                          to={`/tag/${tag.slug}`}
                          className="article-topic-bubble headline-link"
                        >
                          {tag.name}
                        </MpaLink>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <div className="mt-5 pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="article-meta-action-btn article-meta-action-btn--plain"
                    aria-label="Share article"
                  >
                    <Share2 size={17} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <AdSpace height={250} label="Post-Article Ad" slotKey="article_post" />
              </div>

              {moreStoryRows.length > 0 && (
                <section className="article-more-section" aria-label="More stories">
                  <h2 className="article-more-heading">More stories for you</h2>
                  <div className="article-more-list">
                    {moreStoryRows.map((s, i) => (
                      <article key={s.slug || i} className="article-more-row">
                        <div className="article-more-copy">
                          <span className="article-more-category">{s.category || "Latest"}</span>
                          <MpaLink to={articleHref(s)} className="headline-link article-more-title-link">
                            <StoryTitle title={s.title} as="h3" className="article-more-title" />
                          </MpaLink>
                          {s.excerpt && <p className="article-more-excerpt">{s.excerpt}</p>}
                          <div className="article-more-actions">
                            <MpaLink to={`${articleHref(s)}#comments`} className="article-more-action article-more-action--plain" aria-label="Open comments">
                              <MessageCircle size={16} />
                            </MpaLink>
                            <div className="article-more-action-group">
                              <button
                                type="button"
                                className="article-more-action article-more-action--plain"
                                aria-label="Save article"
                                onClick={() => handleBookmarkStory(s)}
                              >
                                <Bookmark size={16} />
                              </button>
                              <button
                                type="button"
                                className="article-more-action article-more-action--plain"
                                aria-label="Share article"
                                onClick={() => handleShareStory(s)}
                              >
                                <Share2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {s.image && (
                          <MpaLink to={articleHref(s)} className="article-more-thumb" aria-label={s.title}>
                            <img src={s.image} alt={s.title} loading="lazy" decoding="async" className="h-full w-full object-cover trd-img-hover" />
                          </MpaLink>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <meta itemProp="datePublished" content={publishedIso} />
              <meta itemProp="dateModified" content={toIsoDateTime(article.updatedAt) || publishedIso} />
            </div>
          </article>

          <ArticleRightRail
            dontMiss={rightRailDontMiss}
            related={[...leftRailRelated, ...leftRailTrending].filter((story, index, all) => all.findIndex((candidate) => candidate.slug === story.slug) === index).slice(0, 6)}
            articleHref={articleHref}
          />
        </div>
      </div>

      <ArticleCommentDrawer
        isOpen={commentDrawerOpen}
        onClose={() => setCommentDrawerOpen(false)}
        article={article}
        comments={comments}
        isLoading={commentsLoading}
        commentText={commentText}
        commentBusy={commentBusy}
        user={user}
        onCommentChange={setCommentText}
        onCommentSubmit={handleComment}
        onShareComment={handleShareComment}
        onOpenAuth={openAuthModal}
      />

      <div className="trd-container pb-4">
        <AdSpace height={90} label="Bottom Leaderboard" slotKey="article_bottom_leaderboard" />
      </div>
    </>
  );
}
