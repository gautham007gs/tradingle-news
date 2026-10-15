import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Award, FileText, CheckCircle2, Clock, XCircle, Send, Eye, MessageSquare } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

const statusBadge = (s: string) => {
  if (s === "published") return <Badge style={{ backgroundColor: "hsl(142 70% 40%)", color: "white" }}>Published</Badge>;
  if (s === "pending_review") return <Badge variant="secondary">Pending review</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

const ContributorDashboard = () => {
  const { user } = useCmsAuth();
  const [stats, setStats] = useState({ published: 0, pending: 0, rejected: 0, points: 0, perArticle: 10 });
  const [recent, setRecent] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: arts }, setting] = await Promise.all([
        hostingerApi.articles("?status=mine&limit=100"),
        hostingerApi.points().catch(() => ({ points_per_article: 10 })),
      ]);
      const list = arts ?? [];
      setStats({
        published: list.filter(a => a.status === "published").length,
        pending: list.filter(a => a.status === "pending_review" || a.status === "draft").length,
        rejected: list.filter(a => a.status === "rejected").length,
        points: user.points ?? 0,
        perArticle: setting.points_per_article ?? 10,
      });
      setRecent(list.slice(0, 5));
      setFeedback(list.filter(a => a.review_notes && a.status === "rejected").slice(0, 3));
    })();
  }, [user]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground text-sm">Earn {stats.perArticle} points for every approved submission.</p>
        </div>
        <Button asChild><Link to="/contributor/submit"><PenLine className="w-4 h-4 mr-1" /> New submission</Link></Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Award} label="Total points" value={stats.points} accent />
        <StatCard icon={CheckCircle2} label="Published" value={stats.published} />
        <StatCard icon={Clock} label="In review / drafts" value={stats.pending} />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} />
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">How it works</h2>
        <div className="grid grid-cols-4 gap-3 text-center">
          <Step icon={PenLine} label="Write" sub="Draft your story" />
          <Step icon={Send} label="Submit" sub="Send to editors" />
          <Step icon={Eye} label="Review" sub="Editorial team" />
          <Step icon={Award} label="Earn" sub={`+${stats.perArticle} pts`} accent />
        </div>
      </Card>

      {feedback.length > 0 && (
        <Card className="p-5 border-destructive/40">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm"><MessageSquare className="w-4 h-4 text-destructive" /> Editor feedback to address</h2>
          <ul className="space-y-3">
            {feedback.map(a => (
              <li key={a.id} className="text-sm">
                <Link to={`/contributor/submit/${a.id}`} className="font-medium hover:underline">{a.title}</Link>
                <p className="text-xs text-muted-foreground mt-1">{a.review_notes}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Recent submissions</h2>
          <Link to="/contributor/articles" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No submissions yet. <Link to="/contributor/submit" className="text-primary hover:underline">Write your first article →</Link></p>
        ) : (
          <ul className="divide-y">
            {recent.map(a => (
              <li key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{new Date(a.updated_at).toLocaleString()}</div>
                  {a.review_notes && <div className="text-xs text-destructive mt-1">Editor: {a.review_notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {a.points_awarded > 0 && <span className="text-xs font-semibold" style={{ color: "hsl(var(--primary))" }}>+{a.points_awarded} pts</span>}
                  {statusBadge(a.status)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

const Step = ({ icon: Icon, label, sub, accent }: any) => (
  <div className="flex flex-col items-center gap-1">
    <div className="w-10 h-10 rounded-full grid place-items-center" style={{ backgroundColor: accent ? "hsl(var(--primary))" : "hsl(var(--muted))", color: accent ? "white" : undefined }}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="text-xs font-semibold">{label}</div>
    <div className="text-[10px] text-muted-foreground">{sub}</div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, accent }: any) => (
  <Card className="p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="w-4 h-4" />{label}</div>
    <div className="mt-2 text-3xl font-bold" style={{ color: accent ? "hsl(var(--primary))" : undefined }}>{value}</div>
  </Card>
);

export default ContributorDashboard;
