"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { hostingerApi, type ApiAdSlot } from "@/lib/hostingerApi";
import { canUseNonEssentialTracking } from "@/lib/privacy";
import { trackEvent } from "@/lib/analytics";

declare global {
  interface Window {
    adsbygoogle?: Array<{ [key: string]: unknown }>;
  }
}

interface AdSpaceProps {
  height?: number;
  className?: string;
  label?: string;
  enabled?: boolean;
  slotKey?: string;
}

let cachedSlots: Record<string, ApiAdSlot> | null = null;
let pendingSlots: Promise<Record<string, ApiAdSlot>> | null = null;

const enabledFlag = (value: unknown) => value !== 0 && value !== false && value !== "0";

const loadSlots = async () => {
  if (cachedSlots) return cachedSlots;
  if (!pendingSlots) {
    pendingSlots = hostingerApi.ads().then(({ data }) => {
      cachedSlots = Object.fromEntries(data.map((slot) => [slot.slot_key, slot]));
      return cachedSlots;
    }).catch(() => {
      cachedSlots = {};
      return cachedSlots;
    });
  }
  return pendingSlots;
};

const AdSpace = ({ height = 90, className = "", label, enabled = true, slotKey }: AdSpaceProps) => {
  const pathname = usePathname();
  const [slot, setSlot] = useState<ApiAdSlot | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const excludedAdPaths = useMemo(() => [
    "/privacy",
    "/terms",
    "/cookies",
    "/editorial-policy",
    "/corrections-policy",
  ], []);
  const isRouteExcluded = useMemo(
    () => excludedAdPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
    [pathname, excludedAdPaths],
  );
  const active = enabled && !isRouteExcluded;

  useEffect(() => {
    if (!slotKey || !active) return;
    let alive = true;
    loadSlots().then((slots) => {
      if (alive) setSlot(slots[slotKey] || null);
    });
    return () => { alive = false; };
  }, [slotKey, active]);

  useEffect(() => {
    if (!active || !slot || slot.provider !== "google_adsense" || !slot.google_client || !canUseNonEssentialTracking()) return;
    const node = wrapperRef.current;
    if (!node) return;

    let pushed = false;
    const loadAdsense = () => {
      if (pushed) return;
      pushed = true;
      const existing = document.querySelector('script[data-tradingle-adsense="true"]');
      if (!existing) {
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(slot.google_client!)}`;
        script.crossOrigin = "anonymous";
        script.dataset.tradingleAdsense = "true";
        document.head.appendChild(script);
      }
      window.setTimeout(() => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch { /* ad block */ }
      }, 100);
    };

    if (!("IntersectionObserver" in window)) {
      const idle = (window as any).requestIdleCallback?.(loadAdsense, { timeout: 3000 }) ?? (setTimeout(loadAdsense, 3000) as unknown as number);
      return () => {
        if (typeof idle === "number") clearTimeout(idle);
        else (window as any).cancelIdleCallback?.(idle);
      };
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        loadAdsense();
        observer.disconnect();
      }
    }, { rootMargin: "200px 0px", threshold: 0.01 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, slot]);

  useEffect(() => {
    if (!slotKey || !wrapperRef.current || !("IntersectionObserver" in window)) return;
    let sent = false;
    const observer = new IntersectionObserver((entries) => {
      if (!sent && entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) {
        sent = true;
        trackEvent("ad_view", { slot_key: slotKey, provider: slot?.provider || "placeholder" });
        observer.disconnect();
      }
    }, { threshold: [0.5] });
    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [slotKey, slot?.provider]);

  // Responsive: cap large desktop ads on mobile/tablet so they don't dominate.
  const resolvedHeight = Number(slot?.height || height);
  const mobileH = Math.min(resolvedHeight, 120);
  const tabletH = Math.min(resolvedHeight, 200);
  const resolvedLabel = slot?.disclosure_label || label || "Advertisement";
  const styleVars = {
    "--ad-h-m": `${mobileH}px`,
    "--ad-h-t": `${tabletH}px`,
    "--ad-h-d": `${resolvedHeight}px`,
  } as CSSProperties;

  // NOTE: all hooks (including this useMemo) must run on every render,
  // regardless of `active`/slot state. Early-returning null before a hook
  // call here previously caused the hooks called on this component to
  // differ between renders, which is a Rules-of-Hooks violation and was
  // the root cause of the "Invalid hook call" / hydration crash on the
  // article page.
  const content = useMemo(() => {
    if (!slot || slot.provider === "placeholder") {
      return (
        <div className="grid h-full w-full place-items-center text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {resolvedLabel}
        </div>
      );
    }
    if (slot.provider === "image" || slot.provider === "affiliate" || slot.provider === "sponsored") {
      const image = slot.image_url ? (
        <img src={slot.image_url} alt={slot.label} className="h-full w-full object-cover" width={1200} height={675} loading={enabledFlag(slot.lazy_load) ? "lazy" : "eager"} decoding="async" />
      ) : <span>{slot.label}</span>;
      return slot.target_url ? <a href={slot.target_url} target="_blank" rel="nofollow sponsored noopener noreferrer" className="block h-full w-full">{image}</a> : image;
    }
    if (slot.provider === "custom_html") {
      if (!canUseNonEssentialTracking()) return resolvedLabel;
      // Sandbox note (issue #11): allow-same-origin is deliberately excluded.
      // Combining allow-scripts + allow-same-origin on a same-origin srcDoc
      // lets the sandboxed script reach the parent's DOM and escape the sandbox.
      // Without allow-same-origin the iframe gets a unique opaque origin so its
      // scripts cannot touch parent state, cookies, or localStorage.
      return <iframe title={slot.label} srcDoc={slot.custom_html || ""} className="h-full w-full border-0" loading={enabledFlag(slot.lazy_load) ? "lazy" : "eager"} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" />;
    }
    if (slot.provider === "google_adsense") {
      if (!canUseNonEssentialTracking()) return resolvedLabel;
      return (
        <ins
          className="adsbygoogle block"
          data-ad-client={slot.google_client || undefined}
          data-ad-slot={slot.google_slot || undefined}
          data-ad-format={slot.format === "fluid" ? "fluid" : "auto"}
          data-full-width-responsive="true"
        />
      );
    }
    if (slot.provider === "google_ad_manager") {
      return (
        <div className="grid h-full w-full place-items-center text-center text-[11px] text-muted-foreground" data-gam-unit-path={slot.gam_unit_path || undefined}>
          {slot.label}
        </div>
      );
    }
    return (
      <div className="grid h-full w-full place-items-center text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {resolvedLabel}
      </div>
    );
  }, [slot, resolvedLabel]);

  if (!active) return null;
  if (slotKey && slot && !enabledFlag(slot.is_active)) return null;

  const isPlaceholder = !slot || slot.provider === "placeholder";

  // Unfilled / placeholder slots collapse to a slim, unobtrusive strip instead
  // of leaving a large empty bordered box (which reads as broken layout).
  if (isPlaceholder) {
    return (
      <div className="py-2" ref={wrapperRef} aria-hidden>
        <div className="trd-ad-slot--empty flex h-8 w-full items-center justify-center">
          <span className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground/60">{resolvedLabel}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="py-[12px]" ref={wrapperRef}>
      <div className="mb-1 text-center text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{resolvedLabel}</div>
      <div
        className={`trd-ad-slot overflow-hidden ${className} h-[var(--ad-h-m)] sm:h-[var(--ad-h-t)] lg:h-[var(--ad-h-d)] w-full`}
        style={styleVars}
      >
        {content}
      </div>
    </div>
  );
};

export default AdSpace;
