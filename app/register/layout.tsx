import type { Metadata } from "next";
import ClientShell from "../../components/layout/ClientShell";
import FooterServer from "../../components/layout/FooterServer";
import { fetchSiteSettings } from "../../lib/api";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const DEFAULT_SETTINGS = {
  homepage_seo_title: "Tradingle",
  homepage_seo_description: "Latest news",
  footer_tagline: "Independent journalism for the digital age.",
  spotlight_label: "Spotlight",
  spotlight_kicker: "Featured",
  more_for_you_title: "More For You",
  show_read_time: "1",
  show_view_count: "1",
  site_name: "Tradingle",
  maintenance_enabled: "0",
  maintenance_message: "",
  site_default_og_image: "",
  site_logo_url: "",
  social_twitter: "",
  ga4_measurement_id: "",
  gtm_container_id: "",
  google_site_verification: "",
  news_sitemap_window_hours: "48",
};

export default async function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await fetchSiteSettings().catch(() => DEFAULT_SETTINGS);
  return (
    <ClientShell>
      {children}
      <FooterServer settings={settings} />
    </ClientShell>
  );
}
