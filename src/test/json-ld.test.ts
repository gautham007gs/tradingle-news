import { describe, it, expect } from "vitest";
import { serializeJsonLd } from "../../lib/jsonLd";

/**
 * AUDIT_REPORT issue #2 (CRITICAL — stored XSS through JSON-LD).
 *
 * JSON.stringify() does not escape `<`, `>`, `&`, so CMS-controlled values
 * (headline, description, author name, tags, sponsor name, …) could terminate
 * the <script type="application/ld+json"> element early and inject HTML/JS.
 * serializeJsonLd() emits those characters as unicode escapes that are valid
 * JSON but harmless to the HTML parser.
 */

describe("serializeJsonLd", () => {
  it("escapes < so the script element cannot be terminated early", () => {
    const out = serializeJsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("</");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("escapes > and & too", () => {
    const out = serializeJsonLd({ desc: "a<b>c&d" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(out).not.toContain("&");
    expect(out).toContain("\\u003c");
    expect(out).toContain("\\u003e");
    expect(out).toContain("\\u0026");
  });

  it("escapes U+2028/U+2029 line separators", () => {
    const out = serializeJsonLd({ body: "line\u2028sep\u2029end" });
    expect(out).not.toContain("\u2028");
    expect(out).not.toContain("\u2029");
  });

  it("keeps plain JSON-LD structurally valid", () => {
    const out = serializeJsonLd({ "@context": "https://schema.org", "@type": "NewsArticle", headline: "Plain title" });
    expect(JSON.parse(out)).toEqual({ "@context": "https://schema.org", "@type": "NewsArticle", headline: "Plain title" });
  });

  it("does not double-escape already-escaped content", () => {
    const out = serializeJsonLd({ headline: "\\u003c" });
    expect(out).toContain("\\u003c");
    expect(JSON.parse(out).headline).toBe("\\u003c");
  });
});
