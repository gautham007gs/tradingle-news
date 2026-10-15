const htmlTagPattern = /<\/?[a-z][\s\S]*>/i;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export const looksLikeHtml = (value?: string | null) => Boolean(value && htmlTagPattern.test(value));

export const legacyTextToHtml = (value?: string | null) => {
  if (!value?.trim()) return "";
  if (looksLikeHtml(value)) return value;

  return value
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("### ")) return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
      if (trimmed.startsWith("## ")) return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
      if (trimmed.startsWith("# ")) return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
      if (trimmed.startsWith("> ")) return `<blockquote>${escapeHtml(trimmed.slice(2))}</blockquote>`;
      return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("");
};

/**
 * Deterministic server-safe HTML sanitiser — produces identical output on
 * Node (SSR) and the browser so React never triggers a hydration mismatch.
 *
 * Multi-pass strategy:
 *   1. Null-byte / whitespace stripping (used in browser URL parsing)
 *   2. HTML comments and IE conditional comments (payload-hiding vectors)
 *   3. Strip script/style WITH their content
 *   4. Remove other inherently dangerous tags
 *   5. Strip ALL on* event-handler attributes
 *   6. Check href/src/action/formaction/poster/data attribute values against
 *      dangerous protocols — AFTER decoding HTML entities, which browsers
 *      evaluate before executing URLs (e.g. &#106;avascript: → javascript:)
 *   7. Remove CSS expression() / -moz-binding / url(javascript:) attacks
 *
 * NOTE: Do NOT switch to DOMParser/template here — browser re-serialisation
 * differs from the server regex pass and causes hydration mismatches on every
 * article with rich HTML content. Keep this regex-only.
 */

// ── Step 1: character-level canonicalisation ────────────────────────────────

/** Decode all HTML numeric/named entities into their literal characters.
 *  Used ONLY as an internal check — we never output this decoded value;
 *  we output the original (or a blocked placeholder). */
const decodeEntitiesForCheck = (raw: string): string =>
  raw
    // Hex entities: &#x6A; → j
    .replace(/&#x([0-9a-fA-F]{1,6});?/gi, (_, h) => {
      const cp = parseInt(h, 16);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    })
    // Decimal entities: &#106; → j
    .replace(/&#([0-9]{1,7});?/gi, (_, d) => {
      const cp = parseInt(d, 10);
      return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "";
    })
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    // Browsers strip whitespace and control characters inside URLs before parsing
    // eslint-disable-next-line no-control-regex -- intentionally stripping control chars for sanitization
    .replace(/[\u0000-\u0020\u007f]/g, "");

const DANGEROUS_PROTO_RE = /^(javascript|vbscript|data|blob)\s*:/i;

/** Replace dangerous URL protocols, even when entity-encoded.
 *  Matches: href="..", href='..', href=.. (unquoted) */
const sanitizeUrlAttrs = (html: string): string =>
  html.replace(
    /(\s+(?:href|src|action|formaction|poster|data|xlink:href|background)\s*=\s*)(["'`]?)([^"'`\s>]*)\2/gi,
    (fullMatch, attrPart, quote, value) => {
      const decoded = decodeEntitiesForCheck(value);
      return DANGEROUS_PROTO_RE.test(decoded)
        ? `${attrPart}${quote}#blocked${quote}`
        : fullMatch;
    },
  );

// ── Steps 2-7: regex filters ────────────────────────────────────────────────

// eslint-disable-next-line no-control-regex -- intentionally stripping null bytes for sanitization
const NULL_BYTE_RE     = /\x00/g;
const COMMENT_RE       = /<!--[\s\S]*?(?:-->|$)/g;
const IE_COND_RE       = /<!\[(?:if|endif)[^\]]*\]>/gi;
const SCRIPT_RE        = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi;
const STYLE_RE         = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi;
const DANGEROUS_TAGS_RE = /<\/?(iframe|object|embed|form|input|button|select|textarea|frame|frameset|applet|base|noscript|canvas|svg|math|xml|xsl|animate(?:Transform)?|set|discard|use|feImage|template|meta|link)\b[^>]*\/?>/gi;
const EVENT_HANDLER_RE  = /\s+on[a-zA-Z]{1,25}\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]+)/gi;
const CSS_EXPR_RE       = /\bexpression\s*\([^)]*\)/gi;
const CSS_BINDING_RE    = /\b-(?:moz|webkit)-binding\s*:[^;}"']*/gi;
const CSS_URL_PROTO_RE  = /\burl\s*\(\s*["'`]?\s*(?:javascript|vbscript|data)\s*:/gi;

const runAllPasses = (raw: string): string =>
  sanitizeUrlAttrs(
    raw
      .replace(NULL_BYTE_RE,      "")
      .replace(COMMENT_RE,        "")
      .replace(IE_COND_RE,        "")
      .replace(SCRIPT_RE,         "")
      .replace(STYLE_RE,          "")
      .replace(DANGEROUS_TAGS_RE, "")
      .replace(EVENT_HANDLER_RE,  "")
      .replace(CSS_EXPR_RE,       "")
      .replace(CSS_BINDING_RE,    "")
      .replace(CSS_URL_PROTO_RE,  "url(#blocked"),
  );

export const sanitizeArticleHtml = (value?: string | null): string => {
  if (!value) return "";
  // Two passes: the first removes surrounding context that might cause the
  // second pass to surface previously hidden patterns (e.g. nested comments).
  return runAllPasses(runAllPasses(value));
};
