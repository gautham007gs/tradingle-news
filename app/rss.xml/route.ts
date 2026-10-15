import { NextResponse } from "next/server";
import { absoluteUrl } from "../../lib/site";

// Legacy RSS URL — the canonical feed lives at /feed.xml. This preserves the
// old /rss.xml URL (previously routed to api/rss.php by .htaccess) so existing
// feed readers and bookmarks keep working without a dead link.
export async function GET() {
  return NextResponse.redirect(absoluteUrl("/feed.xml"), 301);
}
