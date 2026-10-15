import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hostingerApi } from "@/lib/hostingerApi";
import { Award, Trophy, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { articlePath } from "@/lib/articlePaths";

type LedgerRow = {
  id: string | number;
  points: number;
  reason: string;
  created_at: string;
  user_id: string | number;
  article_id: string | number | null;
  user?: { display_name: string | null; slug: string | null };
  article?: { title: string; slug: string; category_slug?: string | null } | null;
};

const RewardsLedger = () => {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [leaders, setLeaders] = useState<any[]>([]);
  const [totals, setTotals] = useState({ awarded: 0, contributors: 0, articles: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await hostingerApi.rewardsLedger();
        if (!active) return;
        setRows(data.rows ?? []);
        setLeaders(data.leaders ?? []);
        setTotals(data.totals ?? { awarded: 0, contributors: 0, articles: 0 });
      } catch (error: any) {
        toast.error(error?.message || "Could not load rewards ledger.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" /> Rewards Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track all points awarded to contributors across your newsroom</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 space-y-2 border-l-4 border-l-primary/30 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="w-4 h-4" />
            <span className="font-semibold">Total points awarded</span>
          </div>
          <div className="text-4xl font-bold text-primary">{totals.awarded}</div>
        </Card>
        <Card className="p-6 space-y-2 border-l-4 border-l-primary/30 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="font-semibold">Articles rewarded</span>
          </div>
          <div className="text-4xl font-bold">{totals.articles}</div>
        </Card>
        <Card className="p-6 space-y-2 border-l-4 border-l-primary/30 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">Active contributors</span>
          </div>
          <div className="text-4xl font-bold">{totals.contributors}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-bold">Top contributors</h2>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : leaders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rewards awarded yet.</p>
          ) : (
            <ol className="space-y-3">
              {leaders.map((p: any, i: number) => (
                <li key={p.id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 grid place-items-center rounded-full bg-primary/20 text-primary text-xs font-bold">
                      {i + 1 <= 3 ? (i + 1 === 1 ? "🥇" : i + 1 === 2 ? "🥈" : "🥉") : i + 1}
                    </div>
                    <span className="truncate text-sm font-medium">
                      {p.slug ? <a href={`/author/${p.slug}`} className="hover:underline text-primary">{p.display_name || "Unknown"}</a> : (p.display_name || "Unknown")}
                    </span>
                  </div>
                  <span className="font-bold text-primary whitespace-nowrap">{p.total_points_earned} pts</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-bold mb-4">Recent activity</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ledger entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-semibold border-b bg-muted/30">
                  <tr>
                    <th className="px-4 py-3">Contributor</th>
                    <th className="px-4 py-3">Article</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">Points</th>
                    <th className="px-4 py-3 text-right">When</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.id} className={idx !== rows.length - 1 ? "border-b" : ""}>
                      <td className="px-4 py-3 font-medium">
                        {r.user?.slug ? <a href={`/author/${r.user.slug}`} className="hover:underline text-primary">{r.user?.display_name || "-"}</a> : (r.user?.display_name || "-")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[240px]">
                        {r.article ? <a href={articlePath({ slug: r.article.slug, categorySlug: r.article.category_slug })} className="hover:underline text-primary truncate">{r.article.title}</a> : <span>-</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.reason}</td>
                      <td className="px-4 py-3 text-right"><Badge className="bg-primary/20 text-primary">+{r.points}</Badge></td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RewardsLedger;
