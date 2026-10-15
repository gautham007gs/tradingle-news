/**
 * SEO Utilities
 * Handles structured data, meta tags, and SEO best practices
 */

export interface ArticleSchema {
  "@context": string;
  "@type": string;
  headline: string;
  description: string;
  image: string | string[];
  datePublished: string;
  dateModified: string;
  author: {
    "@type": string;
    name: string;
  };
  publisher?: {
    "@type": string;
    name: string;
    logo?: {
      "@type": string;
      url: string;
    };
  };
}

export interface NewsArticleSchema extends ArticleSchema {
  keywords: string;
  articleBody?: string;
}

/**
 * Generate JSON-LD NewsArticle schema
 */
export function generateNewsSchema(article: {
  title: string;
  excerpt: string;
  content?: string;
  featured_image?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  slug?: string;
  tags?: string[];
  category?: string;
}): NewsArticleSchema {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";
  const keywords = article.tags && article.tags.length > 0 ? article.tags.join(', ') : extractKeywords(article.title, article.excerpt);
  const section = article.category || "News";
  
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.featured_image ? [article.featured_image] : [`${siteUrl}/og-image.png`],
    datePublished: article.created_at || new Date().toISOString(),
    dateModified: article.updated_at || new Date().toISOString(),
    author: {
      "@type": "Person",
      name: article.author || "Tradingle",
    },
    publisher: {
      "@type": "Organization",
      name: "Tradingle",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/favicon.ico`,
      },
    },
    keywords,
    articleBody: article.content,
    ...(section ? { articleSection: section } : {}),
  };
}

/**
 * Generate JSON-LD Organization schema
 */
export function generateOrganizationSchema(): object {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Tradingle",
    url: siteUrl,
    logo: `${siteUrl}/favicon.ico`,
    sameAs: [
      "https://twitter.com/tradingle",
      "https://facebook.com/tradingle",
      "https://instagram.com/tradingle",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Editorial",
      email: "editor@tradingle.news",
    },
  };
}

/**
 * Extract keywords from title and excerpt
 */
export function extractKeywords(title: string, excerpt: string): string {
  const combined = `${title} ${excerpt}`;
  const words = combined
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4 && !isStopWord(word))
    .slice(0, 10);
  
  return [...new Set(words)].join(", ");
}

export interface ArticleMetrics {
  titleLength: number;
  descriptionLength: number;
  wordCount: number;
  readingTimeMinutes: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  keywordDensity: number;
  internalLinkCount: number;
  repeatedPhraseWarnings: number;
}

export function calculateKeywordDensity(content: string, keyword?: string): number {
  if (!content || !keyword) return 0;
  const normalized = content.toLowerCase();
  const target = keyword.toLowerCase().trim();
  if (!target) return 0;
  const keywordMatches = normalized.match(new RegExp(`\\b${target.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "g")) || [];
  const words = normalized.split(/\s+/).filter(Boolean).length;
  return words === 0 ? 0 : Math.round((keywordMatches.length / words) * 1000) / 10;
}

