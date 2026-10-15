import { NextRequest, NextResponse } from "next/server";
import { fetchArticles } from "../../../lib/api";
import { summaryToStory } from "../../../lib/homepage";
import { fetchDeskFeed, resolveDeskHead } from "../../../lib/deskFeed";

export const dynamic = "force-dynamic";

/* Feed pagination for client "load more" controls.
   `desk` resolves through lib/deskFeed so a registry-only section paginates by
   the same rules as its server-rendered first page; `category`, `tag`, `author`
   and `q` are the direct passthroughs used by the archives, author pages and
   search. With none of them set the response is the chronological front — what
   /latest pages through. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const desk = searchParams.get("desk") || undefined;
  const category = searchParams.get("category") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const author = searchParams.get("author") || undefined;
  const q = searchParams.get("q") || undefined;
  const cursor = searchParams.get("cursor") || "0";
  const limitStr = searchParams.get("limit") || "20";
  const limit = Math.min(Math.max(1, Number(limitStr) || 20), 100);
  const offset = Math.max(0, Number(cursor) || 0);

  try {
    if (desk) {
      const head = await resolveDeskHead(desk);
      /* Unknown slug: an empty page, not a 502. The caller only ever asks for
         a slug it already rendered, so this is a stale-deploy case. */
      if (!head) return NextResponse.json({ items: [], nextCursor: null });
      const { items, nextCursor } = await fetchDeskFeed(head, { limit, offset });
      return NextResponse.json({ items: items.map(summaryToStory), nextCursor });
    }

    const result = await fetchArticles({ category, tag, author, q, limit, offset });
    return NextResponse.json({
      items: result.items.map(summaryToStory),
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch articles";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
