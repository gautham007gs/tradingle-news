import ClientShell from "../../components/layout/ClientShell";
import FooterServer from "../../components/layout/FooterServer";
import { fetchSiteSettings } from "../../lib/api";
import { readNavData } from "../../lib/navData";

const DEFAULT_SETTINGS = {
  homepage_seo_title: "Tradingle",
  homepage_seo_description: "Latest news",
  footer_tagline: "Breaking news, in-depth reporting and analysis.",
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

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, navData] = await Promise.allSettled([
    fetchSiteSettings(),
    Promise.resolve(readNavData()),
  ]);

  const resolvedSettings =
    settings.status === "fulfilled" ? settings.value : DEFAULT_SETTINGS;
  const resolvedNav =
    navData.status === "fulfilled" ? navData.value : null;

  return (
    <ClientShell navData={resolvedNav}>
      {children}
      <FooterServer settings={resolvedSettings} navData={resolvedNav} />
    </ClientShell>
  );
}