export function calculateArticleMetrics(article: {
  title?: string;
  excerpt?: string;
  content?: string;
  seo_description?: string;
  focus_keyword?: string;
}): ArticleMetrics {
  const text = article.content || "";
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim());
  const headings = (text.match(/<h[1-6][^>]*>/gi) || []).length;
  const repeatedPhraseMatches = text.match(/(\b\w{4,}\b[\s\S]{0,40}?\b\w{4,}\b)[\s\S]*?\1/gi) || [];
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const titleLength = ((article as any).seo_title || article.title || "").length;
  const descriptionLength = (article.seo_description || article.excerpt || "").length;
  const keywordDensity = calculateKeywordDensity(text, article.focus_keyword || extractKeywords(article.title || "", article.excerpt || "").split(", ")[0] || "");
  const internalLinkCount = (text.match(/<a\s+href="\//gi) || []).length;

  return {
    titleLength,
    descriptionLength,
    wordCount,
    readingTimeMinutes,
    sentenceCount: sentences.length,
    paragraphCount: paragraphs.length,
    headingCount: headings,
    keywordDensity,
    internalLinkCount,
    repeatedPhraseWarnings: repeatedPhraseMatches.length,
  };
}

export function generateSearchSnippetPreview(article: {
  title?: string;
  seo_title?: string;
  seo_description?: string;
  excerpt?: string;
  slug?: string;
  category_slug?: string;
}): { title: string; description: string; url: string } {
  const displayTitle = article.seo_title || article.title || "Article title";
  const displayDescription = article.seo_description || article.excerpt || "A short description of the article that appears in search results.";
  const url = generateCanonicalUrl(article.slug || "article-slug", article.category_slug);
  return {
    title: displayTitle,
    description: displayDescription.length > 160 ? `${displayDescription.substring(0, 157)}...` : displayDescription,
    url,
  };
}

export function generatePlagiarismChecklist(article: {
  title?: string;
  excerpt?: string;
  content?: string;
}): { item: string; passed: boolean }[] {
  const text = article.content || "";
  const hasQuotes = /[\u201C\u201D\u2018\u2019"']/.test(text);
  const repeatedSentences = (text.match(/(\b[^.!?]{20,}\b)[.!?]/gi) || []).length;
  const hasSources = /https?:\/\/|www\.|source|reported by|according to/i.test(text);
  const hasOriginalHeading = /(analysis|exclusive|explainer|report|insight)/i.test(article.title || "");

  return [
    { item: "Use fresh, original wording rather than copy-pasting from other articles.", passed: text.length > 0 },
    { item: "Quote and attribute sources when using exact statements or data.", passed: !hasQuotes || hasSources },
    { item: "Avoid repeated paragraphs and duplicate phrasing.", passed: repeatedSentences <= 2 },
    { item: "Use an original headline and angle, not generic stock phrases.", passed: hasOriginalHeading },
    { item: "Add at least one internal or source link for context.", passed: hasSources || text.includes('<a ') },
  ];
}

/**
 * Common stop words to exclude from keywords
 */
function isStopWord(word: string): boolean {
  const stopWords = [
    "the", "and", "with", "from", "that", "this", "more", "will", "have",
    "been", "also", "just", "only", "about", "which", "their", "where",
  ];
  return stopWords.includes(word);
}

/**
 * Generate OpenGraph meta tags
 */
export function generateOpenGraphTags(article: {
  title: string;
  excerpt: string;
  featured_image?: string;
  slug?: string;
  category_slug?: string;
  tags?: string[];
  category?: string;
}): Record<string, string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";
  const articleUrl = generateCanonicalUrl(article.slug || "article-slug", article.category_slug);
  const section = article.category || "News";
  const keywords = article.tags && article.tags.length > 0 ? article.tags.join(', ') : '';
  
  return {
    "og:type": "article",
    "og:title": article.title,
    "og:description": article.excerpt,
    "og:url": articleUrl,
    "og:image": article.featured_image || `${siteUrl}/og-image.png`,
    "og:site_name": "Tradingle",
    "og:locale": "en-IN",
    "article:section": section,
    ...(keywords ? { "article:tag": keywords } : {}),
  };
}

/**
 * Generate Twitter Card meta tags
 */
export function generateTwitterCardTags(article: {
  title: string;
  excerpt: string;
  featured_image?: string;
  slug?: string;
  category_slug?: string;
  author?: string;
}): Record<string, string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";
  const articleUrl = generateCanonicalUrl(article.slug || "article-slug", article.category_slug);
  
  return {
    "twitter:card": "summary_large_image",
    "twitter:title": article.title,
    "twitter:description": article.excerpt,
    "twitter:image": article.featured_image || `${siteUrl}/og-image.png`,
    "twitter:url": articleUrl,
    "twitter:site": "@tradingle",
    // Issue #77: Do not fabricate author Twitter handles from names
    "twitter:creator": "@tradingle",
  };
}

