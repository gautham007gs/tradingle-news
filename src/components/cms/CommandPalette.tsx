import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Tag, FolderTree, Users, Search, CornerDownLeft,
  LayoutDashboard, CalendarDays, Image as ImageIcon, Newspaper, BarChart3,
  Home, Globe2, ArrowLeftRight, MessageCircle, Mail, Briefcase, Award,
  BookOpen, Megaphone, Navigation, Settings, ShieldCheck, PenSquare, SearchX,
} from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";
import { useCmsAuth } from "@/hooks/useCmsAuth";

type Cmd = {
  id: string;
  label: string;
  hint?: string;
  statusKey?: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  draft: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  pending_review: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  scheduled: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
};

const STAFF = ["admin", "editor", "author"];
const EDITORS = ["admin", "editor"];
const ADMINS = ["admin"];

/**
 * Global command palette (Ctrl/Cmd+K).
 * Searches navigation destinations, articles (server-side debounced), tags,
 * categories and — for admins — users.
 */
const CommandPalette = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const nav = useNavigate();
  const { isAdmin, roles } = useCmsAuth();
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<Array<{ id: string; title: string; status: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: number; display_name: string; email: string }>>([]);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setQuery(""); setActive(0); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    hostingerApi.tags().then((r) => setTags((r.data as any[]) ?? [])).catch(() => {});
    hostingerApi.categories().then((r) => setCategories((r.data as any[]) ?? [])).catch(() => {});
    if (isAdmin) hostingerApi.users().then((r) => setUsers(r.users ?? [])).catch(() => {});
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setArticles([]); return; }
    const t = window.setTimeout(() => {
      hostingerApi.articles(`?q=${encodeURIComponent(q)}&limit=8`)
        .then((r) => setArticles((r.data as any[]) ?? []))
        .catch(() => setArticles([]));
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, open]);

  const go = useCallback((to: string) => { onOpenChange(false); nav(to); }, [nav, onOpenChange]);


  const commands: Cmd[] = useMemo(() => {
    const navCmds: Array<[string, string, React.ComponentType<{ className?: string }>, string[]]> = [
      ["/admin", "Dashboard", LayoutDashboard, STAFF],
      ["/admin/articles/new", "Write new article", PenSquare, STAFF],
      ["/admin/calendar", "Content calendar", CalendarDays, STAFF],
      ["/admin/review", "Review queue", FileText, EDITORS],
      ["/admin/articles", "All articles", FileText, STAFF],
      ["/admin/media", "Media library", ImageIcon, STAFF],
      ["/admin/categories", "Categories", FolderTree, EDITORS],
      ["/admin/tags", "Tags", Tag, STAFF],
      ["/admin/series", "Story series", BookOpen, EDITORS],
      ["/admin/comments", "Comments moderation", MessageCircle, EDITORS],
      ["/admin/newsletters", "Newsletters", Mail, EDITORS],
      ["/admin/jobs", "Job postings", Briefcase, EDITORS],
      ["/admin/analytics", "Analytics", BarChart3, EDITORS],
      ["/admin/breaking", "Breaking news", Newspaper, EDITORS],
      ["/admin/authors", "Authors", Users, EDITORS],
      ["/admin/rewards", "Rewards ledger", Award, EDITORS],
      ["/admin/homepage", "Homepage slots", Home, EDITORS],
      ["/admin/ads", "Ad slots", Megaphone, EDITORS],
      ["/admin/navigation", "Navigation & menus", Navigation, EDITORS],
      ["/admin/sitemap", "Sitemap & SEO feeds", Globe2, EDITORS],
      ["/admin/redirects", "Redirects", ArrowLeftRight, ADMINS],
      ["/admin/users", "Users & roles", Users, ADMINS],
      ["/admin/settings", "Site settings", Settings, ADMINS],
      ["/admin/security", "Security", ShieldCheck, ADMINS],
    ];
    return navCmds
      .filter(([, , , r]) => r.some((x) => roles.includes(x as any)))
      .map(([to, label, icon]) => ({ id: `nav-${to}`, label, group: "Go to", icon, run: () => go(to) }));
  }, [roles, go]);

  const q = query.trim().toLowerCase();

  const filteredNav = useMemo(
    () => (q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands.slice(0, 8)),
    [commands, q]
  );

  const filteredArticles: Cmd[] = useMemo(
    () =>
      q.length >= 2
        ? articles.slice(0, 6).map((a) => ({
            id: `article-${a.id}`, label: a.title, hint: a.status.replace("_", " "),
            statusKey: a.status, group: "Articles", icon: FileText,
            run: () => go(`/admin/articles/${a.id}`),
          }))
        : [],
    [articles, q, go]
  );

  const filterSimple = useCallback((list: Array<{ id: string; name: string }>, prefix: string, group: string, icon: any, target: string): Cmd[] =>
    q
      ? list.filter((x) => (x.name ?? "").toLowerCase().includes(q)).slice(0, 4).map((x) => ({
          id: `${prefix}-${x.id}`, label: x.name, hint: group.toLowerCase().slice(0, -1),
          group, icon, run: () => go(target),
        }))
      : [], [q, go]);

  const filteredTags = useMemo(() => filterSimple(tags, "tag", "Tags", Tag, "/admin/tags"), [filterSimple, tags]);
  const filteredCats = useMemo(() => filterSimple(categories, "cat", "Categories", FolderTree, "/admin/categories"), [filterSimple, categories]);

  const filteredUsers: Cmd[] = useMemo(
    () =>
      q && isAdmin
        ? users
            .filter((u) => (u.display_name ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q))
            .slice(0, 4)
            .map((u) => ({
              id: `user-${u.id}`, label: u.display_name || u.email, hint: u.email,
              group: "Users", icon: Users, run: () => go("/admin/users"),
            }))
        : [],
    [users, q, isAdmin, go]
  );


  const groups = useMemo(() => {
    const all = [...filteredNav, ...filteredArticles, ...filteredTags, ...filteredCats, ...filteredUsers];
    const grouped = new Map<string, Cmd[]>();
    for (const item of all) {
      if (!grouped.has(item.group)) grouped.set(item.group, []);
      grouped.get(item.group)!.push(item);
    }
    return Array.from(grouped.entries()).map(([name, items]) => ({ name, items }));
  }, [filteredNav, filteredArticles, filteredTags, filteredCats, filteredUsers]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, groups]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      flat[active]?.run();
    }
  };

  let runningIndex = -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 p-0 max-w-xl overflow-hidden" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search articles, tags, users or jump to a page…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Search the CMS"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2" role="listbox" aria-label="Search results">
          {flat.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <SearchX className="h-6 w-6 opacity-50" />
              No matches for “{query.trim()}”
            </div>
          )}
          {groups.map((group) => (
            <div key={group.name} className="px-2 pb-1">
              <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.name}
              </div>
              {group.items.map((item) => {
                runningIndex++;
                const idx = runningIndex;
                const isActiveItem = idx === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-active={isActiveItem}
                    role="option"
                    aria-selected={isActiveItem}
                    onMouseMove={() => setActive(idx)}
                    onClick={() => item.run()}
                    className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                      isActiveItem ? "bg-primary/10 text-primary" : "hover:bg-muted/60"
                    }`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0 opacity-70" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.statusKey ? (
                      <Badge variant="secondary" className={`text-[10px] capitalize ${STATUS_COLORS[item.statusKey] ?? ""}`}>
                        {item.hint}
                      </Badge>
                    ) : item.hint ? (
                      <span className="text-[11px] text-muted-foreground">{item.hint}</span>
                    ) : null}
                    {isActiveItem && <CornerDownLeft className="h-3 w-3 opacity-60" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border bg-muted px-1">↵</kbd> open</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommandPalette;
