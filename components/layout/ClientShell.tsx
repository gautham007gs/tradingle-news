"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import SiteStatusGate from "@/components/cms/SiteStatusGate";
import TopNav from "@/components/news/TopNav";
/* QuickLinks (the sticky category strip) was removed: the nav now carries a
   permanent desk row, so the strip was a second horizontal list of the same
   categories directly beneath the first. */
import AuthModal from "@/components/news/AuthModal";
import CookieConsent from "@/components/news/CookieConsent";
import type { NavigationData } from "@/navData";
import { BarChart3, BookOpen, Briefcase, ChevronDown, Clapperboard, Cpu, Globe2, Home, MapPin, MoreHorizontal, Trophy, Tv } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default function ClientShell({
  children,
  navData,
}: {
  children: React.ReactNode;
  navData?: NavigationData | null;
}) {
  const railGroups: { label: string; href: string; icon: LucideIcon; children?: { label: string; href: string }[] }[] = [
    { label: "Home", href: "/", icon: Home },
    { label: "Jobs", href: "/careers", icon: Briefcase },
    { label: "India", href: "/india", icon: MapPin },
    { label: "Business", href: "/business", icon: BarChart3, children: [{ label: "Companies", href: "/business" }, { label: "Markets", href: "/markets" }, { label: "Personal finance", href: "/finance" }] },
    { label: "Life+Style", href: "/lifestyle", icon: BookOpen },
    { label: "Global", href: "/world", icon: Globe2 },
    { label: "Sports", href: "/sports", icon: Trophy, children: [{ label: "All sports", href: "/sports" }, { label: "Cricket", href: "/sports" }, { label: "Football", href: "/sports" }] },
    { label: "Technology", href: "/technology", icon: Cpu },
    { label: "Showbuzz", href: "/entertainment", icon: Clapperboard },
    { label: "TV & Magazine", href: "/topics", icon: Tv, children: [{ label: "Live TV", href: "/topics" }, { label: "Magazine", href: "/topics" }] },
    { label: "Other News", href: "/topics", icon: MoreHorizontal, children: [{ label: "Science", href: "/science" }, { label: "Health", href: "/topics" }, { label: "Cities", href: "/cities" }, { label: "Fact check", href: "/topics" }] },
  ];

  return (
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <SiteStatusGate>
            <a href="#main-content" className="skip-to-content">
              Skip to content
            </a>
            <AuthModal />
            <CookieConsent />
              <div className="trd-layout-page min-h-screen bg-background flex flex-col">
                <TopNav navData={navData} />
              <div className="trd-reader-frame flex flex-1">
                <aside className="trd-topic-rail" aria-label="News sections">
                  <p className="trd-topic-rail-title">Sections</p>
                  <nav>
                    {railGroups.map(({ label, href, icon: Icon, children: subItems }) => subItems ? (
                      <details key={label} className="trd-topic-rail-group">
                        <summary><Icon size={17} aria-hidden /><span>{label}</span><ChevronDown size={14} aria-hidden /></summary>
                        <div className="trd-topic-rail-submenu">{subItems.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}</div>
                      </details>
                    ) : (
                      <a key={label} href={href}><Icon size={17} aria-hidden /><span>{label}</span></a>
                    ))}
                  </nav>
                </aside>
                <div className="trd-reader-content flex min-w-0 flex-1 flex-col">{children}</div>
              </div>
            </div>
          </SiteStatusGate>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
