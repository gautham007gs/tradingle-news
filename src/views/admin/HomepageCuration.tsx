import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowDown, ArrowUp, Home, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";

type ArticleOption = {
  id: number;
  title: string;
  slug: string;
  status: string;
  category_name?: string | null;
  published_at?: string | null;
};

const slotLabels: Record<string, { label: string; help: string; max: number }> = {
  hero: { label: "Homepage Hero", help: "Lead story and top homepage package.", max: 13 },
  horizontal_rail: { label: "Top Stories Rail", help: "Fast-scanning story rail near the top.", max: 12 },
  editors_picks: { label: "Editor's Picks", help: "Top editorial recommendations.", max: 3 },
  trending: { label: "Trending/Ticker", help: "Breaking and important links for live surfaces.", max: 12 },
  politics: { label: "Politics", help: "Curated Politics section.", max: 8 },
  india: { label: "India", help: "Curated India section.", max: 8 },
  world: { label: "World", help: "Curated World section.", max: 8 },
  business: { label: "Business", help: "Curated Business section.", max: 8 },
  finance: { label: "Finance", help: "Curated Finance section.", max: 8 },
  technology: { label: "Technology", help: "Curated Technology section.", max: 8 },
  cities: { label: "Cities", help: "Curated Cities section.", max: 8 },
  science: { label: "Science", help: "Curated Science section.", max: 8 },
  entertainment: { label: "Entertainment", help: "Curated Entertainment section.", max: 8 },
  sports: { label: "Sports", help: "Curated Sports section.", max: 8 },
  lifestyle: { label: "Lifestyle", help: "Curated Lifestyle section.", max: 8 },
  opinion: { label: "Opinion", help: "Curated Opinion section on homepage.", max: 8 },
  below_fold: { label: "Below Hero Grid", help: "Lead cards, headline rail, and mini grid under the top stories rail.", max: 18 },
  spotlight: { label: "Spotlight Sidebar", help: "Featured story in the homepage spotlight card.", max: 1 },
  more_for_you: { label: "More For You", help: "Bottom homepage row before the footer.", max: 8 },
};

/* A slot row set can arrive with the same article twice — legacy pins, a
   concurrent save from another editor, or duplicate rows in homepage_slots.
   The UI blocks adding a duplicate but never guarded the loaded payload, so
   React saw two children with the same key and Remove deleted both copies. */
