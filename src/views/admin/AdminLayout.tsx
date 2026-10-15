import { NavLink, Outlet, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, type ComponentType } from "react";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CommandPalette from "@/components/cms/CommandPalette";
import { LayoutDashboard, FileText, FolderTree, Tag, Image, Users, LogOut, Newspaper, Inbox, Settings, Award, Home, Mail, MessageCircle, Megaphone, UserRound, Menu, X, Globe2, CalendarDays, Sun, Moon, BookOpen, Briefcase, Navigation, ArrowLeftRight, BarChart3, Zap, ShieldCheck, Search } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

const SIDEBAR_COLLAPSED_KEY = "trd_cms_sidebar_collapsed";

type Role = "admin" | "editor" | "author" | "contributor";

type Item = {
  to: string;
  end?: boolean;
  label: string;
  icon: ComponentType<{ className?: string }>;
  roles: Role[];
  badge?: number;
  section?: string;
};

const AdminLayout = () => {
  const { user, loading, roles, isAdmin, isStaff, signOut } = useCmsAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1"; } catch { return false; }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Persist sidebar collapse preference across reloads
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      /* storage unavailable (private mode) — preference simply won't persist */
    }
  }, [sidebarCollapsed]);

  // Global Ctrl/Cmd+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  useEffect(() => {
    if (!isStaff) return;
    const load = async () => {
      try {
        const { stats } = await hostingerApi.dashboard();
        setPending(stats?.pending ?? 0);
      } catch {
        setPending(0);
      }
    };
    load();
  }, [isStaff]);

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
    <div className="min-h-screen bg-gradient-to-br from-muted/40 via-background to-muted/30 p-4">
        <div className="mx-auto flex max-w-6xl gap-6">
          <Skeleton className="hidden h-[520px] w-64 md:block" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-56" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-[320px]" />
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location }} />;

  if (roles.length > 0 && !isStaff && !roles.includes("author")) {
    return <Navigate to="/contributor" replace />;
  }

  const primaryRole: Role = isAdmin ? "admin" : roles.includes("editor") ? "editor" : roles.includes("author") ? "author" : "contributor";

  const allItems: Item[] = [
    { to: "/admin", end: true, label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "editor", "author"], section: "main" },
    { to: "/admin/articles/new", label: "Write new article", icon: FileText, roles: ["admin", "editor", "author"], section: "main" },
    { to: "/admin/calendar", label: "Content calendar", icon: CalendarDays, roles: ["admin", "editor", "author"], section: "main" },
    { to: "/admin/review", label: "Review queue", icon: Inbox, roles: ["admin", "editor"], badge: pending, section: "main" },
    { to: "/admin/articles", end: true, label: "All articles", icon: FileText, roles: ["admin", "editor", "author"], section: "content" },
    { to: "/admin/media", label: "Media library", icon: Image, roles: ["admin", "editor", "author"], section: "content" },
    { to: "/admin/categories", label: "Categories", icon: FolderTree, roles: ["admin", "editor"], section: "organization" },
    { to: "/admin/tags", label: "Tags", icon: Tag, roles: ["admin", "editor", "author"], section: "organization" },
    { to: "/admin/series", label: "Story Series", icon: BookOpen, roles: ["admin", "editor"], section: "organization" },
    { to: "/admin/homepage", label: "Homepage slots", icon: Home, roles: ["admin", "editor"], section: "presentation" },
    { to: "/admin/ads", label: "Ad slots", icon: Megaphone, roles: ["admin", "editor"], section: "presentation" },
    { to: "/admin/navigation", label: "Navigation & menus", icon: Navigation, roles: ["admin", "editor"], section: "presentation" },
    { to: "/admin/authors", label: "Authors", icon: UserRound, roles: ["admin", "editor"], section: "team" },
    { to: "/admin/rewards", label: "Rewards ledger", icon: Award, roles: ["admin", "editor"], section: "team" },
    { to: "/admin/jobs", label: "Job postings", icon: Briefcase, roles: ["admin", "editor"], section: "engagement" },
    { to: "/admin/comments", label: "Comments", icon: MessageCircle, roles: ["admin", "editor"], section: "engagement" },
    { to: "/admin/newsletters", label: "Newsletters", icon: Mail, roles: ["admin", "editor"], section: "engagement" },
    { to: "/admin/users", label: "Users & roles", icon: Users, roles: ["admin"], section: "administration" },
    { to: "/admin/settings", label: "Site settings", icon: Settings, roles: ["admin"], section: "administration" },
    { to: "/admin/security", label: "Security", icon: ShieldCheck, roles: ["admin"], section: "administration" },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3, roles: ["admin", "editor"], section: "insights" },
    { to: "/admin/breaking", label: "Breaking news", icon: Zap, roles: ["admin", "editor"], section: "insights" },
    { to: "/admin/sitemap", label: "Sitemap & SEO feeds", icon: Globe2, roles: ["admin", "editor"], section: "platform" },
    { to: "/admin/redirects", label: "Redirects", icon: ArrowLeftRight, roles: ["admin"], section: "platform" },
  ];
  
  const navItems = allItems.filter(i => i.roles.includes(primaryRole));
  const sections = ["main", "content", "organization", "engagement", "insights", "team", "presentation", "platform", "administration"];
  const groupedItems = sections.reduce((acc, section) => {
    const items = navItems.filter(i => i.section === section);
    if (items.length > 0) acc[section] = items;
    return acc;
  }, {} as Record<string, Item[]>);

  const sectionLabels: Record<string, string> = {
    main: "Quick actions",
    content: "Content",
    organization: "Organization",
    engagement: "Engagement",
    insights: "Insights",
    team: "Team",
    presentation: "Presentation",
    platform: "Platform",
    administration: "Administration",
  };

  const roleLabel = primaryRole.charAt(0).toUpperCase() + primaryRole.slice(1);

  const NavItem = ({ item }: { item: Item }) => (
    <NavLink key={item.to} to={item.to} end={item.end}
      title={sidebarCollapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
          isActive 
            ? "bg-primary text-primary-foreground shadow-md" 
            : "text-foreground hover:bg-muted/60"
        } ${sidebarCollapsed ? "justify-center" : ""}`
      }>
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!sidebarCollapsed && <span className="flex-1">{item.label}</span>}
      {!sidebarCollapsed && item.badge ? <Badge variant="destructive" className="ml-auto text-xs">{item.badge}</Badge> : null}
      {sidebarCollapsed && item.badge ? <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white font-bold">{item.badge}</span> : null}
    </NavLink>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-muted/40 via-background to-muted/30 md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between border-b bg-card/95 p-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Tradingle CMS</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search (Ctrl+K)" onClick={() => setPaletteOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={sidebarOpen ? "Close menu" : "Open menu"} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`flex flex-col border-b bg-card/95 shadow-sm backdrop-blur transition-all ${sidebarCollapsed ? "md:w-20" : "md:w-72"} md:border-b-0 md:border-r ${
        sidebarOpen ? "block" : "hidden md:flex"
      }`}>
        {/* Header */}
        <div className="hidden md:block p-5 border-b">
          <div className="flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary" />
            {!sidebarCollapsed && <div className="min-w-0">
              <div className="text-sm font-bold tracking-wide">Tradingle CMS</div>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>}
            <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setSidebarCollapsed((value) => !value)} title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          {/* Command palette trigger — also reachable via Ctrl/Cmd+K */}
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={`mt-3 flex w-full items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted ${sidebarCollapsed ? "justify-center px-0" : ""}`}
            aria-label="Open command palette (Ctrl+K)"
            title="Search everything (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">Search…</span>
                <kbd className="rounded border bg-background px-1 font-mono text-[10px]">Ctrl K</kbd>
              </>
            )}
          </button>
          {!sidebarCollapsed && <Badge variant="secondary" className="mt-3 w-fit">{roleLabel}</Badge>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6">
          {sections.map((section) => {
            const items = groupedItems[section];
            if (!items) return null;
            const label = sectionLabels[section];
            return (
              <div key={section}>
                {label && !sidebarCollapsed && <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{label}</div>}
                <div className="space-y-1">
                  {items.map(item => <NavItem key={item.to} item={item} />)}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="border-t p-3 md:p-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full ${sidebarCollapsed ? "justify-center px-2" : "justify-start"}`}
            onClick={toggle}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <Sun className={`h-4 w-4 ${sidebarCollapsed ? "" : "mr-2"}`} />
              : <Moon className={`h-4 w-4 ${sidebarCollapsed ? "" : "mr-2"}`} />
            }
            {!sidebarCollapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
          </Button>
          <Button variant="outline" size="sm" className={`w-full ${sidebarCollapsed ? "justify-center px-2" : "justify-start"}`} onClick={() => window.location.assign("/")} title="Back to site">
            <Home className={`h-4 w-4 ${sidebarCollapsed ? "" : "mr-2"}`} />
            {!sidebarCollapsed && "Back to site"}
          </Button>
          <Button variant="ghost" size="sm" className={`w-full text-destructive hover:text-destructive ${sidebarCollapsed ? "justify-center px-2" : "justify-start"}`} onClick={async () => { 
            await signOut(); 
            navigate("/admin/login"); 
          }} title="Sign out">
            <LogOut className={`h-4 w-4 ${sidebarCollapsed ? "" : "mr-2"}`} />
            {!sidebarCollapsed && "Sign out"}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="admin-main-content flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 max-w-full">
          <Outlet />
        </div>
      </main>

      {/* Global command palette (Ctrl/Cmd+K) */}
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Skip-to-content for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to main content
      </a>
    </div>
  );
};

export default AdminLayout;
