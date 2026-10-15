import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, AlertCircle, Search, Share2, Newspaper, ShieldCheck } from "lucide-react";
import {
  calculateSEOScore,
  generateSEOChecklist,
  sanitizeSlug,
  generateMetaDescription,
  generateSearchSnippetPreview,
  validateCanonicalUrl,
} from "@/lib/seoUtilities";

interface SEOPanelProps {
  article: {
    title: string;
    excerpt: string;
    content: string;
    slug: string;
    seo_title?: string;
    seo_description?: string;
    /** OG image override — falls back to featured_image for the social preview */
    seo_og_image?: string;
    featured_image?: string;
    schema_type?: string;
    author?: string;
    canonical_url?: string;
    robots_index?: boolean;
    robots_follow?: boolean;
    robots_noarchive?: boolean;
    /** Focus keyword — used by the SEO score/checklist */
    focus_keyword?: string;
    category?: string;
    tags?: string[];
    /** Twitter-specific card metadata */
    twitter_card?: string;
    twitter_creator?: string;
  };
  onSlugChange: (slug: string) => void;
  onTitleChange: (title: string) => void;
  onExcerptChange: (excerpt: string) => void;
  /** Optional: called when the robots_index toggle changes */
  onRobotsIndexChange?: (value: boolean) => void;
  /** Optional: called when the robots_follow toggle changes */
  onRobotsFollowChange?: (value: boolean) => void;
}

