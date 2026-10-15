import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { hostingerApi } from "@/lib/hostingerApi";
import {
  Save, Settings, Globe, Palette, FileText, BarChart3, Share2, Building2, Megaphone,
} from "lucide-react";
import { resetPublicSettingsCache } from "@/lib/usePublicSiteSettings";
import { toast } from "sonner";

const defaults = {
  // Site status
  maintenance_enabled: "0",
  maintenance_message: "Tradingle is being updated. Please check back soon.",
  announcement_enabled: "0",
  announcement_text: "",
  // Site identity
  site_name: "Tradingle",
  site_tagline: "Breaking News, Live Updates & In-depth Analysis",
  site_logo_url: "",
  site_favicon_url: "",
  site_default_og_image: "",
  org_contact_email: "",
  org_phone: "",
  org_address: "",
  // Social profiles
  social_twitter: "",
  social_facebook: "",
  social_instagram: "",
  social_youtube: "",
  social_linkedin: "",
  social_threads: "",
  // Analytics
  ga4_measurement_id: "",
  gtm_container_id: "",
  google_site_verification: "",
  // Editorial workflow
  default_article_status: "draft",
  contributor_submit_status: "pending_review",
  // Display
  show_read_time: "0",
  show_view_count: "1",
  // Branding
  primary_color: "",
  accent_color: "",
  // Homepage SEO
  homepage_seo_title: "Breaking News, Live Updates, India & World News",
  homepage_seo_description:
    "Tradingle delivers breaking news, live updates, in-depth analysis on India, world affairs, business, technology, sports, and entertainment.",
  footer_tagline:
    "Tradingle brings you breaking news, live updates, and in-depth analysis on politics, business, sports, entertainment, and more.",
  // Google News sitemap
  news_sitemap_window_hours: "48",
  // Homepage labels
  spotlight_label: "Spotlight",
  spotlight_kicker: "Analyses, Explainers, Exclusives",
  more_for_you_title: "More for You",
  // Ads & monetization
  adsense_publisher_id: "",
  ads_txt_extra: "",
  // Comments
  comment_blocklist: "",
};

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-4 py-3 border-b bg-muted/30">
      <div className="font-semibold text-sm">{title}</div>
      {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
    </div>
  );
}

