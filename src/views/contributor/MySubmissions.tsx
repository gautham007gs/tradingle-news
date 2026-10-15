import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";
import { articlePath } from "@/lib/articlePaths";

const badge = (s: string) => {
  if (s === "published") return <Badge style={{ backgroundColor: "hsl(142 70% 40%)", color: "white" }}>Published</Badge>;
  if (s === "pending_review") return <Badge variant="secondary">Pending review</Badge>;
  if (s === "rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (s === "draft") return <Badge variant="outline">Draft</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

const MySubmissions = () => {
  const { user } = useCmsAuth();
  const nav = useNavigate();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    try {
      const { data } = await hostingerApi.articles("?status=mine&limit=100");
      setItems(data ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load submissions");
    }
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    try {
      await hostingerApi.deleteArticle(Number(id));
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete submission");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My submissions</h1>
        <Button onClick={() => nav("/contributor/submit")}><Plus className="w-4 h-4 mr-1" /> New submission</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 w-32"></th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No submissions yet.</td></tr>
            ) : items.map(a => {
              const editable = a.status === "draft" || a.status === "rejected";
              return (
                <tr key={a.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    {a.status === "published" ? <a href={articlePath({ slug: a.slug, categorySlug: a.category_slug })} target="_blank" rel="noreferrer" className="hover:underline">{a.title}</a> : a.title}
                    {a.review_notes && a.status === "rejected" && <div className="text-xs text-destructive mt-1">Editor: {a.review_notes}</div>}
                  </td>
                  <td className="px-4 py-3">{badge(a.status)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: a.points_awarded > 0 ? "hsl(var(--primary))" : undefined }}>{a.points_awarded > 0 ? `+${a.points_awarded}` : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(a.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 flex gap-1">
                    <Button size="sm" variant="ghost" disabled={!editable} onClick={() => nav(`/contributor/submit/${a.id}`)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" disabled={a.status === "published"} onClick={() => remove(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default MySubmissions;
