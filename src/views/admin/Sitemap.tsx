import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe2, ExternalLink, Copy, RefreshCw, FileText, FolderTree, UserRound, Newspaper, Ban, HeartPulse, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";
import PageHeader from "@/components/cms/PageHeader";
import { formatArticleTime } from "@/lib/articleMapper";
import { articlePath } from "@/lib/articlePaths";

type Status = Awaited<ReturnType<typeof hostingerApi.sitemapStatus>>;
type CronHealth = Awaited<ReturnType<typeof hostingerApi.cronHealth>>;

const Sitemap = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [health, setHealth] = useState<CronHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [data, healthData] = await Promise.all([
        hostingerApi.sitemapStatus(),
        hostingerApi.cronHealth().catch(() => null),
      ]);
      setStatus(data);
      setHealth(healthData);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load sitemap status");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const copy = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={Globe2}
        title="Sitemap & SEO feeds"
        description="Search engines discover your content through these auto-generated feeds. They regenerate automatically as you publish — there is nothing to manually rebuild."
        help="Sitemaps list every published, indexable URL so Google and Bing can crawl your site efficiently. The Google News sitemap only includes articles published in the last 48 hours, as required by Google News guidelines."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      <Card className="overflow-hidden border">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h2 className="font-semibold">Live feeds</h2>
          <p className="text-xs text-muted-foreground mt-1">Submit the sitemap index to Google Search Console and Bing Webmaster Tools</p>
        </div>
        <div className="divide-y">
          {(status?.sitemaps ?? []).map((s) => (
            <div key={s.url} className="flex items-center justify-between gap-3 px-6 py-4">
              <div className="min-w-0">
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-muted-foreground truncate">{s.url}</div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => copy(s.url)} title="Copy URL">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" asChild title="Open in new tab">
                  <a href={s.url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                </Button>
              </div>
            </div>
          ))}
          {!status && loading && <div className="px-6 py-8 text-center text-muted-foreground text-sm">Loading…</div>}
        </div>
      </Card>

      {/* `stats` is read through optional chaining, not just `status?.` — a 200
          that omits the block (older API build, error envelope) used to throw
          inside render and take the whole screen down through the boundary. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide"><FileText className="h-3.5 w-3.5" /> Articles indexed</div>
          <div className="mt-2 text-2xl font-bold">{status?.stats?.published_indexed ?? "—"}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Ban className="h-3.5 w-3.5" /> Excluded from index</div>
          <div className="mt-2 text-2xl font-bold">{status?.stats?.published_excluded ?? "—"}</div>
          <p className="mt-1 text-xs text-muted-foreground">Published but no-indexed or missing a slug</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide"><Newspaper className="h-3.5 w-3.5" /> Google News eligible</div>
          <div className="mt-2 text-2xl font-bold">{status?.stats?.news_eligible ?? "—"}</div>
          <p className="mt-1 text-xs text-muted-foreground">Published in the last 48 hours</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wide"><FolderTree className="h-3.5 w-3.5" /> Categories &amp; authors</div>
          <div className="mt-2 text-2xl font-bold">{(status?.stats?.categories ?? 0) + (status?.stats?.authors ?? 0)}</div>
          <p className="mt-1 text-xs text-muted-foreground">{status?.stats?.categories ?? 0} categories · {status?.stats?.authors ?? 0} authors</p>
        </Card>
      </div>

      <Card className="overflow-hidden border">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Cron job health</h2>
          <p className="text-xs text-muted-foreground mt-1">Confirms the scheduled-publish job is actually firing, not just installed</p>
        </div>
        <div className="divide-y">
          {!health?.jobs?.length ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">
              {loading ? "Loading…" : "No cron runs recorded yet — the scheduler will report in after its first run."}
            </div>
          ) : (
            health.jobs.map((job) => (
              <div key={job.job_name} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{job.job_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {job.last_success_at
                      ? `Last success: ${formatArticleTime(job.last_success_at)} · ${job.run_count} runs total`
                      : "Never succeeded"}
                  </div>
                  {job.last_error && (
                    <div className="text-xs text-destructive mt-0.5 truncate max-w-md">{job.last_error}</div>
                  )}
                </div>
                <Badge variant={job.is_stale ? "destructive" : "secondary"} className="flex-shrink-0 gap-1 text-xs">
                  {job.is_stale ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {job.is_stale ? "Stale" : "Healthy"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="overflow-hidden border">
        <div className="border-b bg-muted/30 px-6 py-4">
          <h2 className="font-semibold">Most recently indexed</h2>
          <p className="text-xs text-muted-foreground mt-1">Newest published articles currently in the main sitemap</p>
        </div>
        <div className="divide-y">
          {(status?.recent ?? []).length === 0 && !loading ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">No published articles yet.</div>
          ) : (
            (status?.recent ?? []).map((a) => (
              <div key={a.slug} className="flex items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{articlePath({ slug: a.slug, categorySlug: a.category_slug })}</div>
                </div>
                <Badge variant="secondary" className="flex-shrink-0 text-xs">{a.published_at ? formatArticleTime(a.published_at) : "—"}</Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default Sitemap;
