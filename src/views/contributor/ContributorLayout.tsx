import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { hostingerApi } from "@/lib/hostingerApi";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutDashboard, PenLine, Award, LogOut, FileText } from "lucide-react";

const items = [
  { to: "/contributor", end: true, label: "Dashboard", icon: LayoutDashboard },
  { to: "/contributor/submit", label: "New submission", icon: PenLine },
  { to: "/contributor/articles", label: "My submissions", icon: FileText },
  { to: "/contributor/rewards", label: "My points", icon: Award },
];

const ContributorLayout = () => {
  const { user, loading, signOut, refresh } = useCmsAuth();

  useEffect(() => {
    if (hostingerApi.absorbOAuthTokenFromHash()) {
      refresh();
    }
  }, [refresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }
  // Use full-page navigation so the browser loads the Next.js /write-for-us route,
  // not the React Router SPA catch-all (which would 404 inside the BrowserRouter).
  if (!user) {
    if (typeof window !== "undefined") window.location.assign("/write-for-us");
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30 md:flex-row">
      <aside className="bg-card border-b flex flex-col md:w-64 md:border-b-0 md:border-r">
        <div className="p-4 border-b md:p-5">
          <div className="font-bold text-sm">Contributor</div>
          <div className="text-xs text-muted-foreground truncate">{user.display_name || user.email}</div>
          <div className="mt-3 rounded-md p-3" style={{ backgroundColor: "hsl(var(--primary) / 0.08)" }}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reward Points</div>
            <div className="text-2xl font-bold" style={{ color: "hsl(var(--primary))" }}>{user.points}</div>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto p-3 md:flex-1 md:flex-col md:space-y-1 md:overflow-visible">
          {items.map(({ to, end, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors md:gap-3 ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"}`}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-2 border-t p-3 md:block md:space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => window.location.assign("/")}>View Site</Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={async () => { await signOut(); window.location.assign("/write-for-us"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"><Outlet /></main>
    </div>
  );
};

export default ContributorLayout;
