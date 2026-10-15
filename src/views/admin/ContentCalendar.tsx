import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hostingerApi } from "@/lib/hostingerApi";
import { toast } from "sonner";
import {
  CalendarDays, ChevronLeft, ChevronRight, Plus, Clock,
  CheckCircle2, FileText, CalendarClock, Archive
} from "lucide-react";

type CalendarArticle = {
  id: string | number;
  title: string;
  slug: string;
  status: string;
  scheduled_at?: string | null;
  published_at?: string | null;
  updated_at?: string | null;
  author_name?: string | null;
  category_name?: string | null;
};

const STATUS_META: Record<string, { label: string; color: string; dot: string; icon: any }> = {
  published:     { label: "Published",     color: "bg-emerald-100 text-emerald-800 border-emerald-200", dot: "bg-emerald-500",  icon: CheckCircle2 },
  scheduled:     { label: "Scheduled",     color: "bg-blue-100 text-blue-800 border-blue-200",          dot: "bg-blue-500",     icon: CalendarClock },
  draft:         { label: "Draft",         color: "bg-slate-100 text-slate-700 border-slate-200",       dot: "bg-slate-400",    icon: FileText },
  pending_review:{ label: "In Review",     color: "bg-amber-100 text-amber-800 border-amber-200",       dot: "bg-amber-500",    icon: Clock },
  archived:      { label: "Archived",      color: "bg-gray-100 text-gray-600 border-gray-200",          dot: "bg-gray-400",     icon: Archive },
  rejected:      { label: "Rejected",      color: "bg-red-100 text-red-700 border-red-200",             dot: "bg-red-400",      icon: FileText },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function getArticleDate(article: CalendarArticle): string | null {
  if (article.status === "scheduled" && article.scheduled_at) return article.scheduled_at.slice(0, 10);
  if (article.status === "published" && article.published_at) return article.published_at.slice(0, 10);
  if (article.updated_at) return article.updated_at.slice(0, 10);
  return null;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const ContentCalendar = () => {
  // Refresh "today" every minute so the calendar stays accurate if left open overnight
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const todayStr = now.toISOString().slice(0, 10);
  const today = now;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [articles, setArticles] = useState<CalendarArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [published, drafts, scheduled] = await Promise.all([
        hostingerApi.articles("?status=published&limit=200"),
        hostingerApi.articles("?status=draft&limit=100"),
        hostingerApi.articles("?status=scheduled&limit=100"),
      ]);
      const all: CalendarArticle[] = [
        ...(published.data ?? []),
        ...(drafts.data ?? []),
        ...(scheduled.data ?? []),
      ];
      setArticles(all);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay(todayStr);
  };

  const filteredArticles = useMemo(() =>
    articles.filter(a => statusFilter === "all" || a.status === statusFilter),
    [articles, statusFilter]
  );

  const articlesByDate = useMemo(() => {
    const map: Record<string, CalendarArticle[]> = {};
    filteredArticles.forEach(a => {
      const d = getArticleDate(a);
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(a);
    });
    return map;
  }, [filteredArticles]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const selectedArticles = selectedDay ? (articlesByDate[selectedDay] ?? []) : [];

  const totalScheduled = articles.filter(a => a.status === "scheduled").length;
  const totalDrafts = articles.filter(a => a.status === "draft").length;
  const publishedThisMonth = articles.filter(a => {
    const d = getArticleDate(a);
    return a.status === "published" && d && d.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`);
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" /> Content Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan and visualize your publishing schedule across the month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="pending_review">In Review</SelectItem>
            </SelectContent>
          </Select>
          <Link to="/admin/articles/new">
            <Button size="sm" className="h-9">
              <Plus className="w-4 h-4 mr-1.5" /> New article
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Published this month</div>
          <div className="text-2xl font-bold mt-1">{publishedThisMonth}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled</div>
          <div className="text-2xl font-bold mt-1">{totalScheduled}</div>
        </Card>
        <Card className="p-4 border-l-4 border-l-slate-400">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">In drafts</div>
          <div className="text-2xl font-bold mt-1">{totalDrafts}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
        {/* Calendar */}
        <Card className="overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Previous month" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-base font-bold min-w-[180px] text-center">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Next month" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
              Today
            </Button>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 px-5 py-2.5 border-b bg-muted/10">
            {Object.entries(STATUS_META).slice(0, 4).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                {meta.label}
              </div>
            ))}
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map(day => (
              <div key={day} className="py-2.5 text-center text-xs font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Loading articles...</div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Empty cells before month start */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[90px] border-b border-r bg-muted/10" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const dayArticles = articlesByDate[dateStr] ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;

                return (
                  <div
                    key={dayNum}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`min-h-[90px] border-b border-r p-1.5 cursor-pointer transition-colors ${
                      isSelected ? "bg-primary/5 ring-1 ring-inset ring-primary/30" :
                      isToday ? "bg-amber-50/60" :
                      "hover:bg-muted/30"
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 h-5 w-5 flex items-center justify-center rounded-full ${
                      isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                    }`}>
                      {dayNum}
                    </div>

                    <div className="space-y-0.5">
                      {dayArticles.slice(0, 3).map(a => {
                        const meta = STATUS_META[a.status] || STATUS_META.draft;
                        return (
                          <div
                            key={a.id}
                            className={`flex items-center gap-1 rounded px-1 py-0.5 text-[10px] border leading-tight ${meta.color}`}
                            title={a.title}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                            <span className="truncate">{a.title}</span>
                          </div>
                        );
                      })}
                      {dayArticles.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-1">
                          +{dayArticles.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Fill remaining cells to complete last row */}
              {(() => {
                const totalCells = firstDay + daysInMonth;
                const remainder = totalCells % 7;
                if (remainder === 0) return null;
                return Array.from({ length: 7 - remainder }).map((_, i) => (
                  <div key={`trail-${i}`} className="min-h-[90px] border-b border-r bg-muted/10" />
                ));
              })()}
            </div>
          )}
        </Card>

        {/* Day detail panel */}
        <div className="space-y-4">
          {selectedDay ? (
            <Card className="overflow-hidden">
              <div className="bg-muted/40 px-4 py-3 border-b">
                <h3 className="font-semibold text-sm">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedArticles.length} {selectedArticles.length === 1 ? "article" : "articles"}
                </p>
              </div>

              {selectedArticles.length === 0 ? (
                <div className="p-6 text-center">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nothing scheduled</p>
                  <Link to="/admin/articles/new">
                    <Button size="sm" variant="outline" className="mt-3 text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Write article
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y">
                  {selectedArticles.map(a => {
                    const meta = STATUS_META[a.status] || STATUS_META.draft;
                    const Icon = meta.icon;
                    return (
                      <div key={a.id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-2">
                          <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                            a.status === "published" ? "text-emerald-600" :
                            a.status === "scheduled" ? "text-blue-600" :
                            a.status === "pending_review" ? "text-amber-600" :
                            "text-muted-foreground"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold line-clamp-2 leading-tight">{a.title}</p>
                            {a.category_name && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{a.category_name}</p>
                            )}
                            {a.author_name && (
                              <p className="text-[11px] text-muted-foreground">by {a.author_name}</p>
                            )}
                            {a.status === "scheduled" && a.scheduled_at && (
                              <p className="text-[11px] text-blue-600 mt-0.5 flex items-center gap-0.5">
                                <CalendarClock className="h-2.5 w-2.5" />
                                {new Date(a.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge className={`text-[10px] px-1.5 py-0 border ${meta.color}`}>
                            {meta.label}
                          </Badge>
                          <Link to={`/admin/articles/${a.id}`} className="ml-auto">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]">
                              Edit →
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-6 text-center border-dashed">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">Click a day</p>
              <p className="text-xs text-muted-foreground mt-1">See all articles for that date</p>
            </Card>
          )}

          {/* Upcoming scheduled */}
          <Card className="overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4 text-blue-600" /> Upcoming scheduled
              </h3>
            </div>
            {articles.filter(a => a.status === "scheduled").length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No scheduled articles</div>
            ) : (
              <div className="divide-y">
                {articles
                  .filter(a => a.status === "scheduled" && a.scheduled_at)
                  .sort((a, b) => (a.scheduled_at! > b.scheduled_at! ? 1 : -1))
                  .slice(0, 6)
                  .map(a => (
                    <div key={a.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium line-clamp-1">{a.title}</p>
                        <p className="text-[11px] text-blue-600 flex items-center gap-0.5 mt-0.5">
                          <CalendarClock className="h-2.5 w-2.5" />
                          {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </p>
                      </div>
                      <Link to={`/admin/articles/${a.id}`}>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] flex-shrink-0">Edit</Button>
                      </Link>
                    </div>
                  ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContentCalendar;
