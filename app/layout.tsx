import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "../src/index.css";
import "./globals.css";
import { fetchSiteSettings } from "../lib/api";

// Tradingle is intentionally light-only. Clear the legacy class before the
// first paint so old localStorage values cannot flash the previous dark shell.
const themeInitScript = `(function(){try{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';localStorage.setItem('trd-theme','light')}catch(e){}})();`;

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";

  // Fetch google-site-verification from Site Settings (silently skip on failure)
  let gVerify = "";
  try {
    const s = await fetchSiteSettings();
    gVerify = s.google_site_verification || "";
  } catch {
    // API unavailable — skip verification tag
  }

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "Tradingle — Precise Institutional Reporting",
      template: "%s | Tradingle",
    },
    description: "Breaking news, in-depth analysis and precise institutional reporting on India, markets, finance, technology and global affairs.",
    keywords: ["India news", "business news", "market analysis", "finance", "economy", "politics", "technology", "institutional reporting"],
    authors: [{ name: "Tradingle Editorial Team", url: siteUrl }],
    creator: "Tradingle Media Pvt. Ltd.",
    publisher: "Tradingle Media Pvt. Ltd.",
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: "Tradingle",
      title: "Tradingle — Precise Institutional Reporting",
      description: "Breaking news, in-depth analysis and precise institutional reporting on India, markets, finance and global affairs.",
      url: siteUrl,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Tradingle — Precise Institutional Reporting" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@tradingle",
      creator: "@tradingle",
      title: "Tradingle — Precise Institutional Reporting",
      description: "Breaking news, in-depth analysis and precise institutional reporting on India, markets, finance and global affairs.",
      images: ["/og-image.png"],
    },
    icons: {
      icon: { url: "/favicon.png", type: "image/png", sizes: "512x512" },
      apple: "/favicon.png",
    },
    alternates: { canonical: siteUrl },
    // Google Search Console verification — only emitted when set in Site Settings
    ...(gVerify ? { verification: { google: gVerify } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch site settings server-side for analytics script injection.
  // Silently skip if the API is unreachable (dev / build time).
  let ga4Id = "";
  let gtmId = "";
  let gVerify = "";
  try {
    const s = await fetchSiteSettings();
    ga4Id = s.ga4_measurement_id || "";
    gtmId = s.gtm_container_id || "";
    gVerify = s.google_site_verification || "";
  } catch {
    // API unavailable — skip analytics injection, keep rendering
  }

  return (
    <html lang="en-IN" dir="ltr" suppressHydrationWarning>
      <head>
        {/* Google site verification — only emitted when set in Site Settings */}
        {gVerify && (
          <meta name="google-site-verification" content={gVerify} />
        )}
        <link
          rel="preload"
          href="/assets/fonts/rubik-latin-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/fonts/rubik-latin-600-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/assets/fonts/rubik-latin-700-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="/assets/fonts/local-fonts.css"
          precedence="default"
        />
        <link
          rel="stylesheet"
          href="/critical-shell.css"
          precedence="default"
        />
        <link rel="preconnect" href="https://tradingle.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tradingle.com" />
        <link rel="preconnect" href="https://www.tradingle.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.tradingle.com" />
        {/* RSS autodiscovery — lets browsers and feed readers find the feed */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Tradingle — Latest News"
          href="/feed.xml"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {/* GA4 — loaded after interaction so it doesn't block LCP */}
        {ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">{`
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4Id}',{page_path:window.location.pathname});
            `}</Script>
          </>
        )}
        {children}
        <Script id="scroll-reveal" strategy="afterInteractive">{`
(function(){
  if(!('IntersectionObserver' in window))return;
  var sel=[
    '.trd-layout-tight-section',
    '.home-mini-cards-section',
    '.home-text-rails-section',
    '.home-mini-grid-section',
    '.home-before-picks',
    '.home-pillar-section'
  ];
  function observe(){
    var obs=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          e.target.classList.add('trd-scroll-revealed');
          e.target.classList.remove('trd-scroll-target');
          obs.unobserve(e.target);
        }
      });
    },{threshold:0.05,rootMargin:'0px 0px -24px 0px'});
    sel.forEach(function(s){
      document.querySelectorAll(s).forEach(function(el){
        if(!el.classList.contains('trd-scroll-revealed')){
          el.classList.add('trd-scroll-target');
          obs.observe(el);
        }
      });
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',observe);
  } else {
    observe();
  }
})();
        `}</Script>
      </body>
    </html>
  );
}
