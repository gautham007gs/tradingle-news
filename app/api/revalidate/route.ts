import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Health-check — requires the webhook secret so it is not an open probe
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, service: "revalidate" });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  let body: {
    event?: string;
    articleSlug?: string;
    categorySlug?: string;
    authorSlug?: string;
    tagSlug?: string;
    tags?: string[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const revalidated: string[] = [];

  const tag = (t: string) => {
    revalidateTag(t, "max");
    revalidated.push(t);
  };

  // Specific entity tags
  if (body.articleSlug) tag(`article:${body.articleSlug}`);
  if (body.categorySlug) tag(`category:${body.categorySlug}`);
  if (body.authorSlug) tag(`author:${body.authorSlug}`);
  if (body.tagSlug) tag(`tag:${body.tagSlug}`);

  // Explicit tag list from caller
  if (Array.isArray(body.tags)) {
    for (const t of body.tags) {
      if (typeof t === "string" && t) tag(t);
    }
  }

  // Always refresh shared feeds
  tag("home");
  tag("latest");
  tag("sitemap");
  tag("site-settings");

  return NextResponse.json({ revalidated, now: new Date().toISOString() });
}
