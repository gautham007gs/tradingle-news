import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MessageCircle, CheckCircle2, XCircle, ShieldAlert, ExternalLink, Inbox,
  Search, Calendar, ChevronLeft, ChevronRight, X, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";

interface CommentRow {
  id: number;
  status: string;
  body: string;
  user_name?: string;
  guest_name?: string;
  created_at: string;
  article_slug?: string;
  article_category_slug?: string;
  article_title?: string;
}

const STATUS_CONFIG = {
  pending:  { label: "Pending",  variant: "secondary"    as const, icon: Inbox },
  approved: { label: "Approved", variant: "default"      as const, icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "outline"      as const, icon: XCircle },
  spam:     { label: "Spam",     variant: "destructive"  as const, icon: ShieldAlert },
};

const PAGE_SIZE = 40;

const CommentsModeration = () => {
  // ── Filters ────────────────────────────────────────────────────────────────
  const [status,   setStatus]   = useState("pending");
  const [searchQ,  setSearchQ]  = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [page,     setPage]     = useState(1);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [rows,    setRows]    = useState<CommentRow[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);

  // ── Selection ──────────────────────────────────────────────────────────────
  const [selected,     setSelected]     = useState<Set<number>>(new Set());
  const [bulkLoading,  setBulkLoading]  = useState(false);

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ), 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  // Reset to page 1 whenever filters change
  useEffect(() => { setPage(1); setSelected(new Set()); }, [status, debouncedQ, dateFrom, dateTo]);

  // ── Load ───────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    try {
      const res = await hostingerApi.adminComments({
        status,
        page,
        limit: PAGE_SIZE,
        q:         debouncedQ || undefined,
        date_from: dateFrom   || undefined,
        date_to:   dateTo     || undefined,
      });
      if (version !== loadVersion.current) return;
      setRows(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      if (version !== loadVersion.current) return;
      toast.error(e instanceof Error ? e.message : "Could not load comments");
      setRows([]);
      setTotal(0);
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [status, page, debouncedQ, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // ── Single moderation ──────────────────────────────────────────────────────
  const moderate = async (id: number, nextStatus: "approved" | "rejected" | "spam") => {
    try {
      await hostingerApi.moderateComment(id, nextStatus);
      toast.success(`Comment marked as ${nextStatus}`);
      setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update comment");
    }
  };

  // ── Bulk moderation ────────────────────────────────────────────────────────
  const bulkModerate = async (nextStatus: "approved" | "rejected" | "spam") => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await hostingerApi.moderateCommentsBulk([...selected], nextStatus);
      toast.success(`${res.updated} comment${res.updated !== 1 ? "s" : ""} marked as ${nextStatus}`);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleRow = (id: number) =>
    setSelected(prev => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });

  const toggleAll = () => {
    if (selected.size === rows.length && rows.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(r => r.id)));
    }
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatRelativeDate = (dateString: string) => {
    const normalized = /[-Zz+]\d{2}:\d{2}$/.test(dateString) || dateString.endsWith("Z")
      ? dateString
      : dateString.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return dateString;
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hrs  = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hrs  < 24) return `${hrs}h ago`;
    if (days < 7)  return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const clearFilters = () => {
    setSearchQ("");
    setDateFrom("");
    setDateTo("");
  };

  const hasFilters = searchQ || dateFrom || dateTo;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-primary" /> Comments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Moderate reader comments. Bulk-select rows to approve, reject, or mark as spam.
          </p>
        </div>

        <Select value={status} onValueChange={v => { setStatus(v); setSelected(new Set()); }}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="approved">✓ Approved</SelectItem>
            <SelectItem value="rejected">✗ Rejected</SelectItem>
            <SelectItem value="spam">⚠️ Spam</SelectItem>
            <SelectItem value="all">All comments</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Search & date filters ── */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search comments, articles, authors…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 text-sm w-36"
              title="From date"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 text-sm w-36"
              title="To date"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </Card>

      {/* ── Bulk action toolbar ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium text-primary mr-1">
            {selected.size} selected
          </span>
          <Button size="sm" onClick={() => bulkModerate("approved")} disabled={bulkLoading} className="gap-1 h-7">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkModerate("rejected")} disabled={bulkLoading} className="gap-1 h-7">
            <XCircle className="w-3.5 h-3.5" /> Reject
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkModerate("spam")} disabled={bulkLoading} className="gap-1 h-7 text-destructive hover:text-destructive">
            <ShieldAlert className="w-3.5 h-3.5" /> Spam
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={bulkLoading} className="gap-1 h-7 ml-auto">
            <X className="w-3.5 h-3.5" /> Deselect all
          </Button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading comments…</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">
            {hasFilters ? "No comments match your filters" : `No ${status === "all" ? "" : status + " "}comments`}
          </p>
          {status === "pending" && !hasFilters && (
            <p className="text-sm text-muted-foreground mt-1">
              Comment queue is empty — comments appear here when readers engage with articles.
            </p>
          )}
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
              Clear filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table header with select-all */}
          <div className="flex items-center gap-3 px-1 py-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all"
              className="ml-1"
            />
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? "comment" : "comments"}
              {status !== "all" && ` (${status})`}
              {hasFilters && " — filtered"}
            </span>
          </div>

          {rows.map(comment => {
            const config = STATUS_CONFIG[comment.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            const isSelected = selected.has(comment.id);

            return (
              <Card
                key={comment.id}
                className={`p-4 space-y-3 transition-all ${isSelected ? "ring-2 ring-primary/40 bg-primary/5" : "hover:shadow-md"}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleRow(comment.id)}
                    aria-label={`Select comment ${comment.id}`}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={config.variant} className="flex items-center gap-1 text-xs">
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">
                        {comment.user_name || comment.guest_name || "Guest Reader"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(comment.created_at)}
                      </span>
                    </div>

                    <a
                      href={
                        comment.article_category_slug && comment.article_slug
                          ? `/${comment.article_category_slug}/${comment.article_slug}`
                          : `/${comment.article_slug}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {comment.article_title}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>

                    <div className="bg-muted/40 rounded-md p-3 border border-muted">
                      <p className="text-sm leading-6 text-foreground whitespace-pre-line break-words">
                        {comment.body}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end pt-1 border-t">
                      {comment.status !== "spam" && (
                        <Button size="sm" variant="outline" onClick={() => moderate(comment.id, "spam")} className="gap-1 h-7 text-xs text-destructive hover:text-destructive">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Spam</span>
                        </Button>
                      )}
                      {comment.status !== "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => moderate(comment.id, "rejected")} className="gap-1 h-7 text-xs">
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                      )}
                      {comment.status !== "approved" && (
                        <Button size="sm" onClick={() => moderate(comment.id, "approved")} className="gap-1 h-7 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} total
          </p>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="h-8 px-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {/* Page number pills — show up to 5 around current */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
              .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) =>
                n === "…" ? (
                  <span key={`ellipsis-${i}`} className="flex items-center px-1 text-xs text-muted-foreground">…</span>
                ) : (
                  <Button
                    key={n}
                    size="sm"
                    variant={n === page ? "default" : "outline"}
                    onClick={() => setPage(n as number)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {n}
                  </Button>
                )
              )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="h-8 px-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsModeration;
