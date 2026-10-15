const API_BASE = (
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_BASE : undefined) ||
  "/api"
).replace(/\/$/, "");

// The real session credential is the HttpOnly `tradingle_session` cookie set by
// the PHP API (api/auth/session.php). We never persist the raw token to
// localStorage (XSS-exfiltratable). The token is held only in module memory for
// the current page session, and a non-sensitive presence flag is kept in
// localStorage so the UI can short-circuit auth checks across reloads.
const SESSION_ACTIVE_KEY = "tradingle_cms_authed";
const LEGACY_SESSION_KEY = "tradingle_cms_session";

let inMemorySessionToken: string | null = null;

type RequestOptions = RequestInit & {
  skipJsonHeader?: boolean;
  skipCsrf?: boolean;
  silentErrors?: boolean;
};

// Cache CSRF token to avoid multiple fetches
let cachedCsrfToken: string | null = null;
let csrfTokenPromise: Promise<string | null> | null = null;

function clearCsrfToken() {
  cachedCsrfToken = null;
}

// Remove any raw session token a previous build may have stored in localStorage.
function clearLegacySessionToken() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(LEGACY_SESSION_KEY)) {
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
  }
}

function getSessionToken() {
  return inMemorySessionToken;
}

function setSessionToken(token?: string | null) {
  inMemorySessionToken = token || null;
  if (typeof window === "undefined") return;
  clearLegacySessionToken();
  if (token) {
    window.localStorage.setItem(SESSION_ACTIVE_KEY, "1");
  } else {
    window.localStorage.removeItem(SESSION_ACTIVE_KEY);
  }
}

// Marks the session as active without installing an in-memory token. Used when
// the real credential lives only in the HttpOnly cookie (e.g. the OAuth
// redirect flow) so hasSessionToken() lets auth state refresh from the cookie.
function markSessionActive() {
  if (typeof window === "undefined") return;
  clearLegacySessionToken();
  window.localStorage.setItem(SESSION_ACTIVE_KEY, "1");
}

