import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Eye, Users, Newspaper, Zap, TrendingUp, Globe,
  RefreshCw, AlertCircle, ExternalLink, ActivitySquare,
} from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";
import { Link } from "react-router-dom";

type AnalyticsReport = {
  ok: boolean;
  days: number;
  total_views: number;
  unique_visitors: number;
  published_period: number;
  breaking_active: number;
  total_users: number;
  views_by_day: { day: string; views: number }[];
  top_articles: { path: string; slug: string; views: number }[];
  vitals: { metric_name: string; avg_val: number; cnt: number }[];
};

const PERIOD_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function vitalLabel(name: string): string {
  const map: Record<string, string> = { LCP: "Largest Contentful Paint", CLS: "Cumulative Layout Shift", FID: "First Input Delay", INP: "Interaction to Next Paint", TTFB: "Time to First Byte" };
  return map[name] ?? name;
}

function vitalStatus(name: string, val: number): "good" | "needs-improvement" | "poor" {
  if (name === "LCP") return val <= 2500 ? "good" : val <= 4000 ? "needs-improvement" : "poor";
  if (name === "CLS") return val <= 0.1 ? "good" : val <= 0.25 ? "needs-improvement" : "poor";
  if (name === "FID" || name === "INP") return val <= 100 ? "good" : val <= 300 ? "needs-improvement" : "poor";
  if (name === "TTFB") return val <= 800 ? "good" : val <= 1800 ? "needs-improvement" : "poor";
  return "good";
}

function vitalUnit(name: string): string {
  return name === "CLS" ? "" : " ms";
}

const statusColors = { good: "text-emerald-700 bg-emerald-50", "needs-improvement": "text-amber-700 bg-amber-50", poor: "text-red-700 bg-red-50" };

function MiniBar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded bg-muted overflow-hidden">
      <div className={`h-full rounded ${color ?? "bg-primary"}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

function Sparkline({ data }: { data: { day: string; views: number }[] }) {
  if (!data.length) return <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  const max = Math.max(...data.map(d => d.views), 1);
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
          <div
            className="w-full rounded-sm bg-primary/70 hover:bg-primary transition-all cursor-default"
            style={{ height: `${Math.max(2, (d.views / max) * 60)}px` }}
            title={`${d.day}: ${d.views} views`}
          />
        </div>
      ))}
    </div>
  );
}

const Analytics = () => {
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (d: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await hostingerApi.analyticsReport(d);
      setReport(data);
    } catch (e: any) {
      setError(e?.message ?? "Could not load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); }, [days]);

  const maxViews = report?.top_articles.length ? Math.max(...report.top_articles.map(a => a.views), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Analytics</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Site traffic and performance metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map(o => (
            <Button
              key={o.value}
              size="sm"
              variant={days === o.value ? "default" : "outline"}
              onClick={() => setDays(o.value)}
            >
              {o.label}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => load(days)} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <span className="text-xs ml-2 text-muted-foreground">— Analytics events are collected as visitors browse the site. Data will appear once traffic is recorded.</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Eye} label="Page views" value={fmt(report?.total_views)} loading={loading} />
        <StatCard icon={Users} label="Unique visitors" value={fmt(report?.unique_visitors)} loading={loading} />
        <StatCard icon={Newspaper} label="Published" value={fmt(report?.published_period)} loading={loading} sub={`in ${days}d`} />
        <StatCard icon={Zap} label="Breaking active" value={fmt(report?.breaking_active)} loading={loading} accent={!!report?.breaking_active} />
        <StatCard icon={Users} label="Registered users" value={fmt(report?.total_users)} loading={loading} />
      </div>

      {/* Traffic chart */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Page views over time</h2>
          <span className="text-xs text-muted-foreground ml-auto">Last {days} days</span>
        </div>
        {loading ? (
          <div className="h-16 rounded bg-muted animate-pulse" />
        ) : (
          <Sparkline data={report?.views_by_day ?? []} />
        )}
        {!loading && !report?.views_by_day.length && (
          <p className="text-xs text-muted-foreground mt-2">No page view events recorded yet. The site collects analytics automatically as users browse.</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Top articles */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Top pages</h2>
            <span className="text-xs text-muted-foreground ml-auto">by views</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded bg-muted animate-pulse" />)}
            </div>
          ) : report?.top_articles.length ? (
            <ul className="divide-y">
              {report.top_articles.map((a, i) => (
                <li key={i} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <a
                      href={a.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium truncate hover:underline text-primary flex items-center gap-1"
                    >
                      {a.path}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    <span className="text-xs font-bold flex-shrink-0">{fmt(a.views)}</span>
                  </div>
                  <MiniBar pct={(a.views / maxViews) * 100} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No page view data yet
            </div>
          )}
        </Card>

        {/* Core Web Vitals */}
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/30 px-5 py-3 flex items-center gap-2">
            <ActivitySquare className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Core Web Vitals</h2>
            <span className="text-xs text-muted-foreground ml-auto">avg over {days}d</span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded bg-muted animate-pulse" />)}
            </div>
          ) : report?.vitals.length ? (
            <ul className="divide-y">
              {report.vitals.map(v => {
                const status = vitalStatus(v.metric_name, v.avg_val);
                return (
                  <li key={v.metric_name} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-medium">{v.metric_name}</div>
                        <div className="text-xs text-muted-foreground">{vitalLabel(v.metric_name)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {v.metric_name === "CLS" ? v.avg_val.toFixed(3) : Math.round(v.avg_val)}{vitalUnit(v.metric_name)}
                        </div>
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[status]}`} variant="outline">
                          {status.replace("-", " ")}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground px-4">
              <ActivitySquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No Web Vitals data yet.</p>
              <p className="text-xs mt-1">Vitals are sent by the browser as users navigate the site.</p>
            </div>
          )}
          <div className="border-t bg-muted/20 px-5 py-2.5 text-xs text-muted-foreground">
            <a href="https://web.dev/vitals" target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
              Learn about Core Web Vitals →
            </a>
          </div>
        </Card>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>For deeper analytics, connect</span>
        <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Analytics</a>
        <span>or</span>
        <a href="https://chartbeat.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Chartbeat</a>
        <span>via Site Settings → Analytics.</span>
      </div>
    </div>
  );
};

function fmt(n?: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

const StatCard = ({ icon: Icon, label, value, loading, sub, accent }: any) => (
  <Card className={`p-4 ${accent ? "border-destructive/40" : ""}`}>
    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </div>
    {loading ? (
      <div className="h-7 w-16 rounded bg-muted animate-pulse" />
    ) : (
      <div className={`text-2xl font-bold ${accent ? "text-destructive" : ""}`}>
        {value}
        {sub && <span className="text-xs font-normal text-muted-foreground ml-1">{sub}</span>}
      </div>
    )}
  </Card>
);

export default Analytics;
