import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import { ArrowLeft, Save, Send } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";
import ArticleWritingTools from "@/components/cms/ArticleWritingTools";
import { legacyTextToHtml } from "@/lib/contentHtml";

const SubmitArticle = () => {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const { user } = useCmsAuth();
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"pending_review" | "draft">("pending_review");
  const [draftStatus, setDraftStatus] = useState("Not saved yet");
  const [sessionId] = useState(() => (isNew ? `new_${Date.now()}_${Math.random().toString(36).slice(2)}` : null));
  const [form, setForm] = useState({
    title: "", slug: "", excerpt: "", content: "", featured_image: "", featured_image_alt: "",
    featured_image_caption: "", image_source: "",
    category_id: "", status: "draft" as "draft" | "pending_review" | "published" | "rejected",
    review_notes: "" as string | null,
  });

  const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
  const limitWords = (value: string, max = 25) => value.trim().split(/\s+/).filter(Boolean).slice(0, max).join(" ");

  useEffect(() => {
    const localDraftKey = `tradingle_submission_draft_${id || sessionId}`;
    if (isNew) {
      const cached = window.localStorage.getItem(localDraftKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setForm((prev) => ({ ...prev, ...parsed.form }));
          setTagsInput(parsed.tagsInput || "");
          setDraftStatus("Recovered local draft");
        } catch {
          window.localStorage.removeItem(localDraftKey);
        }
      }
    }

    hostingerApi.categories().then(({ data }) => setCategories(data.map((c: any) => ({ id: String(c.id), name: c.name })))).catch(() => setCategories([]));
    hostingerApi.siteSettings()
      .then(({ settings }) => {
        if (settings.contributor_submit_status === "draft") setSubmitStatus("draft");
      })
      .catch(() => undefined);
    if (!isNew && id) {
      hostingerApi.articleById(id).then(({ data }) => {
        setForm({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt ?? "",
          content: legacyTextToHtml(data.content ?? ""),
          featured_image: data.featured_image ?? "",
          featured_image_alt: data.featured_image_alt ?? "",
          featured_image_caption: data.featured_image_caption ?? "",
          image_source: data.image_source ?? "",
          category_id: data.category_id ? String(data.category_id) : "",
          status: data.status as any,
          review_notes: data.review_notes ?? "",
        });
        setTagsInput((data.tags ?? []).map((t) => t.name).join(", "));
      }).catch((e: any) => toast.error(e?.message ?? "Could not load article"));
    }
  }, [id, isNew]);

  useEffect(() => {
    const localDraftKey = `tradingle_submission_draft_${id || sessionId}`;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(localDraftKey, JSON.stringify({ form, tagsInput, saved_at: new Date().toISOString() }));
      setDraftStatus("Saved locally");

      if (!isNew && id && form.content.trim()) {
        hostingerApi.saveDraft({ article_id: Number(id), content: form.content })
          .then(() => setDraftStatus(`Autosaved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`))
          .catch(() => setDraftStatus("Local draft saved; server autosave pending"));
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [form, tagsInput, id, isNew, sessionId]);

  const update = (k: keyof typeof form, v: string) =>
    setForm(p => ({ ...p, [k]: k === "excerpt" ? limitWords(v) : v, ...(k === "title" && (isNew || !p.slug) ? { slug: slugify(v) } : {}) }));

  const save = async (submit: boolean) => {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Title required");
    if (wordCount(form.excerpt) > 25) return toast.error("Excerpt must be 25 words or less");
    if (submit && !form.content.trim()) return toast.error("Add some content before submitting");
    setBusy(true);
    const payload: any = {
      id: !isNew && id ? id : undefined,
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      content: form.content,
      featured_image: form.featured_image || null,
      featured_image_alt: form.featured_image_alt || null,
      featured_image_caption: form.featured_image_caption || null,
      image_source: form.image_source || null,
      category_id: form.category_id || null,
      author_id: user.id,
      status: submit ? submitStatus : "draft",
      tags: tagsInput.split(",").map(s => s.trim()).filter(Boolean),
    };
    try {
      await hostingerApi.saveArticle(payload);
      window.localStorage.removeItem(`tradingle_submission_draft_${id || sessionId}`);
      toast.success(submit ? (submitStatus === "pending_review" ? "Submitted for review" : "Saved for editorial intake") : "Draft saved");
      nav("/contributor/articles");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save article");
    } finally {
      setBusy(false);
    }
  };

  const locked = form.status === "pending_review" || form.status === "published";

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => nav("/contributor/articles")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">{draftStatus}</span>
          <Button variant="outline" disabled={busy || locked} onClick={() => save(false)}><Save className="w-4 h-4 mr-1" /> Save draft</Button>
          <Button disabled={busy || locked} onClick={() => save(true)}><Send className="w-4 h-4 mr-1" /> {submitStatus === "pending_review" ? "Submit for review" : "Send to newsroom"}</Button>
        </div>
      </div>

      <h1 className="text-2xl font-bold">{isNew ? "New submission" : "Edit submission"}</h1>
      {form.status === "pending_review" && <p className="text-sm text-muted-foreground">This submission is awaiting editorial review and is locked.</p>}
      {form.status === "published" && <p className="text-sm" style={{ color: "hsl(142 70% 40%)" }}>Published! Points have been credited to your account.</p>}
      {form.status === "rejected" && form.review_notes && (
        <Card className="p-4 border-destructive">
          <div className="text-xs font-semibold text-destructive uppercase tracking-wider">Editor feedback</div>
          <div className="text-sm mt-1">{form.review_notes}</div>
        </Card>
      )}

      <Card className="p-5 space-y-4">
        <div><Label>Title</Label><Input value={form.title} onChange={e => update("title", e.target.value)} disabled={locked} /></div>
        <div>
          <div className="flex items-center justify-between"><Label>Excerpt</Label><span className="text-xs text-muted-foreground">{wordCount(form.excerpt)}/25 words</span></div>
          <Textarea rows={2} value={form.excerpt} onChange={e => update("excerpt", e.target.value)} disabled={locked} placeholder="Short summary, max 25 words" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Category</Label>
            <Select value={form.category_id} onValueChange={v => update("category_id", v)} disabled={locked}>
              <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Tags (comma-separated)</Label><Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="politics, india" disabled={locked} /></div>
        </div>
        <div><Label>Featured image URL</Label><Input value={form.featured_image} onChange={e => update("featured_image", e.target.value)} placeholder="https://..." disabled={locked} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Image alt text</Label><Input value={form.featured_image_alt} onChange={e => update("featured_image_alt", e.target.value)} placeholder="Describe image" disabled={locked} /></div>
          <div><Label>Image source / credit</Label><Input value={form.image_source} onChange={e => update("image_source", e.target.value)} placeholder="Source or photographer" disabled={locked} /></div>
        </div>
        <div><Label>Image caption</Label><Textarea rows={2} value={form.featured_image_caption} onChange={e => update("featured_image_caption", e.target.value)} placeholder="Shown under the article image" disabled={locked} /></div>
        <div><Label>Content</Label>
          <ArticleWritingTools value={form.content} onChange={(value) => update("content", value)} disabled={locked} />
        </div>
      </Card>
    </div>
  );
};

export default SubmitArticle;
