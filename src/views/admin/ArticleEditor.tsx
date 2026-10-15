import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import FieldLabel from "@/components/cms/FieldLabel";
import { toast } from "sonner";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { slugify } from "@/lib/slugify";
import {
  ArrowLeft, Bot, CalendarClock, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Eye, FileText, Globe, History, Image as ImageIcon, Info, Lock, Save,
  Sparkles, Tag, Unlock, X, Zap, PanelRightClose, PanelRightOpen, SlidersHorizontal,
  PenSquare, Activity,
} from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";
import aiAssistant from "@/lib/aiAssistant";
import ArticleWritingTools from "@/components/cms/ArticleWritingTools";
import SEOPanel from "@/components/cms/SEOPanel";
import ArticlePreview from "@/components/cms/ArticlePreview";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { legacyTextToHtml } from "@/lib/contentHtml";
import { articlePath } from "@/lib/articlePaths";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const empty = {
  title: "", subtitle: "", slug: "", excerpt: "", content: "", featured_image: "", featured_image_alt: "",
  featured_image_caption: "", image_source: "", author_id: "",
  comments_enabled: true,
  is_live: false, is_sponsored: false, sponsor_name: "", sponsor_disclosure: "",
  focus_keyword: "", robots_index: true, robots_follow: true, robots_noarchive: false,
  category_id: "", subcategory_id: "", status: "draft" as "draft" | "published" | "scheduled" | "archived" | "pending_review" | "rejected",
  priority: "normal" as "normal" | "top" | "breaking",
  scheduled_at: "", correction_note: "",
  seo_title: "", seo_description: "", seo_og_image: "", canonical_url: "", schema_type: "NewsArticle",
  twitter_card: "summary_large_image", twitter_creator: "",
  content_type: "breaking_news" as string,
  google_news_exclude: false,
  location_country: "", location_state: "", location_city: "",
  evergreen_audit_date: "",
  audience: "general" as string,
  series_id: "",
  published_at: "",
};

const wordCount = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const limitWords = (value: string, max = 25) => value.trim().split(/\s+/).filter(Boolean).slice(0, max).join(" ");
const enabledFlag = (value: unknown) => value !== 0 && value !== false && value !== "0";
const mysqlToDatetimeLocal = (value?: string | null) => value ? value.replace(" ", "T").slice(0, 16) : "";
const datetimeLocalToMysql = (value: string) => value ? value.replace("T", " ") + ":00" : "";
const mysqlNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");

type AiTask = "grammar" | "seo" | "headline" | "excerpt" | "fact_check" | "readability" | "seo_title" | "seo_description" | "plagiarism" | "field" | "paraphrase";
type FieldAiState = Record<string, { task: AiTask; suggestions: string[]; note: string; busy: boolean }>;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_review: "bg-amber-100 text-amber-800 border-amber-200",
  scheduled: "bg-blue-100 text-blue-800 border-blue-200",
  published: "bg-emerald-100 text-emerald-800 border-emerald-200",
  archived: "bg-gray-100 text-gray-600 border-gray-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending Review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
  rejected: "Rejected",
};

const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
  </Tooltip>
);

