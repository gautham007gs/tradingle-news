import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Eye, FolderTree, Image as ImgIcon, Inbox, Award, Trophy,
  Clock, CheckCircle2, PenLine, Sparkles, X, TrendingUp, Users as UsersIcon,
  RefreshCw, CalendarClock, Globe, Zap, BarChart3,
} from "lucide-react";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { hostingerApi } from "@/lib/hostingerApi";

const Dashboard = () => {
  const { user, roles, isStaff, isAdmin } = useCmsAuth();
  const isAuthorOnly = !isStaff && roles.includes("author");

  const [stats, setStats] = useState({ articles: 0, published: 0, drafts: 0, pending: 0, scheduled: 0, views: 0, categories: 0, media: 0 });
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [myArticles, setMyArticles] = useState<any[]>([]);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeStatus, setPurgeStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [dashboard, categories, media, pending, scheduled, rewards] = await Promise.all([
          hostingerApi.dashboard(),
          hostingerApi.categories().catch(() => ({ data: [] })),
          hostingerApi.media().catch(() => ({ data: [] })),
          hostingerApi.articles("?status=pending_review&limit=5").catch(() => ({ data: [] })),
          hostingerApi.articles("?status=scheduled&limit=10").catch(() => ({ data: [] })),
          hostingerApi.rewardsLedger().catch(() => ({ rows: [], leaders: [], totals: { awarded: 0, contributors: 0, articles: 0 } })),
        ]);
        setStats({
          articles: dashboard.stats.total ?? 0,
          published: dashboard.stats.published ?? 0,
          drafts: dashboard.stats.draft ?? 0,
          pending: dashboard.stats.pending ?? 0,
          scheduled: scheduled.data.length,
          categories: categories.data.length,
          media: media.data.length,
          views: dashboard.stats.views ?? 0,
        });
        setPendingItems(pending.data.map((q: any) => ({ ...q, author_name: q.author_name ?? "Unknown" })));
        setScheduledItems(scheduled.data.slice(0, 5));
        setMyArticles(dashboard.recent ?? []);
        setTopContributors((rewards.leaders ?? []).slice(0, 5));
        setPointsAwarded(rewards.totals?.awarded ?? 0);
      } catch {
        // keep dashboard usable
      }
    })();
  }, [isStaff, isAuthorOnly, user]);

  useEffect(() => {
    if (!user || isAdmin) return;
    const key = `tradingle_editor_onboarding_${user.id}`;
    setShowOnboarding(localStorage.getItem(key) !== "done");
  }, [user, isAdmin]);

  const finishOnboarding = () => {
    if (user) localStorage.setItem(`tradingle_editor_onboarding_${user.id}`, "done");
    setShowOnboarding(false);
  };

  const purgeCache = async () => {
    setPurging(true);
    setPurgeStatus(null);
    try {
      await hostingerApi.cmsRevalidate({ tags: ["home", "latest", "sitemap", "site-settings"] });
      setPurgeStatus("Cache cleared — live site will reflect changes within seconds.");
    } catch {
      setPurgeStatus("Could not purge cache. Try again.");
    } finally {
      setPurging(false);
    }
  };

  const roleLabel = isAdmin ? "Administrator" : roles.includes("editor") ? "Editor" : roles.includes("author") ? "Author" : "Member";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{isStaff ? "Newsroom" : "My Dashboard"}</h1>
          <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>Welcome back, <span className="font-semibold text-foreground">{user?.email?.split("@")[0]}</span></span>
            <span aria-hidden>·</span>
            <Badge variant="secondary" className="text-xs">{roleLabel}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/admin/articles/new">
              <PenLine className="mr-1.5 h-4 w-4" /> Write article
            </Link>
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={purgeCache} disabled={purging}>
              <RefreshCw className={`mr-1.5 h-4 w-4 ${purging ? "animate-spin" : ""}`} />
              {purging ? "Purging..." : "Purge cache"}
            </Button>
          )}
          {isStaff && stats.pending > 0 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/review">
                <Inbox className="mr-1.5 h-4 w-4" />
                {stats.pending} pending review
              </Link>
            </Button>
          )}
        </div>
      </div>

      {purgeStatus && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <span className="flex-1">{purgeStatus}</span>
          <button onClick={() => setPurgeStatus(null)} className="hover:text-foreground" title="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Onboarding */}
      {showOnboarding && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/8 to-primary/3">
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary flex-shrink-0">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Welcome to the Tradingle newsroom</h2>
                  <p className="text-sm text-muted-foreground">Quick tips to get started:</p>
                </div>
              </div>
              <div className="grid gap-1.5 text-sm sm:grid-cols-2 pl-12">
                {[
                  "Complete your author profile and byline.",
                  "Use headings, captions, and alt text for images.",
                  "Run the SEO checklist before publishing.",
                  "Verify names, dates, and numbers before publishing.",
                  "Submit for review or publish per your role.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Dismiss setup guide" onClick={finishOnboarding}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-t px-5 py-3 flex items-center gap-2 bg-muted/20">
            <Button size="sm" onClick={finishOnboarding} variant="outline">Got it</Button>
          </div>
        </Card>
      )}

      {isStaff ? (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard icon={Inbox} label="Pending review" value={stats.pending} accent={stats.pending > 0} href="/admin/review" />
            <StatCard icon={CheckCircle2} label="Published" value={stats.published} href="/admin/articles?status=published" />
            <StatCard icon={FileText} label="Drafts" value={stats.drafts} href="/admin/articles?status=draft" />
            <StatCard icon={CalendarClock} label="Scheduled" value={stats.scheduled} accent2={stats.scheduled > 0} href="/admin/articles?status=scheduled" />
            <StatCard icon={Eye} label="Total views" value={stats.views >= 1000 ? `${(stats.views / 1000).toFixed(1)}k` : stats.views} />
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Review queue */}
            <Card className="lg:col-span-2 overflow-hidden">
              <div className="border-b bg-muted/30 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-primary" />
                  <div>
                    <h2 className="font-semibold">Awaiting review</h2>
                    <p className="text-xs text-muted-foreground">Submissions waiting for editorial review</p>
                  </div>
                </div>
                {pendingItems.length > 0 && (
                  <Link to="/admin/review" className="text-xs text-primary hover:underline font-medium">View all →</Link>
                )}
              </div>
              {pendingItems.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">All caught up. Nothing pending.</p>
                </div>
              ) : (
                <ul className="divide-y">
                  {pendingItems.map((q: any) => (
                    <li key={q.id} className="hover:bg-muted/40 transition-colors">
                      <Link to={`/admin/articles/${q.id}`} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium line-clamp-1">{q.title}</h3>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            By {q.author_name} · {new Date((q.updated_at || "").replace(" ", "T") + (q.updated_at?.includes("T") ? "" : "Z")).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant="secondary" className="flex items-center gap-1 flex-shrink-0 text-xs">
                          <Clock className="h-3 w-3" /> Pending
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Right column */}
            <div className="space-y-5">
              {/* Scheduled */}
              {scheduledItems.length > 0 && (
                <Card className="overflow-hidden border-blue-200">
                  <div className="border-b bg-blue-50/60 px-4 py-3 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-blue-600" />
                    <h2 className="font-semibold text-sm text-blue-800">Scheduled ({scheduledItems.length})</h2>
                  </div>
                  <ul className="divide-y">
                    {scheduledItems.map((a: any) => (
                      <li key={a.id} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                        <Link to={`/admin/articles/${a.id}`} className="block">
                          <div className="font-medium text-sm line-clamp-1">{a.title}</div>
                          {a.scheduled_at && (
                            <div className="text-xs text-blue-700 mt-0.5">
                              {new Date((a.scheduled_at as string).replace(" ", "T") + "Z").toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Top contributors */}
              <Card className="overflow-hidden">
                <div className="border-b bg-muted/30 px-4 py-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  <h2 className="font-semibold text-sm">Top contributors</h2>
                </div>
                <div className="p-4">
                  {topContributors.length === 0 ? (
                    <div className="py-6 text-center">
                      <UsersIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">No data yet</p>
                      <Link to="/admin/rewards" className="text-xs text-primary hover:underline mt-1 block">View rewards →</Link>
                    </div>
                  ) : (
                    <ol className="space-y-2.5">
                      {topContributors.map((p: any, i: number) => (
                        <li key={p.id} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2.5 min-w-0">
                            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary flex-shrink-0">{i + 1}</span>
                            <span className="truncate">{p.display_name || "Unknown"}</span>
                          </span>
                          <span className="font-bold text-primary flex-shrink-0 text-xs">{p.total_points_earned} pts</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                {pointsAwarded > 0 && (
                  <div className="border-t bg-muted/20 px-4 py-2.5 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Total awarded</span>
                    <span className="font-bold">{pointsAwarded} pts</span>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickLink icon={Globe} label="Sitemap & feeds" href="/admin/sitemap" />
            <QuickLink icon={FolderTree} label={`${stats.categories} categories`} href="/admin/categories" />
            <QuickLink icon={ImgIcon} label={`${stats.media} media files`} href="/admin/media" />
            <QuickLink icon={BarChart3} label="All articles" href="/admin/articles" />
          </div>
        </>
      ) : (
        <>
          {/* Author view */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard icon={CheckCircle2} label="Published" value={stats.published} />
            <StatCard icon={Clock} label="Pending review" value={stats.pending} accent={stats.pending > 0} />
            <StatCard icon={FileText} label="Drafts" value={stats.drafts} />
            <StatCard icon={Eye} label="Total views" value={stats.views} />
          </div>

          <Card className="overflow-hidden">
            <div className="border-b bg-muted/30 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">My recent articles</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Your latest submissions and published work</p>
              </div>
              {myArticles.length > 0 && (
                <Link to="/admin/articles" className="text-xs text-primary hover:underline font-medium">View all →</Link>
              )}
            </div>
            {myArticles.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-muted-foreground mb-4">No articles yet.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/articles/new">Write your first article</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {myArticles.map((a: any) => (
                  <li key={a.id} className="hover:bg-muted/40 transition-colors">
                    <Link to={`/admin/articles/${a.id}`} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <h3 className="font-medium line-clamp-1">{a.title}</h3>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date((a.updated_at || "").replace(" ", "T") + (a.updated_at?.includes("T") ? "" : "Z")).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={a.status === "published" ? "default" : "outline"} className="flex-shrink-0 text-xs">
                        {a.status.replace(/_/g, " ")}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, accent, accent2, href }: any) => {
  const inner = (
    <Card className={`p-4 hover:shadow-md transition-all border cursor-default ${href ? "hover:border-primary/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{label}</span>
          </div>
          <div className={`text-2xl font-bold ${accent ? "text-destructive" : accent2 ? "text-blue-600" : ""}`}>
            {value}
          </div>
        </div>
        {accent && <TrendingUp className="h-4 w-4 text-destructive flex-shrink-0 mt-1" />}
        {accent2 && <CalendarClock className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />}
      </div>
    </Card>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
};

const QuickLink = ({ icon: Icon, label, href }: { icon: any; label: string; href: string }) => (
  <Link to={href}>
    <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all flex items-center gap-3 cursor-pointer">
      <div className="rounded-md bg-primary/10 p-2 flex-shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium truncate">{label}</span>
    </Card>
  </Link>
);

export default Dashboard;
