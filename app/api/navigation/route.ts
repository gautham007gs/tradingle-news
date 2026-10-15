import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession } from "../../../lib/adminAuth";
import { getServerApiBase } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Issue #10: nav/footer/social hrefs may only be root-relative paths (single
// leading slash) or absolute http(s) URLs. This blocks `javascript:`, `data:`,
// `vbscript:`, `blob:` and `//protocol-relative` hrefs from ever being stored.
const safeHref = (href: string) =>
  href.startsWith("/") ? !href.startsWith("//") : /^https?:\/\//i.test(href);

const navChildSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1).refine(safeHref, { message: "Only root-relative or http(s) URLs are allowed" }),
});

const navItemSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  href: z.string().min(1).refine(safeHref, { message: "Only root-relative or http(s) URLs are allowed" }),
  type: z.enum(["link", "section", "live"]),
  showInDesktopInline: z.boolean(),
  children: z.array(navChildSchema),
});

const footerColumnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  links: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), href: z.string().min(1).refine(safeHref, { message: "Only root-relative or http(s) URLs are allowed" }) })),
});

const footerLegalLinkSchema = z.object({ id: z.string().min(1), label: z.string().min(1), href: z.string().min(1).refine(safeHref, { message: "Only root-relative or http(s) URLs are allowed" }) });
const socialLinkSchema = z.object({ id: z.string().min(1), name: z.string().min(1), url: z.string().min(1).refine(safeHref, { message: "Only root-relative or http(s) URLs are allowed" }) });

const navigationDataSchema = z.object({
  primaryNav: z.array(navItemSchema),
  footerColumns: z.array(footerColumnSchema),
  footerLegalLinks: z.array(footerLegalLinkSchema),
  socialLinks: z.array(socialLinkSchema),
});

export async function GET() {
  const { getDefaultNavData } = await import("../../../lib/navData");
  try {
    const res = await fetch(`${getServerApiBase()}/navigation.php`, {
      headers: {
        Accept: "application/json",
        ...(process.env.API_SECRET_KEY ? { "X-API-Key": process.env.API_SECRET_KEY } : {}),
      },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json(getDefaultNavData());
    const { data } = await res.json();
    return NextResponse.json(data ?? getDefaultNavData());
  } catch {
    return NextResponse.json(getDefaultNavData());
  }
}

export async function POST(req: NextRequest) {
  const auth = await verifyAdminSession(req);
  if (auth.ok === false) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = navigationDataSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid navigation payload", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Resolve the session token (Bearer header, or the HttpOnly session cookie
  // sent on same-origin fetches) and forward it to the PHP save endpoint.
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const cookieHeader = req.headers.get("cookie") || "";
  const cookieToken =
    cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("tradingle_session="))
      ?.split("=").slice(1).join("=")
      .trim() ?? "";
  const sessionToken = bearer || cookieToken;
  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${getServerApiBase()}/admin/navigation-save.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
        ...(process.env.API_SECRET_KEY ? { "X-API-Key": process.env.API_SECRET_KEY } : {}),
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: "Save failed" }));
      return NextResponse.json({ message: body.message ?? "Save failed" }, { status: res.status });
    }
  } catch {
    return NextResponse.json({ message: "Failed to reach the navigation save API" }, { status: 502 });
  }

  // Revalidate site layout so navigation picks up changes
  revalidateTag("navigation", "max");
  revalidatePath("/", "layout");

  return NextResponse.json({ ok: true, saved: new Date().toISOString() });
}