/**
 * Generate meta description (max 160 chars)
 */
export function generateMetaDescription(excerpt: string): string {
  const maxLength = 160;
  if (excerpt.length <= maxLength) return excerpt;
  return excerpt.substring(0, maxLength - 3) + "...";
}

/**
 * Sanitize URL for SEO
 */
export function sanitizeSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 75);
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

/**
 * Generate canonical URL
 */
export function generateCanonicalUrl(slug: string, categorySlug = "latest"): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tradingle.com";
  const safeCategory = categorySlug.replace(/^\/+|\/+$/g, "").toLowerCase() || "latest";
  const safeSlug = slug.replace(/^\/+|\/+$/g, "") || "article-slug";
  return `${siteUrl.replace(/\/$/, "")}/${safeCategory}/${safeSlug}`;
}

/**
 * Check SEO score (0-100)
 */
export function calculateSEOScore(article: {
  title?: string;
  excerpt?: string;
  seo_title?: string;
  seo_description?: string;
  content?: string;
  slug?: string;
  featured_image?: string;
  focus_keyword?: string;
  canonical_url?: string;
}): number {
  let score = 0;
  const title = article.seo_title || article.title;
  const description = article.seo_description || article.excerpt;
  const focusKeyword = article.focus_keyword;

  // Title (max 20 points)
  if (title) {
    score += 5;
    if (title.length >= 30 && title.length <= 60) score += 10;
    if (focusKeyword && title.toLowerCase().includes(focusKeyword.toLowerCase())) score += 5;
    else if (!focusKeyword && title.length >= 30) score += 5;
  }

  // Excerpt/Description (max 20 points)
  if (description) {
    score += 5;
    if (description.length >= 120 && description.length <= 160) score += 15;
    if (focusKeyword && description.toLowerCase().includes(focusKeyword.toLowerCase())) score += 5;
  }

  // Content (max 30 points)
  if (article.content) {
    score += 10;
    const wordCount = article.content.split(/\s+/).filter(Boolean).length;
    if (wordCount >= 300) score += 10;
    if (wordCount >= 1000) score += 10;
  }

  // Slug (max 15 points)
  if (article.slug) {
    score += 5;
    if (!article.slug.includes("_") && article.slug.includes("-")) score += 10;
  }

  // Image (max 15 points)
  if (article.featured_image) {
    score += 15;
  }

  // Canonical
  if (article.canonical_url) {
    score += 5;
  }

  return Math.min(score, 100);
}

/**
 * SEO checklist items
 */
export function generateSEOChecklist(article: {
  title?: string;
  excerpt?: string;
  seo_title?: string;
  seo_description?: string;
  content?: string;
  slug?: string;
  featured_image?: string;
  focus_keyword?: string;
  canonical_url?: string;
  tags?: string[];
  category?: string;
}): { item: string; passed: boolean }[] {
  const title = article.seo_title || article.title || "";
  const description = article.seo_description || article.excerpt || "";
  const content = article.content || "";
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  return [
    {
      item: "SEO title between 30-60 characters",
      passed: title.length >= 30 && title.length <= 60,
    },
    {
      item: "SEO title includes focus keyword",
      passed: article.focus_keyword ? title.toLowerCase().includes(article.focus_keyword.toLowerCase()) : true,
    },
    {
      item: "Meta description between 120-160 characters",
      passed: description.length >= 120 && description.length <= 160,
    },
    {
      item: "Meta description includes focus keyword",
      passed: article.focus_keyword ? description.toLowerCase().includes(article.focus_keyword.toLowerCase()) : true,
    },
    {
      item: "Article content at least 300 words",
      passed: wordCount >= 300,
    },
    {
      item: "Article content at least 1000 words",
      passed: wordCount >= 1000,
    },
    {
      item: "URL slug is short and readable",
      passed: article.slug ? article.slug.length > 0 && article.slug.length <= 75 && !article.slug.includes("_") : false,
    },
    {
      item: "Featured image included",
      passed: !!article.featured_image,
    },
    {
      item: "Primary category selected",
      passed: Boolean(article.category && article.category.trim()),
    },
    {
      item: "At least one SEO tag provided",
      passed: Boolean(article.tags && article.tags.length > 0),
    },
    {
      item: "Canonical URL set when needed",
      passed: article.canonical_url ? article.canonical_url.length > 0 : true,
    },
    {
      item: "At least one internal or source link",
      passed: content.includes('<a href') || content.includes('http'),
    },
  ];
}

