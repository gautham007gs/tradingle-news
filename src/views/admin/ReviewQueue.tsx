import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Eye, Save, Clock, FileCheck2, FileX2, Inbox, AlertCircle } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";
import { legacyTextToHtml, sanitizeArticleHtml } from "@/lib/contentHtml";

const ReviewQueue = () => {
  const { isStaff, isAdmin } = useCmsAuth();
  const [items, setItems] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [perArticle, setPerArticle] = useState(10);
  const [savingPts, setSavingPts] = useState(false);
  const [tab, setTab] = useState<"pending_review" | "rejected" | "published">("pending_review");
  const [counts, setCounts] = useState({ pending_review: 0, rejected: 0, published: 0 });

  const load = async () => {
    try {
      // Fetch current tab's articles for display; also fetch rejected count
      // separately (not in dashboard stats) and use dashboard for pending/published.
      const [current, dashboard, setting, rejectedRes] = await Promise.all([
        hostingerApi.articles(`?status=${tab}&limit=50`),
        hostingerApi.dashboard(),
        hostingerApi.points(),
        hostingerApi.articles("?status=rejected&limit=200"),
      ]);
      setItems(current.data ?? []);
      setCounts({
        pending_review: dashboard.stats?.pending ?? 0,
        rejected: (rejectedRes.data ?? []).length,
        published: dashboard.stats?.published ?? 0,
      });
      setPerArticle(setting.points_per_article ?? 10);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load review queue");
    }
  };

  useEffect(() => { load(); }, [tab]);

  const approve = async (id: string) => {
    try {
      const item = items.find((a) => String(a.id) === String(id));
      await hostingerApi.reviewArticle(Number(id), "approve", notes[id] ?? "");
      toast.success(`Approved and ${perArticle} points awarded`);
      // Trigger ISR revalidation so the live site reflects the new article
      if (item?.slug) {
        hostingerApi.cmsRevalidate({ articleSlug: item.slug, tags: ["home", "latest"] });
      }
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not approve article");
    }
  };

  const reject = async (id: string) => {
    if (!notes[id]?.trim()) return toast.error("Add feedback notes before rejecting");
    try {
      await hostingerApi.reviewArticle(Number(id), "reject", notes[id]);
      toast.success("Rejected with feedback");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reject article");
    }
  };

  const savePoints = async () => {
    setSavingPts(true);
    try {
      await hostingerApi.updatePoints(perArticle);
      toast.success("Reward settings updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update reward");
    } finally {
      setSavingPts(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="rounded-lg border bg-muted/30 px-5 py-4">
        <p className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          Editorial access required to view review queue.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Inbox className="h-8 w-8 text-primary" />
            Editorial review
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.pending_review} pending / {counts.published} approved / {counts.rejected} rejected
          </p>
        </div>
      </div>

      {isAdmin && (
        <Card className="border bg-muted/20 p-5">
          <h2 className="mb-4 font-semibold">Contributor rewards</h2>
          <div className="flex flex-col items-end gap-4 sm:flex-row">
            <div className="flex-1 sm:flex-none">
              <Label htmlFor="pts" className="mb-1 block text-sm font-medium">Points per approved article</Label>
              <Input
                id="pts"
                type="number"
                min={0}
                value={perArticle}
                onChange={(e) => setPerArticle(parseInt(e.target.value || "0"))}
                className="w-full sm:w-40"
              />
            </div>
            <Button disabled={savingPts} onClick={savePoints} size="lg" className="w-full sm:w-auto">
              <Save className="mr-2 h-4 w-4" /> Save settings
            </Button>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending_review" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Pending</span>
            <Badge variant="secondary" className="ml-1">{counts.pending_review}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <FileX2 className="h-4 w-4" />
            <span className="hidden sm:inline">Rejected</span>
            <Badge variant="secondary" className="ml-1">{counts.rejected}</Badge>
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4" />
            <span className="hidden sm:inline">Approved</span>
            <Badge variant="secondary" className="ml-1">{counts.published}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-6 space-y-4">
          {items.length === 0 ? (
            <Card className="p-10 text-center">
              <Inbox className="mx-auto mb-2 h-12 w-12 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {tab === "pending_review" ? "All caught up. No submissions awaiting review." : "No items in this category."}
              </p>
            </Card>
          ) : items.map((article) => {
            const open = openId === article.id;
            const statusBadge = article.status === "pending_review"
              ? <Badge><Clock className="mr-1 h-3 w-3" />Pending</Badge>
              : article.status === "rejected"
              ? <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>
              : <Badge><CheckCircle2 className="mr-1 h-3 w-3" />Published / {article.points_awarded ?? 0} pts</Badge>;

            return (
              <Card key={article.id} className="overflow-hidden border transition-shadow hover:shadow-md">
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {statusBadge}
                        <span className="text-xs text-muted-foreground">by <strong>{article.author_name ?? "Unknown"}</strong></span>
                      </div>
                      <h2 className="text-lg font-bold">{article.title}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(article.updated_at).toLocaleString()}</p>
                      {article.excerpt && <p className="mt-2 text-sm text-muted-foreground">{article.excerpt}</p>}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setOpenId(open ? null : article.id)} className="flex-shrink-0">
                      <Eye className="mr-1 h-4 w-4" /> {open ? "Hide" : "Preview"}
                    </Button>
                  </div>

                  {article.review_notes && article.status !== "pending_review" && (
                    <div className="rounded border-l-2 border-muted-foreground bg-muted/40 px-3 py-2 text-sm">
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">Feedback:</p>
                      <p className="italic text-muted-foreground">{article.review_notes}</p>
                    </div>
                  )}

                  {open && (
                    <div className="space-y-4 border-t pt-4">
                      {article.featured_image && (
                        <img src={article.featured_image} alt={article.featured_image_alt || "Featured"} className="max-h-96 w-full rounded object-cover" />
                      )}
                      <div
                        className="cms-article-content text-sm"
                        dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(legacyTextToHtml(article.content ?? "")) }}
                      />
                    </div>
                  )}

                  {article.status === "pending_review" && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <Label className="text-sm font-medium">Feedback for contributor</Label>
                        <p className="mb-2 text-xs text-muted-foreground">Provide constructive feedback. Notes are required to reject.</p>
                        <Textarea
                          rows={3}
                          value={notes[article.id] ?? ""}
                          onChange={(e) => setNotes((prev) => ({ ...prev, [article.id]: e.target.value }))}
                          placeholder="Great article. Please verify the dates and add one source link."
                          className="text-sm"
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link to={`/admin/articles/${article.id}`} className="text-xs text-primary hover:underline">Open in full editor -&gt;</Link>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => reject(article.id)} className="flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                          <Button onClick={() => approve(article.id)} className="flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Approve & publish
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReviewQueue;
