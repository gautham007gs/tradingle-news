import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, Search, Eye, Calendar, ExternalLink,
  CalendarClock, CheckCircle2, Clock, Copy, Filter, RefreshCw, X,
} from "lucide-react";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";
import { articlePath } from "@/lib/articlePaths";

interface Article {
  id: string; title: string; slug: string; status: string; priority: string;
  published_at: string | null; updated_at: string; scheduled_at: string | null;
  views: number; author_name?: string; category_name?: string; category_slug?: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  published: { label: "Published", variant: "default", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  draft: { label: "Draft", variant: "secondary", color: "bg-slate-100 text-slate-700 border-slate-200" },
  pending_review: { label: "Pending", variant: "outline", color: "bg-amber-100 text-amber-800 border-amber-200" },
  scheduled: { label: "Scheduled", variant: "outline", color: "bg-blue-100 text-blue-800 border-blue-200" },
  archived: { label: "Archived", variant: "outline", color: "bg-gray-100 text-gray-600 border-gray-200" },
  rejected: { label: "Rejected", variant: "destructive", color: "bg-red-100 text-red-700 border-red-200" },
};

const PRIORITY_MAP: Record<string, { label: string; icon: string }> = {
  breaking: { label: "Breaking", icon: "🔴" },
  top: { label: "Top", icon: "⬆" },
  normal: { label: "", icon: "" },
};

const ArticlesList = () => {
  const nav = useNavigate();
  const [items, setItems] = useState<Article[]>([]);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterAuthor, setFilterAuthor] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [authors, setAuthors] = useState<{ id: string; display_name: string }[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [articlesRes, catsRes, authorsRes] = await Promise.all([
        hostingerApi.articles("?status=all&limit=200"),
        hostingerApi.categories().catch(() => ({ data: [] })),
        hostingerApi.authors().catch(() => ({ data: [] })),
      ]);
      setItems((articlesRes.data as any[]).map((a) => ({
        id: String(a.id),
        title: a.title,
        slug: a.slug,
        status: a.status,
        priority: a.priority ?? "normal",
        published_at: a.published_at ?? null,
        updated_at: a.updated_at,
        scheduled_at: a.scheduled_at ?? null,
        views: Number(a.views ?? 0),
        author_name: a.author_name ?? a.display_name ?? "",
        category_name: a.category_name ?? "",
        category_slug: a.category_slug ?? "",
      })));
      setCategories((catsRes.data ?? []).filter((c: any) => !c.parent_id).map((c: any) => ({ id: String(c.id), name: c.name })));
      setAuthors((authorsRes.data ?? []).map((a: any) => ({ id: String(a.id), display_name: a.display_name })));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load articles");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Permanently delete this article? This cannot be undone.")) return;
    try {
      await hostingerApi.deleteArticle(Number(id));
      toast.success("Article deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete article");
    }
  };

  const duplicate = async (article: Article) => {
    try {
      const { data } = await hostingerApi.articleById(article.id);
      const payload = {
        ...data,
        id: undefined,
        title: `Copy of ${data.title}`,
        slug: `copy-of-${data.slug}-${Date.now()}`,
        status: "draft",
        published_at: null,
        scheduled_at: null,
        is_live: false,
      };
      await hostingerApi.saveArticle(payload);
      toast.success("Article duplicated as draft");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not duplicate article");
    }
  };

  const handleBulkAction = async () => {
    if (!bulkStatus || selected.size === 0) return;
    if (!confirm(`Change ${selected.size} article(s) to "${bulkStatus}"?`)) return;
    setBulkBusy(true);
    let success = 0;
    for (const id of Array.from(selected)) {
      try {
        const { data } = await hostingerApi.articleById(id);
        await hostingerApi.saveArticle({ ...data, id, status: bulkStatus });
        success++;
      } catch {
        // continue
      }
    }
    toast.success(`${success} article(s) updated`);
    setSelected(new Set());
    setBulkStatus("");
    setBulkBusy(false);
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(a => a.id)));
  };

  const filtered = items.filter(i => {
    const matchQ = i.title.toLowerCase().includes(q.toLowerCase()) || i.slug.toLowerCase().includes(q.toLowerCase());
    const matchStatus = filterStatus === "all" || i.status === filterStatus;
    const matchCat = filterCategory === "all" || i.category_name === filterCategory;
    const matchAuthor = filterAuthor === "all" || i.author_name === filterAuthor;
    return matchQ && matchStatus && matchCat && matchAuthor;
  });

  filtered.sort((a, b) => {
    switch (sortBy) {
      case "recent": return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "oldest": return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case "popular": return b.views - a.views;
      case "title": return a.title.localeCompare(b.title);
      case "scheduled": return (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "");
      default: return 0;
    }
  });

  const statusCounts = items.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const scheduledItems = items.filter(a => a.status === "scheduled");

  const formatDate = (dateStr: string) => {
    // MySQL timestamps lack timezone info — treat as UTC
    const normalized = dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z";
    const d = new Date(normalized);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) return "just now";
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return "yesterday";
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const hasFilters = filterStatus !== "all" || filterCategory !== "all" || filterAuthor !== "all" || q;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Articles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} total
            {statusCounts.published ? ` · ${statusCounts.published} published` : ""}
            {statusCounts.draft ? ` · ${statusCounts.draft} drafts` : ""}
            {statusCounts.pending_review ? ` · ${statusCounts.pending_review} pending` : ""}
            {scheduledItems.length > 0 ? ` · ${scheduledItems.length} scheduled` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => nav("/admin/articles/new")}>
            <Plus className="w-4 h-4 mr-1.5" /> New article
          </Button>
        </div>
      </div>

      {/* Scheduled articles banner */}
      {scheduledItems.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/60 px-4 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarClock className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-blue-800">{scheduledItems.length} article{scheduledItems.length !== 1 ? "s" : ""} scheduled</span>
            <div className="flex flex-wrap gap-2 ml-1">
              {scheduledItems.slice(0, 3).map(a => (
                <Link key={a.id} to={`/admin/articles/${a.id}`} className="text-xs text-blue-700 hover:underline">
                  {a.title.slice(0, 35)}{a.title.length > 35 ? "…" : ""}
                  {a.scheduled_at && <span className="ml-1 opacity-70">({new Date(a.scheduled_at).toLocaleDateString()})</span>}
                </Link>
              ))}
              {scheduledItems.length > 3 && (
                <button onClick={() => setFilterStatus("scheduled")} className="text-xs text-blue-600 hover:underline">
                  +{scheduledItems.length - 3} more →
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Search + quick filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="pl-9 h-9"
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published {statusCounts.published ? `(${statusCounts.published})` : ""}</SelectItem>
              <SelectItem value="draft">Draft {statusCounts.draft ? `(${statusCounts.draft})` : ""}</SelectItem>
              <SelectItem value="pending_review">Pending {statusCounts.pending_review ? `(${statusCounts.pending_review})` : ""}</SelectItem>
              <SelectItem value="scheduled">Scheduled {statusCounts.scheduled ? `(${statusCounts.scheduled})` : ""}</SelectItem>
              <SelectItem value="archived">Archived {statusCounts.archived ? `(${statusCounts.archived})` : ""}</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently updated</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="popular">Most viewed</SelectItem>
              <SelectItem value="title">Title (A–Z)</SelectItem>
              <SelectItem value="scheduled">Schedule date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="h-9"
            onClick={() => setShowFilters(s => !s)}
          >
            <Filter className="w-4 h-4" />
            {(filterCategory !== "all" || filterAuthor !== "all") && (
              <span className="ml-1.5 bg-primary text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">!</span>
            )}
          </Button>
        </div>

        {showFilters && (
          <div className="flex gap-2 flex-wrap p-3 rounded-md border bg-muted/30">
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {authors.length > 0 && (
              <Select value={filterAuthor} onValueChange={setFilterAuthor}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder="All authors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All authors</SelectItem>
                  {authors.map(a => <SelectItem key={a.id} value={a.display_name}>{a.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => { setQ(""); setFilterStatus("all"); setFilterCategory("all"); setFilterAuthor("all"); }}
              >
                <X className="w-3 h-3 mr-1" /> Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <Card className="flex items-center gap-3 px-4 py-3 border-primary/30 bg-primary/5">
          <span className="text-sm font-semibold text-primary">{selected.size} selected</span>
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="h-8 w-48 text-sm">
              <SelectValue placeholder="Change status to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">📝 Draft</SelectItem>
              <SelectItem value="published">✅ Published</SelectItem>
              <SelectItem value="archived">📦 Archived</SelectItem>
              <SelectItem value="pending_review">⏳ Pending review</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkAction} disabled={!bulkStatus || bulkBusy} className="h-8">
            {bulkBusy ? "Updating..." : "Apply"}
          </Button>
          <Button variant="ghost" size="sm" className="h-8 ml-auto" onClick={() => setSelected(new Set())}>
            <X className="w-4 h-4" />
          </Button>
        </Card>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{filtered.length} article{filtered.length !== 1 ? "s" : ""}{hasFilters ? " matching filters" : ""}</span>
        {filtered.length > 0 && (
          <button onClick={toggleAll} className="hover:text-foreground">
            {selected.size === filtered.length ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>

      {/* Articles table */}
      <Card className="overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold">Title</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Author</th>
                <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">Views</th>
                <th className="text-right px-4 py-3 font-semibold">Updated</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Loading articles…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center">
                  <p className="text-muted-foreground mb-3">{hasFilters ? "No articles match your filters." : "No articles yet."}</p>
                  {!hasFilters && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/admin/articles/new">Write your first article</Link>
                    </Button>
                  )}
                </td></tr>
              ) : filtered.map(a => {
                const statusInfo = STATUS_MAP[a.status] ?? { label: a.status, color: "" };
                const priorityInfo = PRIORITY_MAP[a.priority] ?? PRIORITY_MAP.normal;
                return (
                  <tr key={a.id} className={`hover:bg-muted/30 transition-colors ${selected.has(a.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3.5">
                      <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} className="rounded" />
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <Link to={`/admin/articles/${a.id}`} className="group block">
                        <div className="font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {priorityInfo.icon && <span className="mr-1">{priorityInfo.icon}</span>}
                          {a.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="font-mono opacity-70">/{a.slug.slice(0, 40)}{a.slug.length > 40 ? "…" : ""}</span>
                          {a.category_name && <span className="text-primary/70">{a.category_name}</span>}
                        </div>
                        {a.status === "scheduled" && a.scheduled_at && (
                          <div className="flex items-center gap-1 text-xs text-blue-700 mt-0.5">
                            <CalendarClock className="h-3 w-3" />
                            {new Date(a.scheduled_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">
                      {a.author_name || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                      <div className="flex items-center justify-end gap-1 text-muted-foreground text-sm">
                        <Eye className="w-3 h-3" />
                        {a.views.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-muted-foreground">
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(a.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        {a.status === "published" && (
                          <Button size="sm" variant="ghost" asChild className="h-7 w-7 p-0" title="View live">
                            <a href={articlePath({ slug: a.slug, categorySlug: a.category_slug })} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => nav(`/admin/articles/${a.id}`)} title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => duplicate(a)} title="Duplicate as draft">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => remove(a.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ArticlesList;