/**
 * Validate canonical URL (simple sanity check)
 */
export function validateCanonicalUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Generate robots meta tag content
 */
export function generateRobotsMetaTags(index = true, follow = true): string {
  const parts: string[] = [];
  parts.push(index ? 'index' : 'noindex');
  parts.push(follow ? 'follow' : 'nofollow');
  return parts.join(', ');
}

/**
 * Generate breadcrumb schema
 */
export function generateBreadcrumbsSchema(article: { title?: string; slug?: string; category?: string; category_slug?: string; }): object {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradingle.com';
  const list = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
  ];
  if (article.category) {
    const categorySlug = article.category_slug || sanitizeSlug(article.category);
    list.push({ '@type': 'ListItem', position: 2, name: article.category, item: `${siteUrl}/${categorySlug}` });
    list.push({ '@type': 'ListItem', position: 3, name: article.title || 'Article', item: generateCanonicalUrl(article.slug || 'article-slug', categorySlug) });
  } else {
    list.push({ '@type': 'ListItem', position: 2, name: article.title || 'Article', item: generateCanonicalUrl(article.slug || 'article-slug') });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: list,
  };
}

/**
 * Generate sitemap entry (small helper for back-end or static generation)
 */
export function generateSitemapEntry(article: { slug?: string; category_slug?: string; updated_at?: string; priority?: number; changefreq?: string; }): { loc: string; lastmod?: string; changefreq?: string; priority?: number } {
  return {
    loc: generateCanonicalUrl(article.slug || 'article-slug', article.category_slug),
    lastmod: article.updated_at || new Date().toISOString(),
    changefreq: article.changefreq || 'weekly',
    priority: typeof article.priority === 'number' ? Math.max(0, Math.min(1, article.priority)) : 0.5,
  };
}

/**
 * Structured data wrapper - returns JSON-LD object depending on schema type
 */
export function generateStructuredData(article: {
  title?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  author?: string;
  created_at?: string;
  updated_at?: string;
  slug?: string;
  schema_type?: string;
}): object {
  const type = (article.schema_type || 'NewsArticle').toLowerCase();
  if (type === 'newsarticle' || type === 'news') {
    return generateNewsSchema({
      title: article.title || '',
      excerpt: article.excerpt || '',
      content: article.content,
      featured_image: article.featured_image,
      author: article.author,
      created_at: article.created_at,
      updated_at: article.updated_at,
      slug: article.slug,
    });
  }

  // Fallback Article schema
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tradingle.com';
  return {
    '@context': 'https://schema.org',
    '@type': article.schema_type || 'Article',
    headline: article.title || '',
    description: article.excerpt || '',
    image: article.featured_image ? [article.featured_image] : [`${siteUrl}/og-image.png`],
    datePublished: article.created_at || new Date().toISOString(),
    dateModified: article.updated_at || new Date().toISOString(),
    author: { '@type': 'Person', name: article.author || 'Tradingle' },
    publisher: { '@type': 'Organization', name: 'Tradingle', logo: { '@type': 'ImageObject', url: `${siteUrl}/favicon.ico` } },
  };
}
