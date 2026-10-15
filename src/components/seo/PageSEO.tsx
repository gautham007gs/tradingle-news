import { useEffect } from "react";

import { edgeSeoMatchesProps, readEdgeSeoPayload } from "@/lib/edgeSeo";

import { SITE_URL } from "@/lib/siteUrl";



interface PageSEOProps {

  title: string;

  description: string;

  canonical: string;

  type?: "website" | "article";

  image?: string;

  article?: {

    author: string;

    authorSlug?: string;

    publishedTime: string;

    modifiedTime?: string;

    section: string;

    tags: string[];

    body: string;

    schemaType?: string;

    wordCount?: number;

  };

  noindex?: boolean;

  nofollow?: boolean;

}



const SITE_NAME = "Tradingle";

const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

const TWITTER_HANDLE = "@tradingle";



/** Insert SEO-critical nodes immediately after <title> to stay above the 2MB head horizon. */

const insertEarlyInHead = (node: Node) => {

  const titleEl = document.querySelector("title");

  if (titleEl?.nextSibling) {

    document.head.insertBefore(node, titleEl.nextSibling);

  } else if (titleEl) {

    document.head.appendChild(node);

  } else {

    document.head.prepend(node);

  }

};



/**

 * Dynamic SEO head manager — sets meta tags, canonical, OG, Twitter, JSON-LD,

 * and additional SEO signals for maximum search engine visibility.

 *

 * Harmonizes with PHP edge injection via window.__TRD_EDGE_SEO__: when server

 * metadata already matches client props, DOM updates are skipped to prevent flicker.

 */

