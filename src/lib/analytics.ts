import { hostingerApi } from "@/lib/hostingerApi";
import { canUseNonEssentialTracking } from "@/lib/privacy";

const VISITOR_STORAGE_KEY = "tradingle_visitor_id";

const getOrCreateVisitorId = () => {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(VISITOR_STORAGE_KEY);
  if (existing && /^[a-f0-9]{32}$/i.test(existing)) return existing;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  localStorage.setItem(VISITOR_STORAGE_KEY, id);
  return id;
};

const ratingFor = (name: string, value: number) => {
  if (name === "LCP") return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
  if (name === "CLS") return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
  if (name === "INP") return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
  return "ok";
};

export const trackEvent = (event_name: string, metadata: Record<string, unknown> = {}) => {
  if (!canUseNonEssentialTracking()) return;
  const visitor_id = getOrCreateVisitorId();
  hostingerApi.collectAnalytics({
    event_name,
    page_path: window.location.pathname + window.location.search,
    visitor_id,
    metadata,
  }).catch(() => undefined);
};

export const initWebVitalsTracking = () => {
  if (!canUseNonEssentialTracking()) return () => undefined;
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return () => undefined;
  const observers: PerformanceObserver[] = [];
  const visitor_id = getOrCreateVisitorId();
  const sendMetric = (metric_name: string, metric_value: number) => {
    hostingerApi.collectAnalytics({
      event_name: "web_vital",
      page_path: window.location.pathname + window.location.search,
      visitor_id,
      metric_name,
      metric_value,
      rating: ratingFor(metric_name, metric_value),
    }).catch(() => undefined);
  };

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const last = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
      if (last?.startTime) sendMetric("LCP", last.startTime);
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true } as PerformanceObserverInit);
    observers.push(lcpObserver);
  } catch { /* browser may not support this observer type */ }

  try {
    let cls = 0;
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value?: number }>) {
        if (!entry.hadRecentInput) cls += entry.value || 0;
      }
      sendMetric("CLS", Number(cls.toFixed(3)));
    });
    clsObserver.observe({ type: "layout-shift", buffered: true } as PerformanceObserverInit);
    observers.push(clsObserver);
  } catch { /* browser may not support this observer type */ }

  try {
    const eventObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries() as PerformanceEntry[]) {
        const value = entry.duration || 0;
        if (value > 0) sendMetric("INP", value);
      }
    });
    eventObserver.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    observers.push(eventObserver);
  } catch { /* browser may not support this observer type */ }

  return () => observers.forEach((observer) => observer.disconnect());
};