const dedupeById = (rows: ArticleOption[]): ArticleOption[] => {
  const seen = new Set<number>();
  return rows.filter((row) => {
    const id = Number(row.id);
    if (!Number.isFinite(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const HomepageCuration = () => {
  const [articles, setArticles] = useState<ArticleOption[]>([]);
  const [slots, setSlots] = useState<Record<string, ArticleOption[]>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dirtySlots, setDirtySlots] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [articleRes, slotRes] = await Promise.all([
        hostingerApi.articles("?status=published&limit=100"),
        hostingerApi.adminHomepageSlots(),
      ]);
      setArticles(dedupeById((articleRes.data as any[]) ?? []));
      const mapped: Record<string, ArticleOption[]> = {};
      Object.entries(slotRes.data).forEach(([slot, rows]) => {
        if (slot === "top_stories") return;
        mapped[slot] = dedupeById((rows as any[]).map((row) => ({
          id: Number(row.id),
          title: row.title,
          slug: row.slug,
          status: row.status,
          category_name: row.category_name,
          published_at: row.published_at,
        })));
      });
      if (!mapped.horizontal_rail?.length && (slotRes.data as Record<string, unknown>).top_stories) {
        mapped.horizontal_rail = dedupeById(((slotRes.data as any).top_stories as any[]).map((row) => ({
          id: Number(row.id),
          title: row.title,
          slug: row.slug,
          status: row.status,
          category_name: row.category_name,
          published_at: row.published_at,
        })));
      }
      setSlots(mapped);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load homepage curation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Warn when navigating away with unsaved changes
  useEffect(() => {
    if (dirtySlots.size === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtySlots.size]);

  const filteredArticles = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((article) =>
      article.title.toLowerCase().includes(q) ||
      article.slug.toLowerCase().includes(q) ||
      (article.category_name || "").toLowerCase().includes(q)
    );
  }, [articles, filter]);

  const addArticle = (slot: string) => {
    const id = Number(selected[slot]);
    if (!id) return;
    const article = articles.find((item) => Number(item.id) === id);
    if (!article) return;
    const current = slots[slot] || [];
    const max = slotLabels[slot]?.max || 12;
    if (current.some((item) => Number(item.id) === id)) {
      toast.error("That article is already in this slot");
      return;
    }
    if (current.length >= max) {
      toast.error(`This slot allows up to ${max} articles`);
      return;
    }
    setSlots((prev) => ({ ...prev, [slot]: [...current, article] }));
    setSelected((prev) => ({ ...prev, [slot]: "" }));
    setDirtySlots((prev) => new Set([...prev, slot]));
  };

  const removeArticle = (slot: string, id: number) => {
    setSlots((prev) => ({ ...prev, [slot]: (prev[slot] || []).filter((item) => Number(item.id) !== id) }));
    setDirtySlots((prev) => new Set([...prev, slot]));
  };

  const moveArticle = (slot: string, index: number, direction: -1 | 1) => {
    setSlots((prev) => {
      const next = [...(prev[slot] || [])];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, [slot]: next };
    });
    setDirtySlots((prev) => new Set([...prev, slot]));
  };

  const saveSlot = async (slot: string) => {
    setSavingSlot(slot);
    try {
      await hostingerApi.saveHomepageSlot(slot, (slots[slot] || []).map((item) => item.id));
      toast.success(`${slotLabels[slot]?.label || slot} saved`);
      setDirtySlots((prev) => { const n = new Set(prev); n.delete(slot); return n; });
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save slot");
    } finally {
      setSavingSlot(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Home className="w-7 h-7 text-primary" /> Homepage curation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Curate and arrange your best published articles into homepage slots</p>
        </div>
        <div className="w-full sm:w-64">
          <Input 
            value={filter} 
            onChange={(event) => setFilter(event.target.value)} 
            placeholder="Filter articles..."
            className="text-sm"
          />
        </div>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading articles and slots...</Card>
      ) : (
        <>
          <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>📊 {articles.length}</strong> published articles available • <strong>{Object.values(slots).reduce((sum, slot) => sum + slot.length, 0)}</strong> articles curated
            </p>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {Object.entries(slotLabels).map(([slot, meta]) => {
          const rows = slots[slot] || [];
          return (
            <Card key={slot} className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{meta.label}</h2>
                  <p className="text-xs text-muted-foreground">{meta.help}</p>
                </div>
                <Badge variant="secondary">{rows.length}/{meta.max}</Badge>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <Label className="sr-only">Add article</Label>
                  <Select value={selected[slot] || ""} onValueChange={(value) => setSelected((prev) => ({ ...prev, [slot]: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add published article" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredArticles.map((article) => (
                        <SelectItem key={article.id} value={String(article.id)}>
                          {article.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={() => addArticle(slot)}><Plus className="w-4 h-4" /></Button>
              </div>

              <div className="space-y-2 min-h-[80px]">
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-5 text-center border rounded-md">No curated articles yet.</p>
                ) : rows.map((article, index) => (
                  <div key={article.id} className="flex items-center gap-2 rounded-md border p-2">
                    <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{article.title}</p>
                      <p className="text-xs text-muted-foreground truncate">/{article.slug} {article.category_name ? `- ${article.category_name}` : ""}</p>
                    </div>
                    <Button size="icon" variant="ghost" aria-label="Move article up" onClick={() => moveArticle(slot, index, -1)} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Move article down" onClick={() => moveArticle(slot, index, 1)} disabled={index === rows.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Remove article from slot" onClick={() => removeArticle(slot, Number(article.id))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>

              <Button onClick={() => saveSlot(slot)} disabled={savingSlot === slot} variant={dirtySlots.has(slot) ? "default" : "outline"} className="w-full">
                <Save className="w-4 h-4 mr-2" /> {dirtySlots.has(slot) ? `Save ${meta.label} *` : `Save ${meta.label}`}
              </Button>
            </Card>
          );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default HomepageCuration;