export default function SEOPanel({
  article,
  onSlugChange,
  onTitleChange,
  onExcerptChange,
  onRobotsIndexChange,
  onRobotsFollowChange,
}: SEOPanelProps) {
  const seoScore = useMemo(() => calculateSEOScore(article), [article]);
  const checklist = useMemo(() => generateSEOChecklist(article).slice(0, 7), [article]);
  const metaDescription = useMemo(
    () => generateMetaDescription(article.seo_description || article.excerpt),
    [article.seo_description, article.excerpt],
  );
  const snippetPreview = useMemo(
    () =>
      generateSearchSnippetPreview({
        title: article.seo_title || article.title,
        seo_description: article.seo_description || article.excerpt,
        slug: article.slug,
      }),
    [article.seo_title, article.seo_description, article.title, article.excerpt, article.slug],
  );
  const canonicalValid = article.canonical_url
    ? validateCanonicalUrl(article.canonical_url)
    : true;

  // Build the display URL using the real path pattern: {category}/{slug}
  const categorySegment = article.category
    ? article.category.toLowerCase().replace(/\s+/g, "-")
    : "news";
  const displayUrl = `tradingle.com/${categorySegment}/${article.slug || "article-slug"}`;

  const scoreTone =
    seoScore >= 80
      ? "text-emerald-700"
      : seoScore >= 60
        ? "text-amber-700"
        : "text-red-700";

  // Social preview uses seo_og_image first, then featured_image
  const socialImage = article.seo_og_image || article.featured_image || "";
  const [searchDevice, setSearchDevice] = useState<"desktop" | "mobile">("desktop");
  const [socialTab, setSocialTab] = useState<"og" | "twitter">("og");
  const previewDescription =
    article.seo_description ||
    article.excerpt ||
    snippetPreview.description ||
    "A concise article description will appear here in search results.";

  const robotsIndex = article.robots_index !== false;
  const robotsFollow = article.robots_follow !== false;

  return (
    <div className="space-y-4">
      {/* ── SEO health score ─────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">SEO health</h3>
            <p className="text-xs text-muted-foreground">
              {checklist.filter((item) => item.passed).length}/{checklist.length} checks passed
            </p>
          </div>
          <div className={`text-2xl font-bold ${scoreTone}`}>
            {seoScore}
            <span className="text-xs font-normal text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {checklist.map((item) => (
            <div key={item.item} className="flex items-start gap-2 text-xs">
              {item.passed ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-600" />
              )}
              <span
                className={
                  item.passed ? "text-muted-foreground" : "font-medium text-foreground"
                }
              >
                {item.item}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Google search preview ────────────────────────────────── */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Search className="h-4 w-4 text-primary" />
          Search preview
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={searchDevice === "desktop" ? "default" : "outline"}
            onClick={() => setSearchDevice("desktop")}
          >
            Desktop
          </Button>
          <Button
            type="button"
            size="sm"
            variant={searchDevice === "mobile" ? "default" : "outline"}
            onClick={() => setSearchDevice("mobile")}
          >
            Mobile
          </Button>
        </div>
        <div
          className={`rounded-md border bg-white p-4 font-sans ${searchDevice === "mobile" ? "max-w-[360px]" : ""}`}
        >
          <div className="flex gap-3">
            <div className="min-w-0 flex-1">
              <div className="break-words text-[13px] text-[#202124]">{displayUrl}</div>
              <div
                className={`${searchDevice === "mobile" ? "text-[18px]" : "text-[20px]"} mt-1 leading-6 text-[#1a0dab]`}
              >
                {snippetPreview.title || "Article title"}
              </div>
              <div className="mt-1 text-[14px] leading-5 text-[#4d5156]">
                {previewDescription}
              </div>
            </div>
            {socialImage && (
              <img
                src={socialImage}
                alt=""
                className={`${searchDevice === "mobile" ? "h-20 w-20" : "h-24 w-24"} flex-shrink-0 rounded-md object-cover`}
              />
            )}
          </div>
        </div>
        {!canonicalValid && (
          <p className="text-xs text-destructive">Canonical URL is not valid.</p>
        )}
      </Card>

      {/* ── Social card previews ─────────────────────────────────── */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Share2 className="h-4 w-4 text-primary" />
          Social previews
        </div>
        {/* Tab switcher */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setSocialTab("og")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${socialTab === "og" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            <Share2 className="h-3 w-3" /> Facebook / OG
          </button>
          <button
            type="button"
            onClick={() => setSocialTab("twitter")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${socialTab === "twitter" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            𝕏 / Twitter
          </button>
        </div>

        {socialTab === "og" ? (
          <div className="overflow-hidden rounded-md border bg-white">
            {socialImage ? (
              <img src={socialImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
            ) : (
              <div className="grid aspect-[1.91/1] place-items-center bg-muted text-xs text-muted-foreground">
                Featured image preview
              </div>
            )}
            <div className="space-y-1 p-3">
              <p className="text-[11px] uppercase text-muted-foreground">tradingle.com</p>
              <p className="line-clamp-2 text-sm font-semibold text-[#1c1e21]">
                {article.seo_title || article.title || "Article title"}
              </p>
              <p className="line-clamp-2 text-xs text-[#606770]">
                {article.seo_description || article.excerpt || "Article summary for social sharing."}
              </p>
            </div>
          </div>
        ) : (
          /* Twitter/X card preview */
          <div className="overflow-hidden rounded-2xl border bg-white">
            {(article.twitter_card || "summary_large_image") === "summary_large_image" ? (
              <>
                {socialImage ? (
                  <img src={socialImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
                ) : (
                  <div className="grid aspect-[1.91/1] place-items-center bg-muted text-xs text-muted-foreground">
                    No image — add a featured image
                  </div>
                )}
                <div className="p-3 space-y-0.5">
                  <p className="text-xs text-[#536471]">tradingle.com</p>
                  <p className="text-sm font-semibold text-[#0f1419] line-clamp-1">
                    {article.seo_title || article.title || "Article title"}
                  </p>
                  <p className="text-xs text-[#536471] line-clamp-2">
                    {article.seo_description || article.excerpt || "Article summary."}
                  </p>
                </div>
              </>
            ) : (
              /* summary card — image left, text right */
              <div className="flex">
                <div className="w-32 flex-shrink-0">
                  {socialImage ? (
                    <img src={socialImage} alt="" className="h-full w-full object-cover aspect-square" />
                  ) : (
                    <div className="grid aspect-square place-items-center bg-muted text-[10px] text-muted-foreground p-2 text-center">No image</div>
                  )}
                </div>
                <div className="p-3 space-y-0.5 min-w-0">
                  <p className="text-xs text-[#536471]">tradingle.com</p>
                  <p className="text-sm font-semibold text-[#0f1419] line-clamp-1">
                    {article.seo_title || article.title || "Article title"}
                  </p>
                  <p className="text-xs text-[#536471] line-clamp-2">
                    {article.seo_description || article.excerpt || "Article summary."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          {article.twitter_creator && (
            <span className="text-[#1da1f2]">@{article.twitter_creator}</span>
          )}
          <span>Card: <strong>{article.twitter_card || "summary_large_image"}</strong></span>
          {article.seo_og_image && <span className="text-emerald-600">✓ OG image set</span>}
        </div>

        {!article.seo_og_image && !article.featured_image && (
          <p className="text-xs text-amber-600">
            ⚠ No image set — add a featured image or OG image URL in the Advanced SEO section.
          </p>
        )}
      </Card>

      {/* ── Site card preview ────────────────────────────────────── */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Newspaper className="h-4 w-4 text-primary" />
          Site card
        </div>
        <div className="rounded-md border bg-background p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            {article.category || "News"}
          </p>
          <h4 className="mt-2 line-clamp-2 text-base font-bold leading-snug">
            {article.title || "Article headline"}
          </h4>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
            {article.excerpt || "Short article summary shown on Tradingle story cards."}
          </p>
          <p className="mt-3 text-[11px] text-muted-foreground">
            By {article.author || "Tradingle Staff"}
          </p>
        </div>
      </Card>

      {/* ── Meta fields (editable) ───────────────────────────────── */}
      <Card className="space-y-3 p-4">
        <h3 className="text-sm font-semibold">Meta fields</h3>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            SEO title ({(article.seo_title || article.title || "").length}/60)
          </label>
          <Input
            value={article.seo_title || article.title || ""}
            onChange={(event) => onTitleChange(event.target.value)}
            maxLength={70}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">
            Meta description ({metaDescription.length}/160)
          </label>
          <Textarea
            rows={3}
            value={article.seo_description || article.excerpt}
            onChange={(event) => onExcerptChange(event.target.value)}
            maxLength={180}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Slug</label>
          <Input
            className="font-mono text-xs"
            value={article.slug}
            onChange={(event) => onSlugChange(sanitizeSlug(event.target.value))}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            URL: tradingle.com/{categorySegment}/
            <strong>{article.slug || "article-slug"}</strong>
          </p>
        </div>
      </Card>

      {/* ── Robots / indexing ────────────────────────────────────── */}
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold mb-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Indexing controls
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-medium">Index this article</Label>
              <p className="text-[11px] text-muted-foreground">
                Allow search engines to list it in results
              </p>
            </div>
            <Switch
              checked={robotsIndex}
              onCheckedChange={onRobotsIndexChange}
              disabled={!onRobotsIndexChange}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-medium">Follow links</Label>
              <p className="text-[11px] text-muted-foreground">
                Allow search engines to follow outbound links
              </p>
            </div>
            <Switch
              checked={robotsFollow}
              onCheckedChange={onRobotsFollowChange}
              disabled={!onRobotsFollowChange}
            />
          </div>
          {(!robotsIndex) && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5">
              ⚠ This article is set to <strong>noindex</strong> — it won't appear in Google search results.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