function SettingRow({
  label, hint, children, noBorder,
}: { label: string; hint?: string; children: React.ReactNode; noBorder?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-6 px-4 py-3.5 ${noBorder ? "" : "border-b"}`}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-none">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1 leading-snug">{hint}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function SettingBlock({ children }: { children: React.ReactNode }) {
  return <div className="border border-border rounded-lg overflow-hidden">{children}</div>;
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3.5 border-b last:border-0">
      <Label className="text-xs font-semibold block mb-1.5">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground mb-2">{hint}</p>}
      {children}
    </div>
  );
}

const SiteSettings = () => {
  const [settings, setSettings] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hostingerApi.adminSiteSettings()
      .then(({ settings: s }) => {
        setSettings((prev) => ({ ...prev, ...s }));
        setLoading(false);
      })
      .catch((error: any) => {
        toast.error(error?.message || "Could not load site settings.");
        setLoading(false);
      });
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setBusy(true);
    try {
      await hostingerApi.saveSiteSettings(settings);
      resetPublicSettingsCache();
      hostingerApi.cmsRevalidate({ tags: ["site-settings", "home"] });
      toast.success("Settings saved");
    } catch (error: any) {
      toast.error(error?.message || "Could not save settings.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Site Settings</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage site-wide configuration</p>
          </div>
        </div>
        <Button onClick={save} disabled={busy} size="sm">
          <Save className="w-3.5 h-3.5 mr-1.5" />
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
            <Globe className="w-3.5 h-3.5" /> General
          </TabsTrigger>
          <TabsTrigger value="identity" className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" /> Identity
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1.5 text-xs">
            <Share2 className="w-3.5 h-3.5" /> Social
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> SEO
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-1.5 text-xs">
            <Palette className="w-3.5 h-3.5" /> Branding
          </TabsTrigger>
          <TabsTrigger value="monetization" className="flex items-center gap-1.5 text-xs">
            <Megaphone className="w-3.5 h-3.5" /> Monetization
          </TabsTrigger>
        </TabsList>

        {/* ─── GENERAL ─── */}
        <TabsContent value="general" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Site Status" />
            <SettingRow label="Maintenance mode" hint="Public pages show a maintenance screen; admin access stays open.">
              <Switch checked={settings.maintenance_enabled === "1"} onCheckedChange={c => update("maintenance_enabled", c ? "1" : "0")} />
            </SettingRow>
            {settings.maintenance_enabled === "1" && (
              <div className="px-4 py-3 border-b bg-muted/20">
                <Label htmlFor="sitesettings-maintenance-message-1" className="text-xs font-semibold">Maintenance message</Label>
                <Textarea id="sitesettings-maintenance-message-1" rows={2} value={settings.maintenance_message} onChange={e => update("maintenance_message", e.target.value)} className="mt-2 text-sm" />
              </div>
            )}
            <SettingRow label="Announcement bar" hint="Shows a banner at the top of the homepage." noBorder>
              <Switch checked={settings.announcement_enabled === "1"} onCheckedChange={c => update("announcement_enabled", c ? "1" : "0")} />
            </SettingRow>
            {settings.announcement_enabled === "1" && (
              <div className="px-4 py-3 bg-muted/20">
                <Label htmlFor="sitesettings-announcement-text-2" className="text-xs font-semibold">Announcement text</Label>
                <Input id="sitesettings-announcement-text-2" value={settings.announcement_text} onChange={e => update("announcement_text", e.target.value)} placeholder="Breaking: …" className="mt-2 text-sm" />
              </div>
            )}
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Editorial Workflow" />
            <div className="px-4 py-3.5 border-b">
              <Label className="text-xs font-semibold block mb-2">Default staff article status</Label>
              <Select value={settings.default_article_status} onValueChange={v => update("default_article_status", v)}>
                <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft — editable, not published</SelectItem>
                  <SelectItem value="pending_review">Pending review — awaiting editor</SelectItem>
                  <SelectItem value="published">Published — live immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="px-4 py-3.5">
              <Label className="text-xs font-semibold block mb-2">Contributor submit status</Label>
              <Select value={settings.contributor_submit_status} onValueChange={v => update("contributor_submit_status", v)}>
                <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_review">Pending review — must be approved</SelectItem>
                  <SelectItem value="draft">Draft — editor publishes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Article Display" />
            <SettingRow label="Show read time" hint="Display estimated read time on cards and article pages.">
              <Switch checked={settings.show_read_time === "1"} onCheckedChange={c => update("show_read_time", c ? "1" : "0")} />
            </SettingRow>
            <SettingRow label="Show view counts" hint="Display view count on cards and article pages." noBorder>
              <Switch checked={settings.show_view_count === "1"} onCheckedChange={c => update("show_view_count", c ? "1" : "0")} />
            </SettingRow>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Comment Moderation" description="Automatic spam protection for reader comments." />
            <FieldGroup
              label="Keyword blocklist"
              hint="Comma-separated words or phrases. Comments containing any of these are automatically flagged as spam."
            >
              <Textarea
                rows={3}
                value={settings.comment_blocklist}
                onChange={e => update("comment_blocklist", e.target.value)}
                placeholder="casino, viagra, click here, buy now, …"
                className="text-sm font-mono"
              />
              {settings.comment_blocklist && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {settings.comment_blocklist.split(",").filter(w => w.trim()).length} blocked keyword{settings.comment_blocklist.split(",").filter(w => w.trim()).length !== 1 ? "s" : ""}
                </p>
              )}
            </FieldGroup>
          </SettingBlock>
        </TabsContent>

        {/* ─── IDENTITY ─── */}
        <TabsContent value="identity" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Site Identity" description="Used in JSON-LD schema, OG tags, and site headers." />
            <FieldGroup label="Site name">
              <Input value={settings.site_name} onChange={e => update("site_name", e.target.value)} className="text-sm" placeholder="Tradingle" />
            </FieldGroup>
            <FieldGroup label="Site tagline" hint="One-sentence description of the publication.">
              <Input value={settings.site_tagline} onChange={e => update("site_tagline", e.target.value)} className="text-sm" />
            </FieldGroup>
            <FieldGroup label="Logo URL" hint="Full URL to your logo image (SVG or PNG, min 200px wide).">
              <Input value={settings.site_logo_url} onChange={e => update("site_logo_url", e.target.value)} className="text-sm font-mono" placeholder="https://tradingle.com/logo.png" />
              {settings.site_logo_url && (
                <img src={settings.site_logo_url} alt="Logo preview" className="mt-2 h-10 object-contain border rounded p-1 bg-white" onError={e => (e.currentTarget.style.display = "none")} />
              )}
            </FieldGroup>
            <FieldGroup label="Favicon URL" hint="URL to favicon (ICO or PNG, 32×32).">
              <Input value={settings.site_favicon_url} onChange={e => update("site_favicon_url", e.target.value)} className="text-sm font-mono" placeholder="https://tradingle.com/favicon.ico" />
            </FieldGroup>
            <FieldGroup label="Default OG / social image" hint="Fallback image for pages without a featured image (1200×630px recommended).">
              <Input value={settings.site_default_og_image} onChange={e => update("site_default_og_image", e.target.value)} className="text-sm font-mono" placeholder="https://tradingle.com/og-default.jpg" />
              {settings.site_default_og_image && (
                <img src={settings.site_default_og_image} alt="OG preview" className="mt-2 w-full max-w-sm aspect-[1.91/1] object-cover border rounded" onError={e => (e.currentTarget.style.display = "none")} />
              )}
            </FieldGroup>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Organization Info" description="Used in structured data (Schema.org NewsMediaOrganization)." />
            <FieldGroup label="Contact email">
              <Input type="email" value={settings.org_contact_email} onChange={e => update("org_contact_email", e.target.value)} className="text-sm" placeholder="editorial@tradingle.com" />
            </FieldGroup>
            <FieldGroup label="Phone number">
              <Input value={settings.org_phone} onChange={e => update("org_phone", e.target.value)} className="text-sm" placeholder="+91 98765 43210" />
            </FieldGroup>
            <FieldGroup label="Address">
              <Textarea rows={2} value={settings.org_address} onChange={e => update("org_address", e.target.value)} className="text-sm" placeholder="123 Press Lane, Mumbai, India 400001" />
            </FieldGroup>
          </SettingBlock>
        </TabsContent>

        {/* ─── SOCIAL ─── */}
        <TabsContent value="social" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Social Media Profiles" description="Used for Twitter card metadata, JSON-LD, and sharing attribution." />
            <FieldGroup label="X / Twitter handle" hint="Without the @ sign — used as twitter:site meta tag.">
              <div className="flex">
                <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">@</span>
                <Input value={settings.social_twitter} onChange={e => update("social_twitter", e.target.value)} className="rounded-l-none text-sm" placeholder="tradingle" />
              </div>
            </FieldGroup>
            <FieldGroup label="Facebook page URL">
              <Input value={settings.social_facebook} onChange={e => update("social_facebook", e.target.value)} className="text-sm font-mono" placeholder="https://facebook.com/tradingle" />
            </FieldGroup>
            <FieldGroup label="Instagram URL">
              <Input value={settings.social_instagram} onChange={e => update("social_instagram", e.target.value)} className="text-sm font-mono" placeholder="https://instagram.com/tradingle" />
            </FieldGroup>
            <FieldGroup label="YouTube channel URL">
              <Input value={settings.social_youtube} onChange={e => update("social_youtube", e.target.value)} className="text-sm font-mono" placeholder="https://youtube.com/@tradingle" />
            </FieldGroup>
            <FieldGroup label="LinkedIn page URL">
              <Input value={settings.social_linkedin} onChange={e => update("social_linkedin", e.target.value)} className="text-sm font-mono" placeholder="https://linkedin.com/company/tradingle" />
            </FieldGroup>
            <FieldGroup label="Threads URL">
              <Input value={settings.social_threads} onChange={e => update("social_threads", e.target.value)} className="text-sm font-mono" placeholder="https://threads.net/@tradingle" />
            </FieldGroup>
          </SettingBlock>
        </TabsContent>

        {/* ─── ANALYTICS ─── */}
        <TabsContent value="analytics" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Google Analytics 4" description="Paste your Measurement ID to enable GA4 tracking." />
            <FieldGroup label="Measurement ID" hint="Format: G-XXXXXXXXXX — found in GA4 Admin → Data Streams.">
              <Input value={settings.ga4_measurement_id} onChange={e => update("ga4_measurement_id", e.target.value)} className="text-sm font-mono" placeholder="G-XXXXXXXXXX" />
            </FieldGroup>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Google Tag Manager" description="Add GTM to manage multiple tags from one place." />
            <FieldGroup label="Container ID" hint="Format: GTM-XXXXXXX — found in GTM workspace settings.">
              <Input value={settings.gtm_container_id} onChange={e => update("gtm_container_id", e.target.value)} className="text-sm font-mono" placeholder="GTM-XXXXXXX" />
            </FieldGroup>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Google Search Console" />
            <FieldGroup label="Site verification meta tag value" hint="Add the content= value from the Google HTML tag verification method.">
              <Input value={settings.google_site_verification} onChange={e => update("google_site_verification", e.target.value)} className="text-sm font-mono" placeholder="abc123xyz..." />
            </FieldGroup>
          </SettingBlock>

          <div className="rounded-md border bg-blue-50/60 p-4 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">How analytics works on Tradingle</p>
            <p>The site collects Core Web Vitals and page-view events natively. You can view them in <strong>Insights → Analytics</strong>. Connect GA4 or GTM above for richer audience reports.</p>
          </div>
        </TabsContent>

        {/* ─── SEO ─── */}
        <TabsContent value="seo" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Homepage & Default SEO" />
            <div className="px-4 py-3.5 border-b">
              <Label htmlFor="sitesettings-seo-title-3" className="text-xs font-semibold block mb-2">SEO title</Label>
              <Input id="sitesettings-seo-title-3" value={settings.homepage_seo_title} onChange={e => update("homepage_seo_title", e.target.value)} maxLength={70} className="text-sm" />
              <p className={`text-xs mt-1 ${settings.homepage_seo_title.length > 60 ? "text-amber-600" : "text-muted-foreground"}`}>{settings.homepage_seo_title.length}/70 chars (ideal: 50–60)</p>
            </div>
            <div className="px-4 py-3.5 border-b">
              <Label htmlFor="sitesettings-meta-description-4" className="text-xs font-semibold block mb-2">Meta description</Label>
              <Textarea id="sitesettings-meta-description-4" rows={3} value={settings.homepage_seo_description} onChange={e => update("homepage_seo_description", e.target.value)} maxLength={160} className="text-sm" />
              <p className={`text-xs mt-1 ${settings.homepage_seo_description.length > 155 ? "text-amber-600" : "text-muted-foreground"}`}>
                {settings.homepage_seo_description.length}/160 chars
              </p>
            </div>
            <div className="px-4 py-3.5">
              <Label htmlFor="sitesettings-footer-tagline-5" className="text-xs font-semibold block mb-2">Footer tagline</Label>
              <Textarea id="sitesettings-footer-tagline-5" rows={2} value={settings.footer_tagline} onChange={e => update("footer_tagline", e.target.value)} className="text-sm" />
            </div>
            <div className="px-4 py-3.5">
              <Label htmlFor="sitesettings-google-news-sitemap-window-6" className="text-xs font-semibold block mb-2">Google News sitemap window (hours)</Label>
              <Input id="sitesettings-google-news-sitemap-window-6"
                type="number"
                min={1}
                value={settings.news_sitemap_window_hours}
                onChange={e => update("news_sitemap_window_hours", e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Only articles published within this window appear in sitemap-news. Default: 48.</p>
            </div>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="Homepage Labels" description="Curate story slots in Homepage Curation." />
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border-b">
              <div className="px-4 py-3.5">
                <Label htmlFor="sitesettings-spotlight-label-7" className="text-xs font-semibold block mb-2">Spotlight label</Label>
                <Input id="sitesettings-spotlight-label-7" value={settings.spotlight_label} onChange={e => update("spotlight_label", e.target.value)} className="text-sm" />
              </div>
              <div className="px-4 py-3.5">
                <Label htmlFor="sitesettings-spotlight-kicker-8" className="text-xs font-semibold block mb-2">Spotlight kicker</Label>
                <Input id="sitesettings-spotlight-kicker-8" value={settings.spotlight_kicker} onChange={e => update("spotlight_kicker", e.target.value)} className="text-sm" />
              </div>
            </div>
            <div className="px-4 py-3.5">
              <Label htmlFor="sitesettings-more-for-you-section-9" className="text-xs font-semibold block mb-2">"More for you" section title</Label>
              <Input id="sitesettings-more-for-you-section-9" value={settings.more_for_you_title} onChange={e => update("more_for_you_title", e.target.value)} className="text-sm" />
            </div>
          </SettingBlock>
        </TabsContent>

        {/* ─── BRANDING ─── */}
        <TabsContent value="branding" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Brand Colors" description="HSL format: H S% L% — e.g. 350 72% 48%" />
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="px-4 py-3.5">
                <Label htmlFor="sitesettings-primary-brand-color-10" className="text-xs font-semibold block mb-2">Primary brand color</Label>
                <Input id="sitesettings-primary-brand-color-10" value={settings.primary_color} onChange={e => update("primary_color", e.target.value)} placeholder="350 72% 48%" className="font-mono text-sm" />
                {settings.primary_color && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded border flex-shrink-0" style={{ backgroundColor: `hsl(${settings.primary_color})` }} />
                    <span className="text-xs text-muted-foreground">Preview</span>
                  </div>
                )}
              </div>
              <div className="px-4 py-3.5">
                <Label htmlFor="sitesettings-accent-color-optional-11" className="text-xs font-semibold block mb-2">Accent color <span className="font-normal text-muted-foreground">(optional)</span></Label>
                <Input id="sitesettings-accent-color-optional-11" value={settings.accent_color} onChange={e => update("accent_color", e.target.value)} placeholder="42 90% 56%" className="font-mono text-sm" />
                {settings.accent_color && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="w-6 h-6 rounded border flex-shrink-0" style={{ backgroundColor: `hsl(${settings.accent_color})` }} />
                    <span className="text-xs text-muted-foreground">Preview</span>
                  </div>
                )}
              </div>
            </div>
          </SettingBlock>
        </TabsContent>

        {/* ─── MONETIZATION ─── */}
        <TabsContent value="monetization" className="space-y-5 mt-4">
          <SettingBlock>
            <SectionHeader title="Google AdSense" description="Used to auto-generate ads.txt and verify publisher." />
            <FieldGroup label="Publisher ID" hint="Format: pub-XXXXXXXXXXXXXXXX — found in AdSense account settings.">
              <Input value={settings.adsense_publisher_id} onChange={e => update("adsense_publisher_id", e.target.value)} className="text-sm font-mono" placeholder="pub-1234567890123456" />
            </FieldGroup>
          </SettingBlock>

          <SettingBlock>
            <SectionHeader title="ads.txt Extra Entries" description="Additional lines to append to /ads.txt (one entry per line)." />
            <div className="px-4 py-3.5">
              <Textarea
                rows={5}
                value={settings.ads_txt_extra}
                onChange={e => update("ads_txt_extra", e.target.value)}
                className="text-sm font-mono"
                placeholder={"google.com, pub-XXXX, DIRECT, f08c47fec0942fa0\nadserver.example.com, 12345, RESELLER"}
              />
              <p className="text-xs text-muted-foreground mt-1">Manage ad slots in <strong>Settings → Ad Slots</strong>.</p>
            </div>
          </SettingBlock>
        </TabsContent>
      </Tabs>

      {/* Sticky save */}
      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={busy}>
          <Save className="w-4 h-4 mr-2" />
          {busy ? "Saving…" : "Save all settings"}
        </Button>
      </div>
    </div>
  );
};

export default SiteSettings;