const PageSEO = ({ title, description, canonical, type = "website", image, article, noindex = false, nofollow = false }: PageSEOProps) => {

  useEffect(() => {

    const edge = readEdgeSeoPayload();

    if (edge && edgeSeoMatchesProps(edge, { title, description, canonical, type, image, noindex, nofollow })) {

      return;

    }



    const fullTitle = `${title} | ${SITE_NAME}`;

    const fullCanonical = canonical.startsWith("http") ? canonical : `${SITE_URL}${canonical}`;

    const ogImage = image || DEFAULT_IMAGE;

    const fullDesc = description.replace(/\s+/g, " ").trim();

    const truncatedDesc = fullDesc.length > 160 ? fullDesc.slice(0, 157) + "..." : fullDesc;

    const isHomepage = canonical === "/" || fullCanonical === `${SITE_URL}/`;



    document.title = fullTitle;



    const setMeta = (attr: string, key: string, content: string) => {

      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;

      if (!el) {

        el = document.createElement("meta");

        el.setAttribute(attr, key);

        insertEarlyInHead(el);

      }

      el.setAttribute("content", content);

      el.setAttribute("data-page-seo", "true");

    };



    setMeta("name", "description", truncatedDesc);

    setMeta("name", "author", SITE_NAME);



    const robotsValue = noindex || nofollow

      ? `${noindex ? "noindex" : "index"}, ${nofollow ? "nofollow" : "follow"}, max-image-preview:large`

      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

    setMeta("name", "robots", robotsValue);

    setMeta("name", "googlebot", robotsValue);



    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

    if (!canonicalEl) {

      canonicalEl = document.createElement("link");

      canonicalEl.setAttribute("rel", "canonical");

      insertEarlyInHead(canonicalEl);

    }

    canonicalEl.setAttribute("href", fullCanonical);

    canonicalEl.setAttribute("data-page-seo", "true");



    let rssEl = document.querySelector('link[rel="alternate"][type="application/rss+xml"]') as HTMLLinkElement | null;

    if (!rssEl) {

      rssEl = document.createElement("link");

      rssEl.setAttribute("rel", "alternate");

      rssEl.setAttribute("type", "application/rss+xml");

      rssEl.setAttribute("title", "Tradingle RSS");

      document.head.appendChild(rssEl);

    }

    rssEl.setAttribute("href", `${SITE_URL}/rss.xml`);



    setMeta("property", "og:title", fullTitle);

    setMeta("property", "og:description", fullDesc);

    setMeta("property", "og:url", fullCanonical);

    setMeta("property", "og:type", type === "article" ? "article" : "website");

    setMeta("property", "og:image", ogImage);

    setMeta("property", "og:image:width", "1200");

    setMeta("property", "og:image:height", "630");

    setMeta("property", "og:image:alt", title);

    setMeta("property", "og:site_name", SITE_NAME);

    setMeta("property", "og:locale", "en_IN");



    document.querySelectorAll('meta[property="article:tag"]').forEach((node) => node.remove());



    if (type === "article" && article) {

      setMeta("property", "article:published_time", article.publishedTime);

      if (article.modifiedTime) {

        setMeta("property", "article:modified_time", article.modifiedTime);

      }

      setMeta("property", "article:author", article.author);

      setMeta("property", "article:section", article.section);

      article.tags.forEach((tag) => {

        const tagEl = document.createElement("meta");

        tagEl.setAttribute("property", "article:tag");

        tagEl.setAttribute("content", tag);

        tagEl.setAttribute("data-page-seo", "true");

        insertEarlyInHead(tagEl);

      });

      if (article.tags.length > 0) {

        setMeta("name", "keywords", article.tags.join(", "));

      }

    }



    setMeta("name", "twitter:card", "summary_large_image");

    setMeta("name", "twitter:site", TWITTER_HANDLE);

    setMeta("name", "twitter:creator", TWITTER_HANDLE);

    setMeta("name", "twitter:title", fullTitle);

    setMeta("name", "twitter:description", fullDesc);

    setMeta("name", "twitter:image", ogImage);

    setMeta("name", "twitter:image:alt", title);



    const existingLd = document.querySelector('script[data-page-seo="true"]');

    if (existingLd) existingLd.remove();



    const ldScript = document.createElement("script");

    ldScript.setAttribute("type", "application/ld+json");

    ldScript.setAttribute("data-page-seo", "true");



    if (type === "article" && article) {

      const authorSlug = article.authorSlug || article.author.toLowerCase().replace(/\s+/g, "-");

      const headline = title.length > 110 ? title.slice(0, 107) + "..." : title;

      ldScript.textContent = JSON.stringify({

        "@context": "https://schema.org",

        "@graph": [

          {

            "@type": article.schemaType || "NewsArticle",

            "@id": `${fullCanonical}#article`,

            headline,

            description: truncatedDesc,

            image: [ogImage],

            datePublished: article.publishedTime,

            dateModified: article.modifiedTime || article.publishedTime,

            author: {

              "@type": "Person",

              name: article.author,

              url: `${SITE_URL}/author/${authorSlug}`,

            },

            publisher: {

              "@type": "NewsMediaOrganization",

              name: SITE_NAME,

              url: SITE_URL,

              logo: {

                "@type": "ImageObject",

                url: `${SITE_URL}/logo.png`,

                width: 512,

                height: 512,

              },

            },

            mainEntityOfPage: {

              "@type": "WebPage",

              "@id": fullCanonical,

            },

            articleSection: article.section,

            keywords: article.tags.join(", "),

            articleBody: article.body,

            wordCount: article.wordCount,

            inLanguage: "en-IN",

            isAccessibleForFree: true,

          },

          {

            "@type": "BreadcrumbList",

            "@id": `${fullCanonical}#breadcrumb`,

            itemListElement: [

              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },

              { "@type": "ListItem", position: 2, name: article.section, item: `${SITE_URL}/${article.section.toLowerCase().replace(/\s+/g, "-")}` },

              { "@type": "ListItem", position: 3, name: headline, item: fullCanonical },

            ],

          },

        ],

      });

    } else {

      const breadcrumbs = canonical.split("/").filter(Boolean);

      const breadcrumbItems = [

        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },

        ...breadcrumbs.map((crumb, i) => ({

          "@type": "ListItem",

          position: i + 2,

          name: crumb.charAt(0).toUpperCase() + crumb.slice(1).replace(/-/g, " "),

          item: `${SITE_URL}/${breadcrumbs.slice(0, i + 1).join("/")}`,

        })),

      ];



      const graph: Record<string, unknown>[] = [

        {

          "@type": "WebPage",

          "@id": fullCanonical,

          name: title,

          description: truncatedDesc,

          url: fullCanonical,

          inLanguage: "en-IN",

          isPartOf: { "@id": `${SITE_URL}/#website` },

          breadcrumb: { "@id": `${fullCanonical}#breadcrumb` },

        },

        {

          "@type": "BreadcrumbList",

          "@id": `${fullCanonical}#breadcrumb`,

          itemListElement: breadcrumbItems,

        },

      ];



      if (!isHomepage) {

        graph.push(

          {

            "@type": "WebSite",

            "@id": `${SITE_URL}/#website`,

            url: SITE_URL,

            name: SITE_NAME,

            description: "Breaking news, live updates, and in-depth analysis",

            publisher: { "@id": `${SITE_URL}/#organization` },

            potentialAction: {

              "@type": "SearchAction",

              target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },

              "query-input": "required name=search_term_string",

            },

          },

          {

            "@type": "NewsMediaOrganization",

            "@id": `${SITE_URL}/#organization`,

            name: SITE_NAME,

            url: SITE_URL,

            logo: {

              "@type": "ImageObject",

              url: `${SITE_URL}/logo.png`,

              width: 512,

              height: 512,

            },

            sameAs: [

              "https://twitter.com/tradingle",

              "https://facebook.com/tradingle",

              "https://instagram.com/tradingle",

              "https://linkedin.com/company/tradingle",

            ],

          },

        );

      }



      ldScript.textContent = JSON.stringify({

        "@context": "https://schema.org",

        "@graph": graph,

      });

    }



    insertEarlyInHead(ldScript);



    return () => {

      document.querySelectorAll('script[data-page-seo="true"]:not([data-edge-seo="true"])').forEach((node) => node.remove());

      document.querySelectorAll('meta[data-page-seo="true"]:not([data-edge-seo="true"])').forEach((node) => node.remove());

      document.querySelectorAll('link[data-page-seo="true"]:not([data-edge-seo="true"])').forEach((node) => node.remove());

      document.querySelectorAll('meta[property="article:tag"]:not([data-edge-seo="true"])').forEach((node) => node.remove());

    };

  }, [title, description, canonical, type, image, article, noindex, nofollow]);



  return null;

};



export default PageSEO;

