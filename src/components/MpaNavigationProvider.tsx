import { useEffect } from "react";

/**
 * Prefetches likely next pages on idle / link hover for faster MPA transitions.
 * Does not intercept clicks — native <a href> handles full page loads.
 */
const MpaNavigationProvider = () => {
  useEffect(() => {
    const prefetched = new Set<string>();

    const prefetch = (href: string) => {
      const path = href.split("?")[0] ?? "";
      if (!path.startsWith("/") || path.startsWith("//") || prefetched.has(path)) return;
      if (path.startsWith("/admin") || path.startsWith("/contributor")) return;
      prefetched.add(path);
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = path;
      link.as = "document";
      document.head.appendChild(link);
    };

    const onHover = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href^='/']");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (href) prefetch(href);
    };

    const idlePrefetch = () => {
      prefetch("/");
      prefetch("/search");
      prefetch("/editors-picks");
    };

    document.addEventListener("mouseover", onHover, { passive: true });

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(idlePrefetch, { timeout: 3500 });
      return () => {
        cancelIdleCallback(id);
        document.removeEventListener("mouseover", onHover);
      };
    }

    const timer = setTimeout(idlePrefetch, 2000);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseover", onHover);
    };
  }, []);

  return null;
};

export default MpaNavigationProvider;
