/**
 * Client-side stale-while-revalidate cache (localStorage).
 * Stores non-sensitive API payloads only — never auth tokens or PII.
 */

const STORAGE_PREFIX = "trd_cache_v1_";
const MAX_ENTRY_BYTES = 512_000;

export type CacheEnvelope<T> = {
  data: T;
  savedAt: number;
};

export function readCacheEntry<T>(key: string): CacheEnvelope<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

export function readFreshCache<T>(key: string, maxAgeMs: number): T | null {
  const entry = readCacheEntry<T>(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > maxAgeMs) return null;
  return entry.data;
}

export function readStaleCache<T>(key: string): T | null {
  return readCacheEntry<T>(key)?.data ?? null;
}

export function writeCacheEntry<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({ data, savedAt: Date.now() } satisfies CacheEnvelope<T>);
    if (payload.length > MAX_ENTRY_BYTES) return;
    localStorage.setItem(STORAGE_PREFIX + key, payload);
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

export function removeCacheEntry(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Cache TTL presets aligned with editorial freshness (ms). */
export const CACHE_TTL = {
  homepage: 60_000,
  categories: 300_000,
  siteSettings: 600_000,
  article: 120_000,
  search: 30_000,
} as const;

export async function fetchWithClientCache<T>(
  key: string,
  maxAgeMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const fresh = readFreshCache<T>(key, maxAgeMs);
  if (fresh !== null) return fresh;

  const stale = readStaleCache<T>(key);
  if (stale !== null) {
    void fetcher()
      .then((data) => writeCacheEntry(key, data))
      .catch(() => undefined);
    return stale;
  }

  const data = await fetcher();
  writeCacheEntry(key, data);
  return data;
}
