import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getServerApiBase } from "../../../lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const authToken = auth.replace(/^Bearer\s+/i, "").trim();

  // Session credential now lives in the HttpOnly `tradingle_session` cookie set
  // by the PHP API — fall back to it when no Bearer header is present.
  const cookieToken = req.cookies.get("tradingle_session")?.value?.trim() || "";
  const sessionToken = authToken || cookieToken;

  if (!sessionToken) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiBase = getServerApiBase();
  const user: { id: number | null; roles: string[] } = { id: null, roles: [] };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${apiBase}/auth/me.php`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${sessionToken}`,
        ...(process.env.API_SECRET_KEY
          ? { "X-API-Key": process.env.API_SECRET_KEY }
          : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const me = data?.user ?? null;
      if (me?.id) {
        user.id = me.id;
        user.roles = Array.isArray(me.roles) ? me.roles.map(String) : [];
      }
    }
  } catch {
    // PHP API unreachable — deny
  }

  if (!user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Only staff who can publish content may trigger cache invalidation.
  // Without this any authenticated contributor could flush pages on demand.
  const allowedRoles = ["admin", "editor"];
  const isStaff = user.roles.some((role) =>
    allowedRoles.includes(role.toLowerCase())
  );
  if (!isStaff) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: {
    articleSlug?: string;
    categorySlug?: string;
    authorSlug?: string;
    tagSlug?: string;
    tags?: string[];
  } = {};

  try {
    body = await req.json();
  } catch {
    // empty body is fine — will revalidate shared feeds
  }

  const revalidated: string[] = [];
  const tag = (t: string) => {
    revalidateTag(t, "max");
    revalidated.push(t);
  };

  if (body.articleSlug) tag(`article:${body.articleSlug}`);
  if (body.categorySlug) tag(`category:${body.categorySlug}`);
  if (body.authorSlug) tag(`author:${body.authorSlug}`);
  if (body.tagSlug) tag(`tag:${body.tagSlug}`);

  if (Array.isArray(body.tags)) {
    for (const t of body.tags) {
      if (typeof t === "string" && t) tag(t);
    }
  }

  tag("home");
  tag("latest");
  tag("sitemap");

  return NextResponse.json({ revalidated, now: new Date().toISOString() });
}
