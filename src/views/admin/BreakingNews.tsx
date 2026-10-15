import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Zap, PenLine, Eye, Clock, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, Radio, ActivitySquare,
} from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";
import { toast } from "sonner";

type Article = {
  id: number;
  title: string;
  slug: string;
  status: string;
  priority: string;
  is_live?: boolean | number;
  published_at?: string | null;
  updated_at?: string;
  category_name?: string | null;
  author_name?: string;
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-800",
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-800",
  pending_review: "bg-amber-100 text-amber-800",
};

const BreakingNews = () => {
  const [breaking, setBreaking] = useState<Article[]>([]);
  const [live, setLive] = useState<Article[]>([]);
  const [recent, setRecent] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [demoting, setDemoting] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [breakingRes, liveRes, recentRes] = await Promise.all([
        hostingerApi.articles("?priority=breaking&limit=20").catch(() => ({ data: [] })),
        hostingerApi.articles("?is_live=1&status=published&limit=10").catch(() => ({ data: [] })),
        hostingerApi.articles("?status=published&limit=20&sort=published_at_desc").catch(() => ({ data: [] })),
      ]);
      setBreaking(breakingRes.data ?? []);
      setLive(liveRes.data ?? []);
      setRecent(recentRes.data ?? []);
    } catch {
      toast.error("Could not load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const demote = async (article: Article) => {
    setDemoting(article.id);
    try {
      // Save article with priority reset to normal
      await hostingerApi.saveArticle({
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: article.status as any,
        priority: "normal",
      });
      toast.success("Breaking tag removed");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update article");
    } finally {
      setDemoting(null);
    }
  };

  const promote = async (article: Article) => {
    setDemoting(article.id);
    try {
      await hostingerApi.saveArticle({
        id: article.id,
        title: article.title,
        slug: article.slug,
        status: "published",
        priority: "breaking",
      });
      toast.success("Article marked as Breaking");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update article");
    } finally {
      setDemoting(null);
    }
  };

  const filtered = recent.filter(a =>
    !breaking.find(b => b.id === a.id) &&
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const fmtTime = (ts?: string | null) => {
    if (!ts) return "";
    const d = new Date(ts.replace(" ", "T") + (ts.includes("T") ? "" : "Z"));
    return d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-destructive" />
          <div>
            <h1 className="text-xl font-bold">Breaking News</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage breaking alerts and live articles</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link to="/admin/articles/new">
              <PenLine className="w-4 h-4 mr-1.5" /> New breaking article
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Active breaking */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <div className="border-b bg-destructive/10 px-5 py-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-destructive" />
              <h2 className="font-semibold text-sm text-destructive">Active breaking stories</h2>
              <Badge variant="destructive" className="ml-auto">{breaking.length}</Badge>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded bg-muted animate-pulse" />)}
              </div>
            ) : breaking.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm text-muted-foreground">No breaking stories right now</p>
              </div>
            ) : (
              <ul className="divide-y">
                {breaking.map(a => (
                  <li key={a.id} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className="bg-destructive/15 text-destructive text-[10px] px-1.5 border-0">
                            <Zap className="w-2.5 h-2.5 mr-0.5" /> BREAKING
                          </Badge>
                          <Badge className={`text-[10px] px-1.5 ${STATUS_COLORS[a.status] ?? "bg-muted"}`} variant="outline">
                            {a.status.replace(/_/g, " ")}
                          </Badge>
                          {(a.is_live === 1 || a.is_live === true) && (
                            <Badge className="bg-red-600 text-white text-[10px] px-1.5 border-0 animate-pulse">
                              <Radio className="w-2.5 h-2.5 mr-0.5" /> LIVE
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2">{a.title}</h3>
                        <div className="text-xs text-muted-foreground mt-1">
                          {a.category_name && <span className="mr-2">{a.category_name}</span>}
                          {a.published_at && <span>{fmtTime(a.published_at)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <Link to={`/admin/articles/${a.id}`}>
                            <PenLine className="w-3 h-3 mr-1" /> Edit
                          </Link>
                        </Button>
                        {a.status === "published" && (
                          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                            <a href={`/${a.category_name?.toLowerCase().replace(/\s+/g, "-") ?? "news"}/${a.slug}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3 h-3 mr-1" /> View
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => demote(a)}
                          disabled={demoting === a.id}
                        >
                          {demoting === a.id ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : null}
                          Remove tag
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Live articles */}
          {live.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b bg-red-50 px-5 py-3 flex items-center gap-2">
                <Radio className="w-4 h-4 text-red-600" />
                <h2 className="font-semibold text-sm text-red-800">Live update articles</h2>
                <Badge className="ml-auto bg-red-600 text-white text-[10px]">{live.length}</Badge>
              </div>
              <ul className="divide-y">
                {live.map(a => (
                  <li key={a.id} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm line-clamp-1">{a.title}</h3>
                        <div className="text-xs text-muted-foreground mt-0.5">{fmtTime(a.updated_at)}</div>
                      </div>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs flex-shrink-0">
                        <Link to={`/admin/articles/${a.id}`}>
                          <ActivitySquare className="w-3 h-3 mr-1" /> Manage
                        </Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Promote recent article */}
        <Card className="overflow-hidden h-fit">
          <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Promote to Breaking</h2>
          </div>
          <div className="p-4 space-y-3">
            <Input
              placeholder="Search recent articles…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm"
            />
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
              </div>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-y-auto">
                {filtered.slice(0, 15).map(a => (
                  <li key={a.id} className="flex items-start gap-2 rounded-md border p-3 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium line-clamp-2">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{fmtTime(a.published_at)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-[10px] flex-shrink-0 px-2"
                      onClick={() => promote(a)}
                      disabled={demoting === a.id}
                    >
                      {demoting === a.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                    </Button>
                  </li>
                ))}
                {filtered.length === 0 && !loading && (
                  <div className="py-6 text-center text-xs text-muted-foreground">No matching articles</div>
                )}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Tips */}
      <Card className="p-4 bg-muted/30 border-muted">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-muted-foreground" /> Breaking news guidelines
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Breaking articles appear with a <strong>BREAKING</strong> badge on the homepage and category pages.</li>
          <li>Use <strong>Live update</strong> articles for developing stories — add timestamped updates in the article editor.</li>
          <li>Demote a breaking tag once the story is no longer developing to keep the homepage accurate.</li>
          <li>Priority: <strong>Breaking &gt; Top &gt; Normal</strong> — only one breaking story per section at a time is recommended.</li>
        </ul>
      </Card>
    </div>
  );
};

export default BreakingNews;
