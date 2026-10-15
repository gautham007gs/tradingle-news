"use client";

import MpaLink from "@/components/MpaLink";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { hostingerApi } from "@/lib/hostingerApi";
import { CACHE_TTL, fetchWithClientCache, readStaleCache } from "@/lib/clientCache";

type QuickCategory = { slug: string; name: string };
type RawCategory = { id?: string | number; slug: string; name: string; show_in_nav?: number | string | boolean; nav_label?: string | null; nav_order?: number | string };

const STICKY_THRESHOLD = 102;
const MAX_QUICK_LINKS = 8;

const QuickLinks = () => {
  const [isSticky, setIsSticky] = useState(false);
  const [categories, setCategories] = useState<QuickCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const quickLinksRef = useRef<HTMLDivElement>(null);

  const isHomepage = pathname === "/";
  const isVisible = !isHomepage || isSticky;

  useEffect(() => {
    let active = true;
    setLoading(true);

    const cached = readStaleCache<QuickCategory[]>("nav_categories");
    if (cached?.length) {
      setCategories(cached);
      setLoading(false);
    }

    fetchWithClientCache("nav_categories", CACHE_TTL.categories, async () => {
      const { data } = await hostingerApi.categories();

      return ((data || []) as RawCategory[])
        .filter((c) => c.slug && c.slug !== "latest")
        // show_in_nav defaults to 1 (visible) in the database for any category
        // with no explicit setting, so this mirrors the previous opt-out behavior.
        .filter((c) => c.show_in_nav === undefined || !!Number(c.show_in_nav))
        .sort((a, b) => Number(a.nav_order ?? 0) - Number(b.nav_order ?? 0))
        .slice(0, MAX_QUICK_LINKS)
        .map((c) => ({ slug: c.slug, name: c.nav_label || c.name }));
    })
      .then((fromApi) => {
        if (!active) return;
        setCategories(fromApi);
      })
      .catch(() => {
        if (active) setCategories(cached || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHomepage) return;

    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsSticky(window.scrollY > STICKY_THRESHOLD);
      }, 10);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [isHomepage]);

  // Homepage before scroll: don't render at all
  if (isHomepage && !isVisible) {
    return null;
  }

  // Article pages are hidden via CSS: html[data-article-page="1"] .trd-layout-quicklinks { display: none }
  // The data attribute is set by an inline <script> in the article page before hydration.
  return (
    <nav
      ref={quickLinksRef}
      className={`trd-layout-quicklinks ${isSticky && isHomepage ? "trd-layout-quicklinks--pinned" : "trd-layout-quicklinks--static"}`}
      aria-label="Quick category links"
      aria-live="polite"
    >
      <div className="trd-container">
        <div className="trd-layout-quicklinks-row">
          <div className="trd-layout-quicklinks-items">
            <MpaLink
              to="/"
              className={`quicklinks-item ${pathname === "/" ? "quicklinks-item--active" : ""}`}
            >
              Top News
            </MpaLink>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <span key={`skeleton-${i}`} className="quicklinks-skeleton" aria-hidden="true" />
                ))
              : categories.map((cat) => (
                  <MpaLink
                    key={cat.slug}
                    to={`/${cat.slug}`}
                    className={`quicklinks-item ${pathname === `/${cat.slug}` ? "quicklinks-item--active" : ""}`}
                  >
                    {cat.name}
                  </MpaLink>
                ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default QuickLinks;