const Section = ({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon?: any; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-muted/40 transition-colors">
            <div className="flex items-center gap-2.5">
              {Icon && <Icon className="h-4 w-4 text-primary" />}
              <span className="font-semibold text-sm">{title}</span>
            </div>
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-1 space-y-4 border-t">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

const ArticleEditor = () => {
  const { id } = useParams();
  const location = useLocation();
  const isNew = !id || id === "new" || location.pathname.endsWith("/new");
  const nav = useNavigate();
  const { user } = useCmsAuth();
  const [form, setForm] = useState(empty);
  const [tagsInput, setTagsInput] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string; slug?: string; parent_id?: string | null }[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRevision, setPreviewRevision] = useState<any | null>(null);
  const [authors, setAuthors] = useState<{ id: number; display_name: string; email: string }[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [linkSuggestions, setLinkSuggestions] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);
  const [liveTitle, setLiveTitle] = useState("");
  const [liveBody, setLiveBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiTask, setAiTask] = useState<AiTask>("seo");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState("");
  const [fieldAi, setFieldAi] = useState<FieldAiState>({});
  const [lastSelectedText, setLastSelectedText] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metaWarning, setMetaWarning] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState("Not saved yet");
  const [serverDraft, setServerDraft] = useState<{ content: string; updated_at: string } | null>(null);
  // 3-level cascade: level1=category_id (form field), level2/3=local display state
  // form.subcategory_id stores the DEEPEST selected level (level3 if chosen, else level2)
  const [level2Id, setLevel2Id] = useState("");
  const [level3Id, setLevel3Id] = useState("");
  const [seriesList, setSeriesList] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [sessionId] = useState(() => isNew ? `new_${Date.now()}_${Math.random().toString(36).slice(2)}` : null);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [activeTab, setActiveTab] = useState("write");
  const [metaSidebarCollapsed, setMetaSidebarCollapsed] = useState(false);
  const [lockStatus, setLockStatus] = useState<{
    byMe: boolean;
    heldBy?: string;
    heldByAvatar?: string | null;
    expiresAt?: string;
  } | null>(null);

  // ── Unsaved-changes guard ─────────────────────────────────────────
  // Baseline snapshots are captured ONLY at programmatic points (article load,
  // defaults applied, successful save). Any user-driven edit afterwards makes
  // the editor "dirty" and the browser warns before losing work.
  const [dirtyBaselineTick, setDirtyBaselineTick] = useState(0);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify({ form: empty, tagsInput: "" }));
  const isDirty = useMemo(
    () => JSON.stringify({ form, tagsInput }) !== savedSnapshot,
    [form, tagsInput, savedSnapshot]
  );
  const markCleanNow = () => setDirtyBaselineTick((v) => v + 1);
  useEffect(() => {
    setSavedSnapshot(JSON.stringify({ form, tagsInput }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- baseline deliberately captured after programmatic form updates
  }, [dirtyBaselineTick]);
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);


  useEffect(() => {
    const localDraftKey = `tradingle_article_draft_${id || sessionId}`;
    if (isNew) {
      const cached = window.localStorage.getItem(localDraftKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setForm((prev) => ({ ...prev, ...parsed.form }));
          setTagsInput(parsed.tagsInput || "");
          setDraftStatus("Recovered local draft");
          markCleanNow(); // recovery is programmatic — editor starts clean
        } catch {
          window.localStorage.removeItem(localDraftKey);
        }
      } else {
        // Issue #118: If no local draft exists, check for server-side autosaved draft
        hostingerApi.loadDraft(0)
          .then((draftRes) => {
            if (draftRes.data && draftRes.data.content && draftRes.data.content.trim()) {
              setServerDraft(draftRes.data);
            }
          })
          .catch(() => {});
      }
    }

    hostingerApi.categories()
      .then(({ data }) => {
        setCategories(data.map((c: any) => ({ id: String(c.id), name: c.name, slug: c.slug, parent_id: c.parent_id ? String(c.parent_id) : null })));
        setMetaWarning(null);
      })
      .catch(() => {
        setCategories([]);
        setMetaWarning("Categories could not be loaded. You can still draft and save the article.");
      });

    hostingerApi.authors()
      .then(({ data }) => {
        setAuthors(data.map((a: any) => ({ id: a.id, display_name: a.display_name, email: a.email })));
      })
      .catch(() => {
        setAuthors([]);
      });

    hostingerApi.tags()
      .then(({ data }) => setAllTags(data ?? []))
      .catch(() => setAllTags([]));

    hostingerApi.seriesList()
      .then(({ data }) => setSeriesList((data ?? []).map((s: any) => ({ id: String(s.id), name: s.name, slug: s.slug }))))
      .catch(() => setSeriesList([]));

    if (isNew) {
      hostingerApi.adminSiteSettings()
        .then(({ settings }) => {
          if (settings.default_article_status) {
            setForm((prev) => ({ ...prev, status: settings.default_article_status as any }));
            markCleanNow(); // default status is programmatic, not a user edit
          }
        })
        .catch(() => {});
    }

    if (!isNew && id) {
      hostingerApi.articleById(id)
        .then(({ data }) => {
          setForm({
            ...empty,
            ...data,
            content: legacyTextToHtml(data.content ?? ""),
            featured_image: data.featured_image ?? "",
            featured_image_alt: data.featured_image_alt ?? "",
            featured_image_caption: data.featured_image_caption ?? "",
            image_source: data.image_source ?? "",
            comments_enabled: enabledFlag(data.comments_enabled),
            is_live: enabledFlag(data.is_live),
            is_sponsored: enabledFlag(data.is_sponsored),
            sponsor_name: data.sponsor_name ?? "",
            sponsor_disclosure: data.sponsor_disclosure ?? "",
            priority: (data.priority as any) ?? "normal",
            scheduled_at: mysqlToDatetimeLocal(data.scheduled_at),
            correction_note: data.correction_note ?? "",
            author_id: data.author_id ? String(data.author_id) : "",
            category_id: data.category_id ? String(data.category_id) : "",
            subcategory_id: (data as any).subcategory_id ? String((data as any).subcategory_id) : "",
            seo_title: data.seo_title ?? "",
            seo_description: data.seo_description ?? "",
            focus_keyword: data.focus_keyword ?? "",
            seo_og_image: data.seo_og_image ?? "",
            canonical_url: data.canonical_url ?? "",
            schema_type: data.schema_type ?? "NewsArticle",
            robots_index: enabledFlag(data.robots_index ?? true),
            robots_follow: enabledFlag(data.robots_follow ?? true),
            robots_noarchive: enabledFlag((data as any).robots_noarchive ?? false),
            content_type: (data as any).content_type ?? "breaking_news",
            google_news_exclude: enabledFlag((data as any).google_news_exclude ?? false),
            location_country: (data as any).location_country ?? "",
            location_state: (data as any).location_state ?? "",
            location_city: (data as any).location_city ?? "",
            evergreen_audit_date: (data as any).evergreen_audit_date ?? "",
            subtitle: (data as any).subtitle ?? "",
            audience: (data as any).audience ?? "general",
            series_id: (data as any).series_id ? String((data as any).series_id) : "",
            published_at: data.published_at ?? "",
          } as any);
          setTagsInput((data.tags ?? []).map((t: any) => t.name).join(", "));
          // level2/level3 resolution happens in a separate useEffect once categories load
          hostingerApi.articleRevisions(id).then((res) => setRevisions(res.data ?? [])).catch(() => setRevisions([]));
          hostingerApi.liveUpdates({ article_id: id }).then((res) => setLiveUpdates(res.data ?? [])).catch(() => setLiveUpdates([]));
          
          // Issue #118: Check for newer server-side autosaved draft
          hostingerApi.loadDraft(Number(id))
            .then((draftRes) => {
              if (draftRes.data && draftRes.data.content && draftRes.data.content.trim()) {
                if (legacyTextToHtml(draftRes.data.content) !== legacyTextToHtml(data.content ?? "")) {
                  setServerDraft(draftRes.data);
                }
              }
            })
            .catch(() => {});

          setLoadError(null);
          markCleanNow(); // freshly loaded article = clean baseline
        })
        .catch((e: any) => {
          setLoadError(`Failed to load article: ${e?.message ?? 'Unknown error'}`);
          toast.error(e?.message ?? "Could not load article");
        });
    }
  }, [id, isNew]);

  useEffect(() => {
    const localDraftKey = `tradingle_article_draft_${id || sessionId}`;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(localDraftKey, JSON.stringify({ form, tagsInput, saved_at: new Date().toISOString() }));
      setDraftStatus("Saved locally");

      if (!isNew && form.content.trim()) {
        hostingerApi.saveDraft({ article_id: Number(id), content: form.content })
          .then(() => setDraftStatus(`Autosaved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`))
          .catch(() => setDraftStatus("Local draft saved; server autosave pending"));
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [form, tagsInput, id, isNew, sessionId]);

  // ── Document locking heartbeat ────────────────────────────────────
  useEffect(() => {
    if (isNew || !id) return;


    const acquireLock = () => {
      hostingerApi.lockArticle(id)
        .then((res) => {
          if (res.by_me) {
            setLockStatus({ byMe: true });
          } else {
            setLockStatus({
              byMe: false,
              heldBy: res.held_by,
              heldByAvatar: res.held_by_avatar,
              expiresAt: res.expires_at,
            });
          }
        })
        .catch(() => {
          // Lock check failed — clear status, allow editing
          setLockStatus(null);
        });
    };

    // Acquire immediately, then renew every 30 s
    acquireLock();
    const intervalId = setInterval(acquireLock, 30_000);

    // Release lock on tab close / navigation away
    const release = () => {
      hostingerApi.releaseLock(id);
    };
    window.addEventListener("beforeunload", release);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("beforeunload", release);
      hostingerApi.releaseLock(id);
    };
  }, [id, isNew]);

  const update = (k: keyof typeof form, v: string) =>
    setForm(p => {
      const nextValue = k === "excerpt" ? limitWords(v) : v;
      const shouldRefreshSlug = k === "title" && (isNew || !p.slug || p.slug === slugify(p.title));
      return {
        ...p,
        [k]: nextValue,
        ...(shouldRefreshSlug ? { slug: slugify(v) } : {}),
      };
    });

  const tagList = tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean);

  const CATEGORY_TAG_BANK: Record<string, string[]> = {
    finance: ["markets", "stocks", "economy", "investing", "trading", "mutual-funds", "sensex", "nifty", "rbi", "inflation"],
    business: ["startup", "earnings", "ipo", "merger", "acquisition", "corporate", "industry", "gdp", "revenue"],
    technology: ["ai", "software", "startup", "gadgets", "cybersecurity", "cloud", "smartphone", "innovation", "data"],
    politics: ["government", "elections", "parliament", "policy", "democracy", "legislation", "minister", "party"],
    india: ["india", "modi", "delhi", "supreme-court", "lok-sabha", "bjp", "congress", "state-government"],
    world: ["international", "geopolitics", "us", "china", "europe", "ukraine", "united-nations", "global"],
    sports: ["cricket", "football", "ipl", "bcci", "olympics", "fifa", "athletes", "tournament", "championship"],
    entertainment: ["bollywood", "movies", "ott", "music", "celebrity", "awards", "streaming", "box-office"],
    science: ["research", "space", "isro", "nasa", "climate", "health", "medicine", "environment", "biology"],
    lifestyle: ["wellness", "fitness", "food", "travel", "fashion", "relationships", "mental-health", "diet"],
    opinion: ["editorial", "analysis", "commentary", "perspective", "opinion", "debate"],
    cities: ["mumbai", "delhi", "bangalore", "chennai", "hyderabad", "pune", "kolkata", "urban"],
    education: ["schools", "university", "neet", "jee", "exams", "students", "curriculum", "upsc"],
  };

  // Resolve cascade levels from DB value once categories are available (handles editing existing articles)
  useEffect(() => {
    if (!categories.length || !form.subcategory_id || level2Id || level3Id) return;
    const sub = form.subcategory_id;
    const subCat = categories.find((c) => c.id === sub);
    if (!subCat) return;
    if (subCat.parent_id === form.category_id) {
      // subcategory_id is a direct child of primary → it's level 2
      setLevel2Id(sub);
      setLevel3Id("");
    } else if (subCat.parent_id) {
      // subcategory_id is a grandchild → parent is level 2, sub is level 3
      setLevel2Id(subCat.parent_id);
      setLevel3Id(sub);
    }
  }, [form.subcategory_id, form.category_id, categories, level2Id, level3Id]);

  // Cascade option lists
  const level2Options = form.category_id ? categories.filter((c) => c.parent_id === form.category_id) : [];
  const level3Options = level2Id ? categories.filter((c) => c.parent_id === level2Id) : [];

  // Cascade change handlers — each level resets levels below it
  const handleLevel1Change = (v: string) => {
    update("category_id", v);
    update("subcategory_id", "");
    setLevel2Id("");
    setLevel3Id("");
  };
  const handleLevel2Change = (v: string) => {
    const val = v === "__none__" ? "" : v;
    setLevel2Id(val);
    setLevel3Id("");
    update("subcategory_id", val || "");
  };
  const handleLevel3Change = (v: string) => {
    const val = v === "__none__" ? "" : v;
    setLevel3Id(val);
    update("subcategory_id", val || level2Id || "");
  };

  const categoryName = form.category_id ? (categories.find((c) => c.id === form.category_id)?.name || "").toLowerCase() : "";
  const categoryTags = Object.entries(CATEGORY_TAG_BANK).find(([key]) => categoryName.includes(key))?.[1] ?? [];

  // The article's own category set, expanded with the immediate parent/children so a
  // tag scoped to "Finance" still matches "Finance > Markets" on either side.
  const activeCategoryIds = (() => {
    const ids = new Set<string>();
    if (form.category_id) ids.add(form.category_id);
    if (level2Id) ids.add(level2Id);
    if (level3Id) ids.add(level3Id);
    if (form.subcategory_id) ids.add(form.subcategory_id);
    Array.from(ids).forEach((cid) => {
      const cat = categories.find((c) => c.id === cid);
      if (cat?.parent_id) ids.add(cat.parent_id);
      categories.filter((c) => c.parent_id === cid).forEach((c) => ids.add(c.id));
    });
    return ids;
  })();

  // Best-effort client-side check mirroring the server's authoritative validation in
  // articles/save.php — lets us warn immediately instead of only after a failed save.
  const findTagRelevanceViolation = (tagName: string): { allowed: string[] } | null => {
    const match = allTags.find((t: any) => String(t.name).toLowerCase() === tagName.toLowerCase() || String(t.slug).toLowerCase() === slugify(tagName));
    if (!match) return null; // brand-new tag — will be auto-scoped to this category on save
    const restrictedTo: string[] = (match.category_ids ?? []).map((id: any) => String(id));
    if (restrictedTo.length === 0) return null; // global tag
    if (activeCategoryIds.size === 0) return null; // no category chosen yet — nothing to conflict with
    const overlaps = restrictedTo.some((cid) => activeCategoryIds.has(cid));
    if (overlaps) return null;
    return { allowed: match.category_names ?? [] };
  };

  const suggestedTags = Array.from(
    new Set([
      ...(form.focus_keyword ? [form.focus_keyword.trim().toLowerCase()] : []),
      ...categoryTags,
      ...(categoryName ? [categoryName] : []),
    ].filter(Boolean))
  )
    .filter((tag) => !tagList.map(t => t.toLowerCase()).includes(tag.toLowerCase()))
    .filter((tag) => !findTagRelevanceViolation(tag))
    .slice(0, 8);

  const addTag = (tag: string) => {
    const additions = tag.split(",").map((item) => item.trim()).filter(Boolean);
    if (additions.length === 0) return;
    const blocked: string[] = [];
    const accepted: string[] = [];
    additions.forEach((addition) => {
      const violation = findTagRelevanceViolation(addition);
      if (violation) {
        blocked.push(`"${addition}" (only allowed under: ${violation.allowed.join(", ") || "no categories"})`);
      } else {
        accepted.push(addition);
      }
    });
    if (blocked.length) {
      toast.error(`Not relevant to the selected category: ${blocked.join(", ")}`);
    }
    if (accepted.length === 0) return;
    const next = Array.from(new Set([...tagList, ...accepted]));
    setTagsInput(next.join(", "));
    setTagQuery("");
  };

  const removeTag = (tag: string) => setTagsInput(tagList.filter((item) => item !== tag).join(", "));

  const getSubcategories = () => {
    if (!form.category_id) return [];
    return categories.filter((c) => c.parent_id === form.category_id);
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (tagQuery.trim()) addTag(tagQuery);
    }
  };

  useEffect(() => {
    const query = form.focus_keyword || tagsInput.split(",")[0]?.trim() || "";
    if (query.length < 3) { setLinkSuggestions([]); return; }
    const timer = window.setTimeout(() => {
      hostingerApi.articles(`?q=${encodeURIComponent(query)}&limit=5`)
        .then(({ data }) => setLinkSuggestions(data.filter((item: any) => String(item.id) !== String(id || ""))))
        .catch(() => setLinkSuggestions([]));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [form.focus_keyword, tagsInput, id]);

  const restoreRevision = (rev: any) => {
    if (!window.confirm(`Load the ${new Date(rev.created_at).toLocaleString()} version into the editor? This replaces the current title, excerpt, and content in the form below — nothing is saved until you click Save draft or Publish.`)) return;
    setForm((p) => ({
      ...p,
      title: rev.title ?? p.title,
      excerpt: rev.excerpt ?? p.excerpt,
      content: rev.content ?? p.content,
    }));
    setPreviewRevision(null);
    setPreviewOpen(false);
    toast.success("Revision loaded into the editor — review and save when ready");
  };

  const save = async (statusOverride?: string) => {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Title required");
    if (wordCount(form.excerpt) > 25) return toast.error("Excerpt must be 25 words or less");
    const targetStatus = statusOverride ?? form.status;
    if (targetStatus === "scheduled" && !form.scheduled_at) return toast.error("Choose a schedule date and time");
    const isPublishing = targetStatus === "published";
    if (isPublishing) {
      if (!form.seo_description.trim()) return toast.error("Add an SEO meta description before publishing");
      if (!form.featured_image_alt.trim()) return toast.error("Add featured image alt text before publishing");
      if (!form.author_id && !user.id) return toast.error("Assign an author before publishing");
    }
    setBusy(true);
    const payload: any = {
      id: isNew ? undefined : id,
      ...form,
      slug: form.slug || slugify(form.title),
      author_id: form.author_id || user.id,
      category_id: form.category_id || null,
      // subcategory_id = deepest selected level (level3 if chosen, else level2, else null)
      subcategory_id: level3Id || level2Id || null,
      status: targetStatus,
      // Preserve original publish date when editing an already-published article.
      // Only stamp a new date when first transitioning to "published".
      published_at: isPublishing && !form.published_at
        ? mysqlNow()
        : (isPublishing || form.status === "published")
          ? (form.published_at || mysqlNow())
          : null,
      scheduled_at: targetStatus === "scheduled" ? datetimeLocalToMysql(form.scheduled_at) : null,
      tags: tagsInput.split(",").map(s => s.trim()).filter(Boolean),
    };
    try {
      const saved = await hostingerApi.saveArticle(payload);
      markCleanNow(); // successful save = new clean baseline
      window.localStorage.removeItem(`tradingle_article_draft_${id || sessionId}`);
      setDraftStatus(isPublishing ? "Published" : targetStatus === "scheduled" ? "Scheduled" : "Saved");
      toast.success(
        isPublishing ? "Article published successfully!" :
        targetStatus === "scheduled" ? `Scheduled for ${new Date(form.scheduled_at).toLocaleString()}` :
        targetStatus === "pending_review" ? "Submitted for review" :
        "Article saved"
      );
      hostingerApi.cmsRevalidate({
        articleSlug: saved.slug || (payload.slug as string),
        tags: isPublishing ? ["home", "latest"] : undefined,
      });
      nav("/admin/articles");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save article");
    } finally {
      setBusy(false);
    }
  };

  const seoChecks = [
    { label: "Title is 45-70 characters", ok: form.title.length >= 45 && form.title.length <= 70 },
    { label: "Excerpt ≤ 25 words", ok: wordCount(form.excerpt) > 0 && wordCount(form.excerpt) <= 25 },
    { label: "SEO description 120-160 chars", ok: form.seo_description.length >= 120 && form.seo_description.length <= 160 },
    { label: "Slug is short and readable", ok: form.slug.length > 0 && form.slug.length <= 75 && !form.slug.includes("_") },
    { label: "Featured image has alt text", ok: Boolean(form.featured_image_alt.trim()) },
    { label: "At least one tag", ok: tagsInput.split(",").some((tag) => tag.trim()) },
    { label: "Focus keyword in title", ok: Boolean(form.focus_keyword && form.title.toLowerCase().includes(form.focus_keyword.toLowerCase())) },
    { label: "Focus keyword in description", ok: Boolean(form.focus_keyword && form.seo_description.toLowerCase().includes(form.focus_keyword.toLowerCase())) },
    { label: "Image caption and source set", ok: Boolean(form.featured_image_caption.trim() && form.image_source.trim()) },
  ];
  const seoScore = Math.round((seoChecks.filter((check) => check.ok).length / seoChecks.length) * 100);

  const generateSeo = () => {
    setForm((prev) => ({
      ...prev,
      seo_title: prev.seo_title || prev.title.slice(0, 70),
      seo_description: prev.seo_description || (prev.excerpt || prev.title).slice(0, 160),
      seo_og_image: prev.seo_og_image || prev.featured_image,
    }));
    toast.success("SEO fields auto-filled");
  };

  const addLiveUpdate = async () => {
    if (!id || isNew || !liveBody.trim()) return toast.error("Write the live update body first");
    try {
      await hostingerApi.saveLiveUpdate({ article_id: id, update_title: liveTitle.trim(), update_body: liveBody.trim() });
      setLiveTitle(""); setLiveBody("");
      const { data } = await hostingerApi.liveUpdates({ article_id: id });
      setLiveUpdates(data ?? []);
      toast.success("Live update added");
    } catch (error: any) {
      toast.error(error?.message || "Could not add live update");
    }
  };

  const canonicalOk = !form.canonical_url || /^https?:\/\/.+/i.test(form.canonical_url);

  const runAiAssist = async (taskOverride?: AiTask, field?: string, selectedText?: string) => {
    const task = taskOverride || aiTask;
    setAiTask(task);
    setAiBusy(true);
    setAiNote("");
    if (field) {
      setFieldAi((prev) => ({ ...prev, [field]: { task, suggestions: [], note: "", busy: true } }));
    }
    try {
      let res: { suggestions: string[]; note?: string } | null = null;
      if (task === "plagiarism") {
        const feedback = await aiAssistant.getPlagiarismGuidance({ title: form.title, excerpt: form.excerpt, content: form.content, focus_keyword: form.focus_keyword });
        res = { suggestions: feedback.suggestions, note: "Local plagiarism guidance. Verify originality and cite sources." };
      } else {
        try {
          const apiRes = await hostingerApi.aiAssist({ task, title: form.title, excerpt: form.excerpt, content: form.content, focus_keyword: form.focus_keyword, field, selected_text: selectedText });
          res = {
            suggestions: apiRes.suggestions ?? [],
            note: apiRes.note || (apiRes.mode === "local" ? "Local guidance. Add AI provider keys for live suggestions." : `Suggestions from ${apiRes.provider || "AI"}${apiRes.model ? ` (${apiRes.model})` : ""}.`),
          };
        } catch {
          const fallback = await (async () => {
            switch (task) {
              case "seo": return aiAssistant.getSeoAssistance({ title: form.title, excerpt: form.excerpt, seo_title: form.seo_title, seo_description: form.seo_description, content: form.content, featured_image: form.featured_image, focus_keyword: form.focus_keyword });
              case "grammar": case "readability": return aiAssistant.getReadabilityAnalysis(form.content);
              case "headline": return aiAssistant.getHeadlineSuggestions({ content: form.content, excerpt: form.excerpt });
              case "excerpt": return aiAssistant.getExcerptSuggestions({ title: form.title, content: form.content });
              case "fact_check": return aiAssistant.getFactCheckReminders({ title: form.title, content: form.content });
              case "seo_title": return aiAssistant.getHeadlineSuggestions({ content: form.content, excerpt: form.excerpt }, 5);
              case "seo_description": return aiAssistant.getExcerptSuggestions({ title: form.title, content: form.content }, 5);
              default: return aiAssistant.getSeoAssistance({ title: form.title, excerpt: form.excerpt, seo_title: form.seo_title, seo_description: form.seo_description, content: form.content, featured_image: form.featured_image, focus_keyword: form.focus_keyword });
            }
          })();
          if (!field) { setAiSuggestions(fallback.suggestions); setAiNote("Remote AI unavailable — using local guidance."); }
          if (field) setFieldAi((prev) => ({ ...prev, [field]: { task, suggestions: fallback.suggestions, note: "Remote AI unavailable — using local guidance.", busy: false } }));
          setAiBusy(false);
          return;
        }
      }
      if (res) {
        if (!field) { setAiSuggestions(res.suggestions ?? []); setAiNote(res.note || "Done."); }
        if (field) setFieldAi((prev) => ({ ...prev, [field]: { task, suggestions: res?.suggestions ?? [], note: res?.note || "Suggestions ready.", busy: false } }));
      }
    } catch (error: any) {
      toast.error(error?.message || "AI assist failed.");
    } finally {
      setAiBusy(false);
      if (field) setFieldAi((prev) => ({ ...prev, [field]: { ...(prev[field] || { task, suggestions: [], note: "" }), busy: false } }));
    }
  };

  const cleanAiSuggestion = (suggestion: string) =>
    suggestion.replace(/^\s*[-*\d.)]+\s*/, "").replace(/^["']+|["']+$/g, "").replace(/\*\*/g, "").replace(/^(option|headline|excerpt|seo title|description)\s*\d*\s*[:.-]\s*/i, "").trim();

  const applyAiSuggestion = (suggestion: string, targetTask = aiTask, targetField?: string) => {
    const clean = cleanAiSuggestion(suggestion);
    if (!clean) return;
    if (targetTask === "headline" || targetTask === "seo_title" || targetField === "title" || targetField === "seo_title") {
      update(targetField === "seo_title" || targetTask === "seo_title" ? "seo_title" : "title", clean);
      toast.success(targetField === "seo_title" || targetTask === "seo_title" ? "SEO title updated" : "Headline updated");
    } else if (targetTask === "excerpt" || targetTask === "seo_description" || targetField === "excerpt" || targetField === "seo_description") {
      update(targetField === "seo_description" || targetTask === "seo_description" ? "seo_description" : "excerpt", clean);
      toast.success(targetField === "seo_description" || targetTask === "seo_description" ? "SEO description updated" : "Excerpt updated");
    } else if (targetField === "content" || targetTask === "paraphrase") {
      if (lastSelectedText && form.content.includes(lastSelectedText)) {
        update("content", form.content.replace(lastSelectedText, clean));
      } else {
        update("content", `${form.content}<p>${clean}</p>`);
      }
      toast.success("Content updated");
    }
  };

  const runParaphrase = () => {
    const selected = window.getSelection()?.toString().trim() || "";
    setLastSelectedText(selected);
    if (!selected) { toast.error("Select text in the editor first."); return; }
    runAiAssist("paraphrase", "content", selected);
  };

  const FieldAiBox = ({ field }: { field: string }) => {
    const state = fieldAi[field];
    if (!state?.busy && !state?.suggestions?.length && !state?.note) return null;
    return (
      <div className="mt-2 rounded-md border bg-primary/5 p-3">
        {state.busy ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3 animate-pulse" /> AI is thinking...</p>
        ) : (
          <>
            {state.note && <p className="mb-2 text-xs text-muted-foreground">{state.note}</p>}
            <div className="space-y-2">
              {state.suggestions.map((suggestion, index) => (
                <div key={`${field}-${index}`} className="flex items-start gap-2 text-xs leading-relaxed">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="flex-1 whitespace-pre-wrap">{suggestion}</span>
                  {["headline", "excerpt", "seo_title", "seo_description", "paraphrase", "field"].includes(state.task) && (
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => applyAiSuggestion(suggestion, state.task, field)}>Use</Button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (!user) return <div className="p-8 text-center">Not authenticated</div>;

  if (loadError) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive bg-destructive/5 p-4">
          <h2 className="font-bold text-destructive">Error loading article</h2>
          <p className="text-sm text-destructive/80 mt-2">{loadError}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-destructive text-white rounded text-sm">Reload Page</button>
        </div>
      </div>
    );
  }

  const subcategories = getSubcategories();
  const primaryCategory = categories.find((c) => c.id === form.category_id);
  const previewAuthorName = authors.find((a) => String(a.id) === String(form.author_id))?.display_name || user?.display_name || "";
  const previewReadTime = Math.max(1, Math.round(form.content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length / 200));

  return (
    <div className="mx-auto w-full max-w-screen-xl">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b -mx-4 sm:-mx-6 lg:-mx-8 mb-6">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={() => nav("/admin/articles")} className="flex-shrink-0">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold truncate text-muted-foreground">{isNew ? "New article" : (form.title || "Untitled article")}</span>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[form.status] || STATUS_COLORS.draft}`}>
                {STATUS_LABELS[form.status] || form.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground border rounded px-2 py-1">
              <Clock className="h-3 w-3" /> {draftStatus}
              {isDirty && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-amber-500" title="Unsaved changes" aria-hidden="true" />}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Preview
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => save("draft")}>
              <Save className="w-3.5 h-3.5 mr-1" /> Save draft
            </Button>
            {form.status !== "published" && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => save("pending_review")}>
                Submit for review
              </Button>
            )}
            <Button size="sm" disabled={busy} onClick={() => save("published")}>
              {busy ? "Saving..." : form.status === "published" ? "Update" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {metaWarning && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Info className="h-4 w-4 flex-shrink-0" /> {metaWarning}
        </div>
      )}

      {/* Document lock banner */}
      {lockStatus && !lockStatus.byMe && (
        <div className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">
              {lockStatus.heldBy || "Another editor"} is currently editing this article
            </p>
            <p className="mt-0.5 text-xs text-red-700 opacity-80">
              Saving now may overwrite their changes. The lock releases automatically if they close the editor.
            </p>
          </div>
        </div>
      )}
      {lockStatus?.byMe && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800">
          <Unlock className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
          Editing lock active — other editors will see you are working on this article
        </div>
      )}

      {/* Issue #118: Server-side draft recovery banner */}
      {serverDraft && serverDraft.content && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <div className="flex-1">
            <h4 className="font-semibold text-amber-950">Autosaved Draft Found</h4>
            <p className="mt-0.5 text-xs text-amber-900/80">
              There is an autosaved version of this article from the server (saved on {new Date(serverDraft.updated_at.replace(" ", "T") + (serverDraft.updated_at.includes("T") ? "" : "Z")).toLocaleString()}).
            </p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto flex-shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setForm((prev) => ({ ...prev, content: legacyTextToHtml(serverDraft.content) }));
                setDraftStatus("Restored server draft");
                setServerDraft(null);
                toast.success("Draft content restored to editor.");
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
            >
              Restore Draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setServerDraft(null)}
              className="border-amber-200 text-amber-900 hover:bg-amber-100/50 text-xs h-8"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className={`grid grid-cols-1 gap-6 ${metaSidebarCollapsed ? "" : "xl:grid-cols-[minmax(0,1fr)_340px]"}`}>
        {/* LEFT: Main content */}
        <div className="min-w-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center justify-between gap-2 mb-4">
              <TabsList className="flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="write" className="gap-1.5"><PenSquare className="h-3.5 w-3.5" /> Write</TabsTrigger>
                <TabsTrigger value="seo" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> SEO</TabsTrigger>
                <TabsTrigger value="settings" className="gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" /> Settings</TabsTrigger>
                <TabsTrigger value="ai" className="gap-1.5"><Bot className="h-3.5 w-3.5" /> AI Assist</TabsTrigger>
                {!isNew && <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Activity</TabsTrigger>}
              </TabsList>
              <Tip label={metaSidebarCollapsed ? "Show publish & metadata panel" : "Hide publish & metadata panel for a wider editor"}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="hidden lg:flex h-9 w-9 flex-shrink-0"
                  aria-label={metaSidebarCollapsed ? "Show metadata panel" : "Hide metadata panel"}
                    onClick={() => setMetaSidebarCollapsed((v) => !v)}
                >
                  {metaSidebarCollapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
                </Button>
              </Tip>
            </div>

            {/* WRITE TAB */}
            <TabsContent value="write" className="space-y-5 mt-0">
          {/* Title + Subtitle + Slug */}
          <Card className="p-5 space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="text-sm font-semibold">Headline</label>
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${form.title.length >= 45 && form.title.length <= 70 ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>
                    {form.title.length}/70
                  </span>
                  <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => runAiAssist("headline", "title", form.title || form.content)} disabled={aiBusy || !(form.title.trim() || form.content.trim())}>
                    <Sparkles className="mr-1 h-3 w-3" /> AI
                  </Button>
                </div>
              </div>
              <Input
                value={form.title}
                onChange={e => update("title", e.target.value)}
                placeholder="Write a clear, specific headline..."
                className="text-base font-medium h-11"
              />
              <FieldAiBox field="title" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Subtitle / Deck <span className="font-normal opacity-60">(optional)</span></label>
              <Input
                value={(form as any).subtitle || ""}
                onChange={e => update("subtitle" as any, e.target.value)}
                placeholder="A supporting line below the headline…"
                className="mt-1.5 h-9 text-sm"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-muted-foreground">URL Slug</label>
                <span className="text-xs text-muted-foreground">{form.slug.length} chars</span>
              </div>
              <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="opacity-60">tradingle.com/{primaryCategory?.slug || "…"}/</span>
                <input
                  value={form.slug}
                  onChange={e => update("slug", slugify(e.target.value))}
                  className="flex-1 bg-transparent text-foreground outline-none font-mono"
                  placeholder="auto-generated-slug"
                />
              </div>
            </div>
          </Card>

          {/* Excerpt */}
          <Card className="p-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-semibold">Excerpt / Summary</label>
                <p className="text-xs text-muted-foreground mt-0.5">Used in article cards, social previews, and meta description fallback</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs ${wordCount(form.excerpt) > 25 ? "text-destructive" : wordCount(form.excerpt) > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {wordCount(form.excerpt)}/25 words
                </span>
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => runAiAssist("excerpt", "excerpt", form.excerpt || form.content)} disabled={aiBusy || !(form.title.trim() || form.content.trim())}>
                  <Sparkles className="mr-1 h-3 w-3" /> AI
                </Button>
              </div>
            </div>
            <Textarea rows={2} value={form.excerpt} onChange={e => update("excerpt", e.target.value)} placeholder="Brief summary for cards and previews, max 25 words..." />
            <FieldAiBox field="excerpt" />
          </Card>

          {/* Content editor */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Article Content</label>
              <div className="flex items-center gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={runParaphrase} disabled={aiBusy || !form.content.trim()}>
                  <Sparkles className="mr-1 h-3 w-3" /> Paraphrase
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => runAiAssist("readability", "content", form.content)} disabled={aiBusy || !form.content.trim()}>
                  <Sparkles className="mr-1 h-3 w-3" /> Readability
                </Button>
              </div>
            </div>
            <ArticleWritingTools value={form.content} onChange={(value) => update("content", value)} disabled={aiBusy} />
            <FieldAiBox field="content" />
          </Card>
            </TabsContent>

            {/* SEO TAB */}
            <TabsContent value="seo" className="space-y-5 mt-0">
          {/* SEO Panel */}
          <SEOPanel
            article={{
              ...form,
              category: form.category_id ? categories.find(c => c.id === form.category_id)?.name || "" : "",
              tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
              author: authors.find(a => String(a.id) === form.author_id)?.display_name || "Article Author",
            }}
            onTitleChange={(title) => update("seo_title", title)}
            onExcerptChange={(excerpt) => update("seo_description", excerpt)}
            onSlugChange={(slug) => update("slug", slug)}
            onRobotsIndexChange={(checked) => setForm(p => ({ ...p, robots_index: checked }))}
            onRobotsFollowChange={(checked) => setForm(p => ({ ...p, robots_follow: checked }))}
          />

          {/* Advanced SEO */}
          <Section title="Advanced SEO" icon={Globe} defaultOpen={false}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${seoScore >= 80 ? "bg-emerald-100 text-emerald-800" : seoScore >= 60 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                  SEO {seoScore}/100
                </span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={generateSeo}>Auto-fill SEO fields</Button>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {seoChecks.map((check) => (
                <div key={check.label} className={`flex items-center gap-1.5 text-xs ${check.ok ? "text-emerald-700" : "text-muted-foreground"}`}>
                  <CheckCircle2 className={`h-3 w-3 flex-shrink-0 ${check.ok ? "text-emerald-500" : "text-muted-foreground/50"}`} />
                  {check.label}
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <FieldLabel help="Search result headline. Aim for 50–60 characters.">SEO title</FieldLabel>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${form.seo_title.length >= 50 && form.seo_title.length <= 60 ? "text-emerald-600" : "text-muted-foreground"}`}>{form.seo_title.length}/60</span>
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => runAiAssist("seo_title", "seo_title", form.seo_title || form.title)} disabled={aiBusy || !form.title.trim()}><Sparkles className="h-3 w-3" /></Button>
                  </div>
                </div>
                <Input value={form.seo_title} onChange={e => update("seo_title", e.target.value)} placeholder={form.title || "SEO title"} maxLength={70} />
                <FieldAiBox field="seo_title" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <FieldLabel help="Search and social summary. 120–160 characters.">SEO description</FieldLabel>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs ${form.seo_description.length >= 120 && form.seo_description.length <= 160 ? "text-emerald-600" : "text-muted-foreground"}`}>{form.seo_description.length}/160</span>
                    <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => runAiAssist("seo_description", "seo_description", form.seo_description || form.excerpt)} disabled={aiBusy || !(form.excerpt.trim() || form.content.trim())}><Sparkles className="h-3 w-3" /></Button>
                  </div>
                </div>
                <Textarea rows={3} value={form.seo_description} onChange={e => update("seo_description", e.target.value)} maxLength={180} />
                <FieldAiBox field="seo_description" />
              </div>
              <div>
                <FieldLabel help="Canonical URL for syndicated or duplicate content. Leave blank for originals.">Canonical URL</FieldLabel>
                <Input value={form.canonical_url} onChange={e => update("canonical_url", e.target.value)} placeholder="https://..." />
                {!canonicalOk && <p className="text-xs text-destructive mt-1">Must be a valid URL.</p>}
              </div>
              <div>
                <FieldLabel help="Open Graph image for social shares. Defaults to featured image.">OG image URL</FieldLabel>
                <Input value={form.seo_og_image} onChange={e => update("seo_og_image", e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <FieldLabel help="Twitter card type: summary_large_image is recommended for news articles.">Twitter card type</FieldLabel>
                <Select value={form.twitter_card} onValueChange={v => update("twitter_card", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary_large_image">summary_large_image (recommended)</SelectItem>
                    <SelectItem value="summary">summary</SelectItem>
                    <SelectItem value="app">app</SelectItem>
                    <SelectItem value="player">player</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel help="Author's Twitter/X handle without @. Adds twitter:creator meta tag.">Author Twitter handle</FieldLabel>
                <div className="flex">
                  <span className="flex items-center px-2.5 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">@</span>
                  <Input value={form.twitter_creator} onChange={e => update("twitter_creator", e.target.value)} placeholder="authorhandle" className="rounded-l-none" />
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <FieldLabel help="Schema.org structured data type for this article.">Schema type</FieldLabel>
                <Select value={form.schema_type} onValueChange={v => update("schema_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NewsArticle">NewsArticle</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="BlogPosting">BlogPosting</SelectItem>
                    <SelectItem value="OpinionNewsArticle">OpinionNewsArticle</SelectItem>
                    <SelectItem value="HowTo">HowTo (renders as Article — no steps yet)</SelectItem>
                    <SelectItem value="Review">Review (renders as Article — no rating yet)</SelectItem>
                    <SelectItem value="LiveBlogPosting">LiveBlogPosting</SelectItem>
                    <SelectItem value="AnalysisNewsArticle">AnalysisNewsArticle</SelectItem>
                  </SelectContent>
                </Select>
                {(form.schema_type === "HowTo" || form.schema_type === "Review") && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    Google requires extra fields (steps for HowTo, a rating for Review) before it will show this as rich results — we publish it as a safe "Article" type until that's added, rather than risk an invalid schema.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 col-span-1">
                <div><Label className="text-xs">Index article</Label><p className="text-[11px] text-muted-foreground">Allow search listing</p></div>
                <Switch checked={form.robots_index} onCheckedChange={checked => setForm(p => ({ ...p, robots_index: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 col-span-1">
                <div><Label className="text-xs">Follow links</Label><p className="text-[11px] text-muted-foreground">Allow link following</p></div>
                <Switch checked={form.robots_follow} onCheckedChange={checked => setForm(p => ({ ...p, robots_follow: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 col-span-1">
                <div><Label className="text-xs">No archive</Label><p className="text-[11px] text-muted-foreground">Discourage cached copies</p></div>
                <Switch checked={form.robots_noarchive} onCheckedChange={checked => setForm(p => ({ ...p, robots_noarchive: checked }))} />
              </div>
            </div>
          </Section>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings" className="space-y-5 mt-0">
          {/* Content classification */}
          <Section title="Content Classification" icon={FileText} defaultOpen>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel help="Drives JSON-LD schema type and Google News RSS behavior.">Content type</FieldLabel>
                <Select
                  value={form.content_type}
                  onValueChange={v => setForm(p => ({
                    ...p,
                    content_type: v,
                    schema_type: ({ breaking_news: "NewsArticle", evergreen_guide: "Article", opinion_editorial: "OpinionNewsArticle", howto_tutorial: "HowTo", review: "Review", live_blog: "LiveBlogPosting", analysis: "AnalysisNewsArticle" } as Record<string, string>)[v] || p.schema_type,
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breaking_news">⚡ Breaking News</SelectItem>
                    <SelectItem value="evergreen_guide">📗 Evergreen Guide</SelectItem>
                    <SelectItem value="opinion_editorial">💬 Opinion / Editorial</SelectItem>
                    <SelectItem value="howto_tutorial">🛠 HowTo Tutorial</SelectItem>
                    <SelectItem value="review">⭐ Product Review</SelectItem>
                    <SelectItem value="live_blog">🔴 Live Blog</SelectItem>
                    <SelectItem value="analysis">🔍 Analysis / Deep Dive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label className="text-xs font-semibold">Exclude from Google News</Label>
                  <p className="text-[11px] text-muted-foreground">Won't appear in news RSS/sitemap</p>
                </div>
                <Switch checked={form.google_news_exclude} onCheckedChange={checked => setForm(p => ({ ...p, google_news_exclude: checked }))} />
              </div>
            </div>
            {form.content_type === "evergreen_guide" && (
              <div>
                <FieldLabel help="Schedule the next editorial review for this evergreen article.">Evergreen audit date</FieldLabel>
                <Input type="date" value={form.evergreen_audit_date} onChange={e => update("evergreen_audit_date", e.target.value)} />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Geographic coverage (optional)</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Country</Label><Input value={form.location_country} onChange={e => update("location_country", e.target.value)} placeholder="e.g. India" className="mt-1" /></div>
                <div><Label className="text-xs">State</Label><Input value={form.location_state} onChange={e => update("location_state", e.target.value)} placeholder="e.g. Maharashtra" className="mt-1" /></div>
                <div><Label className="text-xs">City</Label><Input value={form.location_city} onChange={e => update("location_city", e.target.value)} placeholder="e.g. Mumbai" className="mt-1" /></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Adds <code className="bg-muted px-1 rounded">spatialCoverage</code> to the article's JSON-LD schema.</p>
            </div>
          </Section>

          {/* Additional options */}
          <Section title="Article Options" icon={Zap} defaultOpen={false}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><Label className="text-xs font-semibold">Comments enabled</Label><p className="text-[11px] text-muted-foreground">Readers can comment</p></div>
                <Switch checked={form.comments_enabled} onCheckedChange={checked => setForm(p => ({ ...p, comments_enabled: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><Label className="text-xs font-semibold">Live article</Label><p className="text-[11px] text-muted-foreground">For live timelines</p></div>
                <Switch checked={form.is_live} onCheckedChange={checked => setForm(p => ({ ...p, is_live: checked }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><Label className="text-xs font-semibold">Sponsored content</Label><p className="text-[11px] text-muted-foreground">Adds disclosure fields</p></div>
                <Switch checked={form.is_sponsored} onCheckedChange={checked => setForm(p => ({ ...p, is_sponsored: checked }))} />
              </div>
            </div>
            {form.is_sponsored && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label className="text-xs">Sponsor name</Label><Input value={form.sponsor_name} onChange={e => update("sponsor_name", e.target.value)} className="mt-1" /></div>
                <div><Label className="text-xs">Sponsor disclosure</Label><Input value={form.sponsor_disclosure} onChange={e => update("sponsor_disclosure", e.target.value)} className="mt-1" /></div>
              </div>
            )}
            {form.correction_note !== undefined && (
              <div>
                <FieldLabel help="Correction or editor's note appended at the end of the article.">Correction / Editor's note</FieldLabel>
                <Textarea rows={2} value={form.correction_note} onChange={e => update("correction_note", e.target.value)} placeholder="Add a correction or editor's note..." />
              </div>
            )}
          </Section>
            </TabsContent>

            {/* AI ASSIST TAB */}
            <TabsContent value="ai" className="space-y-5 mt-0">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-sm font-semibold">AI Editor Assist</h3>
                <p className="text-xs text-muted-foreground">Get AI guidance for grammar, SEO, headlines, and fact-check checklists.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={aiTask} onValueChange={(value: any) => setAiTask(value)} >
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="seo">📊 SEO checklist</SelectItem>
                  <SelectItem value="grammar">✍️ Grammar polish</SelectItem>
                  <SelectItem value="readability">📖 Readability</SelectItem>
                  <SelectItem value="headline">💡 Headline ideas</SelectItem>
                  <SelectItem value="excerpt">📝 Excerpt ideas</SelectItem>
                  <SelectItem value="fact_check">✅ Fact-check checklist</SelectItem>
                  <SelectItem value="plagiarism">🔍 Plagiarism guidance</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" onClick={() => runAiAssist()} disabled={aiBusy} className="flex-shrink-0">
                <Sparkles className="mr-2 h-4 w-4" /> {aiBusy ? "Reviewing..." : "Run AI"}
              </Button>
            </div>
            {aiNote && <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{aiNote}</p>}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 rounded-md border bg-primary/5 p-3">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs leading-relaxed">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                    <span className="flex-1">{suggestion}</span>
                    {["headline", "excerpt", "seo_title", "seo_description"].includes(aiTask) && (
                      <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => applyAiSuggestion(suggestion)}>Use</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
            </TabsContent>

            {!isNew && (
            <TabsContent value="activity" className="space-y-5 mt-0">
          {/* Live updates (existing articles only) */}
          {form.is_live && (
            <Section title="Live Blog Updates" icon={Zap} defaultOpen>
              <div className="space-y-3">
                <Input value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="Update headline (optional)" />
                <Textarea rows={3} value={liveBody} onChange={e => setLiveBody(e.target.value)} placeholder="Write the live update here..." />
                <Button onClick={addLiveUpdate} disabled={!liveBody.trim()} size="sm">Add live update</Button>
              </div>
              {liveUpdates.length > 0 && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {liveUpdates.map((upd: any) => (
                    <div key={upd.id} className="rounded-md border p-3 text-xs">
                      {upd.update_title && <div className="font-semibold mb-1">{upd.update_title}</div>}
                      <div className="text-muted-foreground">{new Date(upd.created_at).toLocaleString()}</div>
                      <div className="mt-1">{upd.update_body}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Revision history */}
            <Section title="Revision History" icon={History} defaultOpen>
              {revisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">No prior revisions yet.</p>
              ) : (
                <div className="space-y-2">
                  {revisions.slice(0, 10).map((rev) => (
                    <div key={rev.id} className="rounded-md border p-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium capitalize">{rev.status || 'draft'}</span>
                          {rev.editor_name && <span className="text-muted-foreground truncate">by {rev.editor_name}</span>}
                        </div>
                        <span className="text-muted-foreground flex-shrink-0">{new Date(rev.created_at).toLocaleString()}</span>
                      </div>
                      {rev.revision_note && <p className="text-muted-foreground mt-1">{rev.revision_note}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => { setPreviewRevision(rev); setPreviewOpen(true); }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={() => restoreRevision(rev)}
                        >
                          Restore this version
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
            </TabsContent>
            )}
          </Tabs>
        </div>

        {/* RIGHT: Sticky sidebar */}
        {!metaSidebarCollapsed && (
        <div className="space-y-4 xl:sticky xl:top-[73px] xl:self-start xl:max-h-[calc(100vh-90px)] xl:overflow-y-auto xl:pb-6">

          {/* Publishing panel */}
          <Card className="overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Publish</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Status</label>
                <Select value={form.status} onValueChange={v => update("status", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">📝 Draft</SelectItem>
                    <SelectItem value="pending_review">⏳ Pending review</SelectItem>
                    <SelectItem value="scheduled">📅 Scheduled</SelectItem>
                    <SelectItem value="published">✅ Published</SelectItem>
                    <SelectItem value="archived">📦 Archived</SelectItem>
                    <SelectItem value="rejected">❌ Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Schedule — only shown when status is "scheduled" */}
              {form.status === "scheduled" && (
                <div className="rounded-md border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                  <label className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" /> Publish date & time
                  </label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={e => update("scheduled_at", e.target.value)}
                    className="h-9 text-sm bg-white"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {form.scheduled_at ? (
                    <p className="text-xs text-blue-700 flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Will go live {new Date(form.scheduled_at).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-destructive">Choose a future date and time to schedule</p>
                  )}
                </div>
              )}

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Priority</label>
                <Select value={form.priority} onValueChange={v => update("priority", v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="top">⬆ Top story</SelectItem>
                    <SelectItem value="breaking">🔴 Breaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1 border-t">
                <Button className="w-full" disabled={busy} onClick={() => save("published")}>
                  {busy ? "Saving..." : form.status === "published" ? "Update article" : "Publish now"}
                </Button>
                {form.status === "scheduled" && (
                  <Button className="w-full" variant="outline" disabled={busy} onClick={() => save("scheduled")}>
                    <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Save schedule
                  </Button>
                )}
                <Button className="w-full" variant="outline" disabled={busy} onClick={() => save("draft")}>
                  <Save className="h-3.5 w-3.5 mr-1.5" /> Save as draft
                </Button>
                {form.status !== "published" && (
                  <Button className="w-full" variant="ghost" disabled={busy} onClick={() => save("pending_review")}>
                    Submit for review
                  </Button>
                )}
              </div>

              {form.status === "published" && !isNew && (
                <a
                  href={articlePath({ slug: form.slug, categorySlug: primaryCategory?.slug })}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Eye className="h-3.5 w-3.5" /> View live article
                </a>
              )}
            </div>
          </Card>

          {/* Featured image */}
          <Card className="overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Featured Image</h3>
            </div>
            <div className="p-4 space-y-3">
              {form.featured_image && (
                <div className="relative overflow-hidden rounded-md border bg-muted aspect-video">
                  <img src={form.featured_image} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setForm(p => ({ ...p, featured_image: "" }))}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded p-0.5 hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              {!form.featured_image && (
                <div className="aspect-video rounded-md border-2 border-dashed bg-muted/30 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-30" />
                    <p className="text-xs">Paste image URL below</p>
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Image URL</label>
                <Input value={form.featured_image} onChange={e => update("featured_image", e.target.value)} placeholder="https://..." className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Alt text <span className="text-destructive">*</span></label>
                <Input value={form.featured_image_alt} onChange={e => update("featured_image_alt", e.target.value)} placeholder="Describe the image for accessibility" className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Caption</label>
                <Input value={form.featured_image_caption} onChange={e => update("featured_image_caption", e.target.value)} placeholder="Image caption..." className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Photo credit / Source</label>
                <Input value={form.image_source} onChange={e => update("image_source", e.target.value)} placeholder="e.g. Getty Images / Reuters" className="mt-1 h-8 text-xs" />
              </div>
            </div>
          </Card>

          {/* Author */}
          <Card className="overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Author</h3>
            </div>
            <div className="p-4">
              <Select value={form.author_id || (user?.id ? String(user.id) : "")} onValueChange={v => update("author_id", v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select author..." /></SelectTrigger>
                <SelectContent>
                  {authors.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      <div>
                        <div className="font-medium text-sm">{a.display_name}</div>
                        <div className="text-xs text-muted-foreground">{a.email}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Taxonomy */}
          <Card className="overflow-hidden">
            <div className="bg-muted/40 px-4 py-3 border-b flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Taxonomy</h3>
            </div>
            <div className="p-4 space-y-4">

              {/* ── 3-level category cascade ─────────────────────────────── */}
              {/* Level 1: Section / Primary Category */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Section <span className="text-destructive">*</span>
                </label>
                <Select value={form.category_id || "__none__"} onValueChange={v => handleLevel1Change(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Choose a section…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— choose section —</SelectItem>
                    {categories.filter(c => !c.parent_id).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Level 2: Subsection — shown only when level 1 has children */}
              {level2Options.length > 0 && (
                <div className="pl-3 border-l-2 border-muted">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    Subsection
                    <span className="font-normal opacity-60 ml-1">
                      under {categories.find(c => c.id === form.category_id)?.name}
                    </span>
                  </label>
                  <Select value={level2Id || "__none__"} onValueChange={handleLevel2Change}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="None (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {level2Options.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Level 3: Topic — shown only when level 2 has children */}
              {level3Options.length > 0 && (
                <div className="pl-6 border-l-2 border-muted">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                    Topic
                    <span className="font-normal opacity-60 ml-1">
                      under {categories.find(c => c.id === level2Id)?.name}
                    </span>
                  </label>
                  <Select value={level3Id || "__none__"} onValueChange={handleLevel3Change}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="None (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {level3Options.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Selected path breadcrumb */}
              {form.category_id && (level2Id || level3Id) && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-2.5 py-1.5">
                  <span className="font-medium text-foreground">{categories.find(c => c.id === form.category_id)?.name}</span>
                  {level2Id && <><span className="opacity-40">›</span><span>{categories.find(c => c.id === level2Id)?.name}</span></>}
                  {level3Id && <><span className="opacity-40">›</span><span className="font-medium text-foreground">{categories.find(c => c.id === level3Id)?.name}</span></>}
                </div>
              )}

              <div className="border-t pt-3">
                {/* Story Series */}
                {seriesList.length > 0 && (
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Story series</label>
                    <Select value={(form as any).series_id || "__none__"} onValueChange={v => setForm(p => ({ ...p, series_id: v === "__none__" ? "" : v } as any))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {seriesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground mt-1">Group this article with ongoing coverage of the same story.</p>
                  </div>
                )}

                {/* Audience */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Target audience</label>
                  <Select value={(form as any).audience || "general"} onValueChange={v => setForm(p => ({ ...p, audience: v } as any))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General public</SelectItem>
                      <SelectItem value="youth">Youth / Students</SelectItem>
                      <SelectItem value="professional">Professionals</SelectItem>
                      <SelectItem value="investors">Investors / Traders</SelectItem>
                      <SelectItem value="regional">Regional / Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Tags ─────────────────────────────────────────────────── */}
              <div className="border-t pt-3">
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tags</label>
                <p className="text-[11px] text-muted-foreground mb-2">Keywords that link this article to related stories across sections.</p>
                {tagList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tagList.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <Input
                  value={tagQuery}
                  onChange={e => setTagQuery(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Type tag and press Enter…"
                  className="h-9 text-sm"
                />
                {suggestedTags.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[11px] text-muted-foreground mb-1">Suggestions for this section:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestedTags.map(tag => (
                        <button key={tag} type="button" onClick={() => addTag(tag)}
                          className="rounded-full bg-muted hover:bg-primary/10 hover:text-primary border px-2 py-0.5 text-xs transition-colors">
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Focus keyword */}
              <div className="border-t pt-3">
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Focus keyword</label>
                <Input value={form.focus_keyword} onChange={e => update("focus_keyword", e.target.value)} placeholder="Main SEO keyword" className="h-9 text-sm" />
              </div>

            </div>
          </Card>

          {/* Internal link suggestions */}
          {linkSuggestions.length > 0 && (
            <Card className="overflow-hidden">
              <div className="bg-muted/40 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-xs">Related articles</h3>
                <span className="text-[11px] text-muted-foreground">Click embed to insert a link into your article</span>
              </div>
              <div className="p-3 space-y-1.5">
                {linkSuggestions.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-md border p-2.5 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium line-clamp-1">{item.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">tradingle.com{articlePath({ slug: item.slug, categorySlug: item.category_slug })}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={articlePath({ slug: item.slug, categorySlug: item.category_slug })} target="_blank" rel="noreferrer">
                        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[10px]">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px]"
                        title="Insert link into article body"
                        onClick={() => {
                          const linkHtml = `<p><strong>Related:</strong> <a href="${articlePath({ slug: item.slug, categorySlug: item.category_slug })}">${item.title}</a></p>`;
                          update("content", form.content + "\n" + linkHtml);
                          toast.success("Related article link inserted");
                        }}
                      >
                        Embed
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={(open) => { setPreviewOpen(open); if (!open) setPreviewRevision(null); }}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Article preview</DialogTitle>
          {previewRevision && (
            <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/30 border-b px-4 py-2 text-xs">
              <span>
                Viewing the <strong>{new Date(previewRevision.created_at).toLocaleString()}</strong> version
                {previewRevision.editor_name ? ` by ${previewRevision.editor_name}` : ""} — not the current draft.
              </span>
              <Button type="button" size="sm" variant="outline" className="h-7 flex-shrink-0" onClick={() => restoreRevision(previewRevision)}>
                Restore this version
              </Button>
            </div>
          )}
          <ArticlePreview
            title={previewRevision ? previewRevision.title : form.title}
            subtitle={form.subtitle}
            featuredImage={form.featured_image}
            imageCaption={form.featured_image_caption}
            author={previewAuthorName}
            publishedAt={form.published_at || new Date().toISOString()}
            category={primaryCategory?.name}
            content={previewRevision ? previewRevision.content : form.content}
            readTime={previewReadTime}
            tags={tagList}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArticleEditor;