function hasSessionToken() {
  if (typeof window === "undefined") return Boolean(inMemorySessionToken);
  clearLegacySessionToken();
  return (
    Boolean(inMemorySessionToken) ||
    window.localStorage.getItem(SESSION_ACTIVE_KEY) === "1"
  );
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function fetchCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  csrfTokenPromise = (async () => {
    let timeout: number | undefined;
    try {
      const token = getSessionToken();
      const controller = new AbortController();
      timeout = window.setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/csrf-token.php`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        cachedCsrfToken = data.csrf_token || null;
        return cachedCsrfToken;
      }
    } catch {
      // CSRF token fetch failed, but don't block requests.
    } finally {
      if (timeout) window.clearTimeout(timeout);
    }
    return null;
  })().finally(() => {
    csrfTokenPromise = null;
  });

  return csrfTokenPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: HeadersInit = options.skipJsonHeader
    ? { ...(options.headers || {}) }
    : { "Content-Type": "application/json", ...(options.headers || {}) };
  const sessionToken = getSessionToken();
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  // Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
  if (!options.skipCsrf && ["POST", "PUT", "DELETE", "PATCH"].includes(options.method?.toUpperCase() || "")) {
    const csrfToken = await fetchCsrfToken();
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }

  let res: Response | null = null;
  let lastFetchError: unknown = null;
  const method = options.method?.toUpperCase() || "GET";
  const maxAttempts = method === "GET" ? 3 : 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
      break;
    } catch (error) {
      lastFetchError = error;
      if (attempt < maxAttempts) {
        await wait(250 * attempt);
        continue;
      }
    }
  }

  if (!res) {
    const message = `Unable to reach Tradingle API at ${API_BASE}. Check that public_html/api is uploaded and api/.env CORS_ORIGINS allows this site.`;
    console.error("API connection error:", {
      path,
      error: lastFetchError instanceof Error ? lastFetchError.message : String(lastFetchError),
      timestamp: new Date().toISOString(),
    });
    throw new Error(message);
  }

  const rawText = await res.text();
  let payload: any = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch (error) {
    const message = `Invalid JSON response from ${API_BASE}${path}. Check that your hosted API is returning JSON.`;
    console.error(message, {
      path,
      status: res.status,
      rawText: rawText.slice(0, 200),
      timestamp: new Date().toISOString(),
    });
    throw new Error(message);
  }

  if (!res.ok) {
    const errorMessage = payload?.error || "Request failed";
    if (res.status === 401 || res.status === 403) {
      clearCsrfToken();
      if (res.status === 401) setSessionToken(null);
    }
    if (process.env.NODE_ENV === "development" && !options.silentErrors) {
      console.error("API request failed:", {
        path,
        status: res.status,
        error: errorMessage,
        details: payload?.detail,
        timestamp: new Date().toISOString(),
      });
    }
    throw new Error(errorMessage);
  }

  if (payload === null) {
    const message = `Empty JSON response from ${API_BASE}${path}. Check that your hosted API is returning valid JSON.`;
    console.error(message, {
      path,
      status: res.status,
      rawText: rawText.slice(0, 200),
      timestamp: new Date().toISOString(),
    });
    throw new Error(message);
  }

  return payload as T;
}

export interface ApiUser {
  id: number;
  email: string;
  display_name: string;
  slug: string;
  avatar_url?: string | null;
  bio?: string | null;
  role_title?: string | null;
  points: number;
  total_points_earned: number;
  roles: string[];
  email_verified?: boolean;
  totp_enabled?: boolean;
}

export interface ApiArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  featured_image?: string | null;
  featured_image_alt?: string | null;
  featured_image_caption?: string | null;
  image_source?: string | null;
  comments_enabled?: number | boolean;
  status: string;
  priority: string;
  is_live: number | boolean;
  is_sponsored?: number | boolean;
  sponsor_name?: string | null;
  sponsor_disclosure?: string | null;
  published_at?: string | null;
  scheduled_at?: string | null;
  updated_at: string;
  views?: number;
  points_awarded?: number;
  review_notes?: string | null;
  reading_time_minutes?: number;
  category_id?: number | string | null;
  author_id?: number | string | null;
  category_name?: string | null;
  category_slug?: string | null;
  tag_slugs?: string | null;
  author_name: string;
  author_slug: string;
  author_avatar?: string | null;
}

export interface ApiArticle extends ApiArticleSummary {
  content?: string | null;
  review_notes?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  focus_keyword?: string | null;
  seo_og_image?: string | null;
  canonical_url?: string | null;
  schema_type?: string | null;
  correction_note?: string | null;
  robots_index?: number | boolean;
  robots_follow?: number | boolean;
  author_bio?: string | null;
  author_role_title?: string | null;
  tags: Array<{ id: number; name: string; slug: string }>;
}

export interface ApiAdSlot {
  id?: number;
  slot_key: string;
  label: string;
  placement: string;
  provider: "placeholder" | "google_adsense" | "google_ad_manager" | "custom_html" | "image" | "affiliate" | "sponsored";
  format: "leaderboard" | "rectangle" | "skyscraper" | "native" | "in_article" | "sticky" | "fluid" | "custom";
  width?: number | null;
  height?: number | null;
  desktop_enabled?: number | boolean;
  mobile_enabled?: number | boolean;
  is_active?: number | boolean;
  lazy_load?: number | boolean;
  auto_insert?: number | boolean;
  insert_after_paragraph?: number | null;
  google_client?: string | null;
  google_slot?: string | null;
  gam_unit_path?: string | null;
  custom_html?: string | null;
  image_url?: string | null;
  target_url?: string | null;
  disclosure_label?: string | null;
  notes?: string | null;
}

export interface ApiAuthor {
  id: number;
  display_name: string;
  slug: string;
  avatar_url?: string | null;
  bio?: string | null;
  role_title?: string | null;
  social_x?: string | null;
  social_linkedin?: string | null;
  social_website?: string | null;
}

export const hostingerApi = {
  hasSessionToken,
  absorbOAuthTokenFromHash: () => {
    if (typeof window === "undefined") return false;

    // The PHP callback sets the HttpOnly `tradingle_session` cookie and
    // redirects to /contributor?oauth=1 — no token is ever placed in the URL.
    // Issue #7 removed the legacy #token= fragment flow entirely; a raw token
    // in the fragment was a session-swap vector and is now ignored.
    const isOAuthReturn = new URLSearchParams(window.location.search).get("oauth") === "1";
    if (isOAuthReturn) {
      markSessionActive();
      const cleanUrl = window.location.pathname;
      window.history.replaceState(null, "", cleanUrl);
      return true;
    }

    return false;
  },
  me: async () => {
    try {
      const res = await request<{ user: ApiUser | null }>("/auth/me.php", { silentErrors: true });
      // If the server reports no authenticated user, drop any stale active flag
      // (e.g. a fabricated ?oauth=1 redirect where no cookie session exists).
      if (!res.user && hasSessionToken()) {
        clearCsrfToken();
        setSessionToken(null);
      }
      return res;
    } catch {
      if (hasSessionToken()) {
        clearCsrfToken();
        setSessionToken(null);
      }
      return { user: null };
    }
  },
  login: async (email: string, password: string) => {
    clearCsrfToken();
    setSessionToken(null);
    const response = await request<{
      user: ApiUser;
      session_token?: string;
      requires_2fa?: boolean;
      two_factor_token?: string;
    }>("/auth/login.php", {
      method: "POST",
      skipCsrf: true,
      silentErrors: true,
      body: JSON.stringify({ email, password }),
    });
    setSessionToken(response.session_token);
    clearCsrfToken();
    return response;
  },
  register: async (display_name: string, email: string, password: string) => {
    clearCsrfToken();
    const referral_code = typeof window !== "undefined" ? localStorage.getItem("tradingle_referral_code") : null;
    const response = await request<{ user: ApiUser; session_token?: string }>("/auth/register.php", {
      method: "POST",
      skipCsrf: true,
      body: JSON.stringify({ display_name, email, password, referral_code }),
    });
    setSessionToken(response.session_token);
    if (typeof window !== "undefined" && referral_code) {
      localStorage.removeItem("tradingle_referral_code");
    }
    clearCsrfToken();
    return response;
  },
  logout: async () => {
    try {
      return await request<{ ok: boolean }>("/auth/logout.php", {
      method: "POST",
      skipCsrf: true,
      body: JSON.stringify({}),
      });
    } finally {
      clearCsrfToken();
      setSessionToken(null);
    }
  },
  googleLoginUrl: () => {
    const base = `${API_BASE}/auth/google-start.php`;
    const ref = typeof window !== "undefined" ? localStorage.getItem("tradingle_referral_code") : null;
    return ref ? `${base}?ref=${encodeURIComponent(ref)}` : base;
  },

  // Complete an in-progress 2FA login using the short-lived challenge token.
  login2fa: async (two_factor_token: string, totp_code: string) => {
    clearCsrfToken();
    setSessionToken(null);
    const response = await request<{ user: ApiUser; session_token?: string }>("/auth/login-2fa.php", {
      method: "POST",
      skipCsrf: true,
      silentErrors: true,
      body: JSON.stringify({ two_factor_token, totp_code }),
    });
    setSessionToken(response.session_token);
    clearCsrfToken();
    return response;
  },

  // Admin 2FA management (TOTP). These require an authenticated admin session
  // plus a CSRF token, both handled by the shared request() wrapper.
  setup2fa: () =>
    request<{ ok: boolean; secret: string; provisioning_uri: string }>("/auth/2fa-setup.php", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  enable2fa: (totp_code: string) =>
    request<{ ok: boolean; totp_enabled: boolean }>("/auth/2fa-enable.php", {
      method: "POST",
      body: JSON.stringify({ totp_code }),
    }),
  disable2fa: (totp_code: string) =>
    request<{ ok: boolean; totp_enabled: boolean }>("/auth/2fa-disable.php", {
      method: "POST",
      body: JSON.stringify({ totp_code }),
    }),

  categories: () => request<{ data: any[] }>("/categories/list.php"),
  referralStats: () =>
    request<{
      success: boolean;
      data: {
        totalReferrals: number;
        qualifiedReferrals: number;
        totalPointsEarned: number;
        referralCode: string;
        qualifyingTarget?: number;
        avgPendingProgress?: number;
      };
    }>("/referrals.php?action=stats", { silentErrors: true }),
  referralList: () =>
    request<{
      success: boolean;
      data: {
        qualifyingTarget: number;
        referrals: Array<{
          referred_email: string;
          articles_written: number;
          qualifying_articles: number;
          status: string;
          points_earned: number;
          created_at: string;
          qualified_at?: string | null;
          rewarded_at?: string | null;
        }>;
      };
    }>("/referrals.php?action=list", { silentErrors: true }),
  saveCategory: (payload: {
    id?: string | number;
    name: string;
    slug?: string;
    description?: string | null;
    parent_id?: string | number | null;
    sort_order?: number;
    image_url?: string | null;
    seo_title?: string | null;
    seo_description?: string | null;
    show_in_nav?: boolean;
    nav_label?: string | null;
    nav_order?: number;
    color?: string | null;
  }) =>
    request<{ ok: boolean; id: number }>("/categories/save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteCategory: (id: string | number) =>
    request<{ ok: boolean }>("/categories/delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  redirects: () => request<{ data: { id: number; from_path: string; to_path: string; status_code: number; article_id: number | null }[] }>("/redirects/list.php"),
  saveRedirect: (payload: { id?: number; from_path: string; to_path: string; status_code: 301 | 302; article_id?: number | null; is_active?: boolean }) =>
    request<{ ok: boolean; id: number }>("/admin/redirects-save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteRedirect: (id: number) =>
    request<{ ok: boolean }>("/admin/redirects-delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  tags: () => request<{ data: any[] }>("/tags/list.php"),
  saveTag: (payload: { id?: string | number; name: string; slug?: string; description?: string; category_ids?: (string | number)[] }) =>
    request<{ ok: boolean; id?: number }>("/tags/save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteTag: (id: string | number) =>
    request<{ ok: boolean }>("/tags/delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  mergeTags: (payload: { target_id: string | number; source_ids: (string | number)[] }) =>
    request<{ ok: boolean; target_id: number; target_name: string; merged: string[] }>("/tags/merge.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ── Story Series ────────────────────────────────────────────────────────────
  seriesList: () => request<{ data: any[] }>("/series/list.php"),
  saveSeries: (payload: {
    id?: string | number;
    name: string;
    slug?: string;
    description?: string | null;
    image_url?: string | null;
    is_active?: boolean;
    sort_order?: number;
    seo_title?: string | null;
    seo_description?: string | null;
  }) =>
    request<{ ok: boolean; id: number }>("/series/save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteSeries: (id: string | number) =>
    request<{ ok: boolean }>("/series/delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  cronHealth: () =>
    request<{
      jobs: Array<{ job_name: string; last_run_at: string | null; last_success_at: string | null; last_error: string | null; run_count: number; minutes_since_success: number | null; is_stale: boolean }>;
      recent_cache_invalidation_failures: Array<{ event: string; article_slug: string; outcome: string; http_code: number; detail: string | null; created_at: string }>;
    }>("/admin/cron-health.php"),
  homepage: () => request<{ data: Record<string, ApiArticleSummary[]> }>("/homepage.php"),
  ads: () => request<{ data: ApiAdSlot[] }>("/ads/list.php"),
  adminAds: () => request<{ data: ApiAdSlot[] }>("/admin/ads.php"),
  saveAdSlot: (payload: ApiAdSlot) =>
    request<{ ok: boolean; id: number }>("/admin/ads.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  adminHomepageSlots: () => request<{ data: Record<string, any[]>; slots: string[] }>("/admin/homepage-slots.php"),
  saveHomepageSlot: (slot_key: string, article_ids: Array<string | number>) =>
    request<{ ok: boolean }>("/admin/homepage-slots.php", {
      method: "POST",
      body: JSON.stringify({ slot_key, article_ids }),
    }),
  articles: (params = "") => request<{ data: ApiArticleSummary[] }>(`/articles/list.php${params}`),
  article: (slug: string) =>
    request<{ data: ApiArticle }>(`/articles/show.php?slug=${encodeURIComponent(slug)}`),
  articleById: (id: string | number) =>
    request<{ data: ApiArticle }>(`/articles/show.php?id=${encodeURIComponent(String(id))}`),
  articleRevisions: (id: string | number) =>
    request<{ data: any[] }>(`/articles/revisions.php?id=${encodeURIComponent(String(id))}`),
  liveUpdates: (article: { article_id?: string | number; slug?: string }) => {
    const params = new URLSearchParams();
    if (article.article_id) params.set("article_id", String(article.article_id));
    if (article.slug) params.set("slug", article.slug);
    return request<{ data: any[] }>(`/articles/live-updates.php?${params.toString()}`);
  },
  saveLiveUpdate: (payload: { article_id: string | number; update_title?: string; update_body: string }) =>
    request<{ ok: boolean; id: number }>("/articles/live-updates.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  saveArticle: (payload: Record<string, unknown>) =>
    request<{ id: number; slug: string }>("/articles/save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // Drafts: server-side autosave for editor
  saveDraft: (payload: { article_id?: number; content: string }) =>
    request<{ ok: boolean; id: number }>("/drafts_save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  loadDraft: (article_id?: number) =>
    request<{ data: { id: number; content: string; updated_at: string } | null }>(`/drafts_load.php?article_id=${encodeURIComponent(String(article_id ?? 0))}`),
  aiAssist: (payload: {
    task: "grammar" | "seo" | "headline" | "excerpt" | "fact_check" | "readability" | "seo_title" | "seo_description" | "field" | "paraphrase";
    title?: string;
    excerpt?: string;
    content?: string;
    focus_keyword?: string;
    field?: string;
    selected_text?: string;
  }) =>
    request<{ mode: "ai" | "local"; provider?: string; model?: string; suggestions: string[]; note?: string }>("/admin/ai-assist.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  reviewArticle: (id: number, decision: "approve" | "reject", notes = "") =>
    request<{ ok: boolean }>("/articles/review.php", {
      method: "POST",
      body: JSON.stringify({ id, decision, notes }),
    }),
  deleteArticle: (id: number) =>
    request<{ ok: boolean }>("/articles/delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  uploadMedia: (file: File, altText = "") => {
    const form = new FormData();
    form.append("file", file);
    form.append("alt_text", altText);
    return request<{ data: any }>("/media/upload.php", {
      method: "POST",
      body: form,
      skipJsonHeader: true,
    });
  },
  media: () => request<{ data: any[] }>("/media/list.php"),
  deleteMedia: (id: string | number) =>
    request<{ ok: boolean }>("/media/delete.php", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  points: () => request<{ points_per_article: number }>("/settings/points.php"),
  updatePoints: (points_per_article: number) =>
    request<{ ok: boolean; points_per_article: number }>("/settings/update-points.php", {
      method: "POST",
      body: JSON.stringify({ points_per_article }),
    }),
  dashboard: () => request<{ stats: any; recent: any[] }>("/admin/dashboard.php"),
  sitemapStatus: () =>
    request<{
      base_url: string;
      sitemaps: { label: string; url: string }[];
      stats: { published_indexed: number; published_excluded: number; news_eligible: number; categories: number; authors: number };
      recent: { title: string; slug: string; category_slug?: string | null; published_at: string }[];
    }>("/admin/sitemap-status.php"),
  myPoints: () => request<{ points: number; total_points_earned: number; history: any[] }>("/points/my.php"),
  author: (slug: string) =>
    request<{
      author: ApiAuthor | null;
      articles: Array<{
        id: number;
        slug: string;
        title: string;
        excerpt: string | null;
        featured_image: string | null;
        published_at: string | null;
      }>;
    }>(`/authors/show.php?slug=${encodeURIComponent(slug)}`),
  authors: () => request<{ data: any[] }>("/authors/list.php"),
  adminAuthors: () => request<{ data: any[] }>("/admin/authors.php"),
  saveAuthor: (payload: Record<string, unknown>) =>
    request<{ ok: boolean; id: number; slug: string }>("/admin/authors.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteAuthor: (id: string | number) =>
    request<{ ok: boolean }>("/admin/authors.php?action=delete", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  users: () => request<{ users: Array<ApiUser & { status?: string; created_at?: string }> }>("/admin/users.php"),
  toggleRole: (user_id: string | number, role: string, enabled: boolean) =>
    request<{ ok: boolean }>("/admin/toggle-role.php", {
      method: "POST",
      body: JSON.stringify({ user_id, role, enabled }),
    }),
  revokeSessions: (user_id: string | number) =>
    request<{ ok: boolean }>("/admin/revoke-sessions.php", {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),
  /* Careers desk. api/admin/jobs.php calls require_csrf_token() for every
     verb other than GET, so these writes must go through request() — a bare
     fetch() without the X-CSRF-Token header is rejected with 400. */
  adminJobs: () => request<{ data: any[] }>("/admin/jobs.php"),
  createJob: (payload: Record<string, unknown>) =>
    request<{ success: boolean; id: number }>("/admin/jobs.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateJob: (id: number, payload: Record<string, unknown>) =>
    request<{ success: boolean }>(`/admin/jobs.php?id=${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteJob: (id: number) =>
    request<{ success: boolean }>(`/admin/jobs.php?id=${id}`, { method: "DELETE" }),
  createJobsTable: () =>
    request<{ success: boolean }>("/admin/jobs.php", {
      method: "POST",
      body: JSON.stringify({ action: "create_table" }),
    }),
  rewardsLedger: () =>
    request<{
      rows: any[];
      leaders: any[];
      totals: { awarded: number; contributors: number; articles: number };
    }>("/admin/rewards-ledger.php"),
  subscribeNewsletter: (payload: { email: string; source?: string; category_slug?: string }) =>
    request<{ ok: boolean }>("/newsletters/subscribe.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  newsletters: () => request<{ data: any[]; total_subscribed: number }>("/admin/newsletters.php"),
  comments: (article: { article_id?: string | number; slug?: string }) => {
    const params = new URLSearchParams();
    if (article.article_id) params.set("article_id", String(article.article_id));
    if (article.slug) params.set("slug", article.slug);
    return request<{ data: any[] }>(`/comments/list.php?${params.toString()}`);
  },
  saveComment: (payload: { article_id?: string | number; slug?: string; body: string; guest_name?: string; guest_email?: string; parent_id?: number }) =>
    request<{ ok: boolean; status: string }>("/comments/save.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  bookmarkStatus: (article: { article_id?: string | number; slug?: string }) => {
    const params = new URLSearchParams();
    if (article.article_id) params.set("article_id", String(article.article_id));
    if (article.slug) params.set("slug", article.slug);
    return request<{ bookmarked: boolean }>(`/bookmarks/status.php?${params.toString()}`);
  },
  toggleBookmark: (payload: { article_id?: string | number; slug?: string }) =>
    request<{ bookmarked: boolean }>("/bookmarks/toggle.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  savedArticles: () => request<{ data: ApiArticleSummary[] }>("/bookmarks/list.php"),
  adminComments: (params: {
    status?: string;
    page?: number;
    limit?: number;
    q?: string;
    date_from?: string;
    date_to?: string;
  } = {}) => {
    const qs = new URLSearchParams();
    qs.set("status", params.status || "pending");
    if (params.page)      qs.set("page",      String(params.page));
    if (params.limit)     qs.set("limit",     String(params.limit));
    if (params.q)         qs.set("q",         params.q);
    if (params.date_from) qs.set("date_from", params.date_from);
    if (params.date_to)   qs.set("date_to",   params.date_to);
    return request<{ data: any[]; total: number; page: number; limit: number }>(
      `/admin/comments.php?${qs.toString()}`
    );
  },
  moderateComment: (id: string | number, status: "approved" | "rejected" | "spam") =>
    request<{ ok: boolean }>("/admin/comments.php", {
      method: "POST",
      body: JSON.stringify({ id, status }),
    }),
  moderateCommentsBulk: (ids: number[], status: "approved" | "rejected" | "spam") =>
    request<{ ok: boolean; updated: number }>("/admin/comments.php", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),
  siteSettings: () => request<{ settings: Record<string, string> }>("/site-settings.php"),
  adminSiteSettings: () => request<{ settings: Record<string, string> }>("/admin/site-settings.php"),
  saveSiteSettings: (payload: Record<string, string | boolean>) =>
    request<{ ok: boolean }>("/admin/site-settings.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  // Document locking — heartbeat to prevent two editors overwriting each other
  activeLocks: () =>
    request<{
      data: Array<{
        article_id: string;
        article_title: string;
        article_slug: string;
        article_status: string;
        editor_id: string;
        editor_name: string;
        editor_avatar: string | null;
        is_me: boolean;
        expires_at: string;
      }>;
    }>("/articles/locks.php"),

    lockArticle: (article_id: string | number) =>
    request<{
      locked: boolean;
      by_me: boolean;
      held_by?: string;
      held_by_avatar?: string | null;
      expires_at?: string;
    }>("/articles/lock.php", {
      method: "POST",
      body: JSON.stringify({ article_id }),
    }),
  releaseLock: (article_id: string | number) =>
    request<{ ok: boolean }>("/articles/lock.php", {
      method: "POST",
      body: JSON.stringify({ article_id, _method: "DELETE" }),
    }).catch(() => ({ ok: false })),

    collectAnalytics: (payload: Record<string, unknown>) =>
    request<{ ok: boolean }>("/analytics/collect.php", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  analyticsReport: (days = 30) =>
    request<{
      ok: boolean;
      days: number;
      total_views: number;
      unique_visitors: number;
      published_period: number;
      breaking_active: number;
      total_users: number;
      views_by_day: { day: string; views: number }[];
      top_articles: { path: string; slug: string; views: number }[];
      vitals: { metric_name: string; avg_val: number; cnt: number }[];
    }>(`/analytics/report.php?days=${days}`),
  /**
   * Triggers Next.js ISR on-demand revalidation for the given article/category.
   * Fire-and-forget — never throws so callers don't need try/catch.
   */
  cmsRevalidate: async (params: {
    articleSlug?: string;
    categorySlug?: string;
    authorSlug?: string;
    tagSlug?: string;
    tags?: string[];
  }): Promise<void> => {
    if (!hasSessionToken()) return;
    try {
      await fetch("/api/cms-revalidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(params),
      });
    } catch {
      // Best-effort — never block the UI
    }
  },
};
