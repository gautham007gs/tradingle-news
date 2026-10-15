import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const revalidate = 0;
export const dynamicParams = true;

/** Prevent crawlers from indexing the legacy redirect URL itself. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Legacy /category/{slug} URLs.
 * 301 redirect to the new canonical category URL: /{slug}
 */
export default async function LegacyCategoryRedirect({ params }: PageProps) {
  const { slug } = await params;
  permanentRedirect(`/${slug}`);
}
