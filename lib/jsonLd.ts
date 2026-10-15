/**
 * Safe JSON-LD serialization.
 *
 * JSON-LD is embedded in the page via a <script type="application/ld+json">
 * element. `JSON.stringify` does NOT escape `<`, `>`, `&`, so CMS-controlled
 * values (headline, description, author name, tags, sponsor name, etc.) could
 * terminate the <script> element early and inject arbitrary HTML/JS — stored
 * XSS. Every value in the document flows through this serializer before it is
 * placed in the document, so those characters are emitted as unicode escapes
 * which are valid JSON and harmless to the HTML parser.
 *
 * See AUDIT_REPORT issue #2 (CRITICAL — stored XSS through JSON-LD).
 */

export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
