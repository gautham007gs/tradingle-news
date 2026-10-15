/**
 * Google News & Search Engine Optimization
 * Ensures content is discoverable by Google News and major search engines
 */

export interface GoogleNewsRequirements {
  title: string;
  description: string;
  publicationDate: Date;
  content: string;
  category?: string;
  hasImage: boolean;
  wordCount: number;
  isOriginal: boolean;
  language: string;
}

export interface NewsArticleMetadata {
  headline: string;
  description: string;
  image: string;
  author: string;
  datePublished: string;
  dateModified: string;
  keywords: string[];
  articleBody: string;
  wordCount: number;
  category: string;
  source: string;
  url: string;
}

class GoogleNewsOptimizer {
  private readonly minWordCount = 80;
  private readonly maxWordCount = 10000;
  private readonly requiredKeywords = 5;
  private readonly minDescriptionLength = 25;
  private readonly maxDescriptionLength = 160;

  /**
   * Validate article for Google News
   */
  validateForGoogleNews(article: GoogleNewsRequirements): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check title
    if (!article.title || article.title.length === 0) {
      issues.push('Title is required');
    } else if (article.title.length < 6) {
      issues.push('Title is too short (minimum 6 characters)');
    } else if (article.title.length > 160) {
      issues.push('Title is too long (maximum 160 characters)');
      recommendations.push('Shorten title to 160 characters or less');
    }

    // Check description
    if (!article.description || article.description.length === 0) {
      issues.push('Description is required');
    } else if (article.description.length < this.minDescriptionLength) {
      issues.push(`Description is too short (minimum ${this.minDescriptionLength} characters)`);
    } else if (article.description.length > this.maxDescriptionLength) {
      issues.push(`Description is too long (maximum ${this.maxDescriptionLength} characters)`);
      recommendations.push('Shorten description to 160 characters or less');
    }

    // Check publication date
    if (!article.publicationDate) {
      issues.push('Publication date is required');
    } else if (new Date().getTime() - article.publicationDate.getTime() > 2 * 24 * 60 * 60 * 1000) {
      recommendations.push('Article is more than 2 days old (less likely to appear in Google News)');
    }

    // Check content
    if (article.wordCount < this.minWordCount) {
      issues.push(`Content is too short (minimum ${this.minWordCount} words)`);
      recommendations.push(`Add at least ${this.minWordCount - article.wordCount} more words`);
    } else if (article.wordCount > this.maxWordCount) {
      recommendations.push('Consider splitting into multiple articles (too long)');
    }

    // Check image
    if (!article.hasImage) {
      issues.push('Featured image is required for Google News');
      recommendations.push('Add a high-quality featured image (minimum 1200x600px)');
    }

    // Check originality
    if (!article.isOriginal) {
      issues.push('Article must be original content');
    }

    // Language check
    if (!article.language) {
      recommendations.push('Specify language (e.g., en, es, fr)');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * Check if article is eligible for Google News
   */
  isEligibleForGoogleNews(article: GoogleNewsRequirements): boolean {
    const validation = this.validateForGoogleNews(article);
    return validation.isValid;
  }

  /**
   * Generate NewsArticle JSON-LD schema
   */
  generateNewsSchema(metadata: NewsArticleMetadata): string {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: metadata.headline,
      description: metadata.description,
      image: [metadata.image],
      datePublished: metadata.datePublished,
      dateModified: metadata.dateModified,
      author: {
        '@type': 'Person',
        name: metadata.author,
      },
      publisher: {
        '@type': 'Organization',
        name: 'TRADINGLE',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.tradingle.com/logo.png',
          width: 250,
          height: 60,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': metadata.url,
      },
      keywords: metadata.keywords.join(','),
      articleBody: metadata.articleBody,
      wordCount: metadata.wordCount,
      articleSection: metadata.category,
      inLanguage: 'en-US',
      isAccessibleForFree: true,
    };

    return JSON.stringify(schema);
  }

  /**
   * Optimize keywords for SEO
   */
  extractAndOptimizeKeywords(
    title: string,
    description: string,
    content: string,
    count = 10
  ): string[] {
    const text = `${title} ${description} ${content}`.toLowerCase();
    const words: string[] = text.match(/\b[a-z]{4,}\b/g) ?? [];
    
    const stopWords = new Set([
      'the', 'and', 'with', 'from', 'that', 'this', 'more', 'will', 'have',
      'been', 'also', 'just', 'only', 'about', 'which', 'their', 'where',
      'what', 'when', 'here', 'being', 'does', 'them', 'make', 'some',
      'than', 'then', 'said', 'says', 'said', 'article', 'news', 'day',
    ]);

    const wordFreq: Record<string, number> = {};
    words.forEach((word) => {
      if (!stopWords.has(word) && word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, count)
      .map(([word]) => word);
  }

  /**
   * Check SEO score
   */
  calculateSeoScore(article: NewsArticleMetadata): number {
    let score = 0;

    // Title optimization (20 points)
    if (article.headline.length >= 30 && article.headline.length <= 60) score += 20;
    else if (article.headline.length >= 20) score += 15;

    // Description (20 points)
    if (article.description.length >= 120 && article.description.length <= 160) score += 20;
    else if (article.description.length >= 50) score += 15;

    // Content (20 points)
    if (article.wordCount >= 1000) score += 20;
    else if (article.wordCount >= 300) score += 15;
    else if (article.wordCount >= 100) score += 10;

    // Keywords (15 points)
    if (article.keywords.length >= 5) score += 15;
    else if (article.keywords.length >= 3) score += 10;

    // Image (15 points)
    if (article.image) score += 15;

    // Metadata (10 points)
    if (article.author && article.datePublished && article.dateModified) score += 10;

    // Category (10 points)
    if (article.category) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Generate sitemap entry for Google News
   */
  generateSitemapEntry(article: NewsArticleMetadata): string {
    const entry = `
  <url>
    <loc>${this.escapeXml(article.url)}</loc>
    <lastmod>${new Date(article.dateModified).toISOString().split('T')[0]}</lastmod>
    <image:image>
      <image:loc>${this.escapeXml(article.image)}</image:loc>
      <image:title>${this.escapeXml(article.headline)}</image:title>
    </image:image>
    <news:news>
      <news:publication>
        <news:name>TRADINGLE</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(article.datePublished).toISOString()}</news:publication_date>
      <news:title>${this.escapeXml(article.headline)}</news:title>
      <news:keywords>${this.escapeXml(article.keywords.join(','))}</news:keywords>
    </news:news>
  </url>`;

    return entry;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Recommendations for global reach
   */
  getGlobalReachRecommendations(): string[] {
    return [
      // Content strategy
      'Cover topics relevant to international audience',
      'Use clear, simple language (avoid jargon)',
      'Include context for non-local audience',
      'Publish breaking news immediately',
      'Update articles with new information',

      // Technical optimization
      'Ensure fast page load time (< 2.5s LCP)',
      'Implement structured data (JSON-LD)',
      'Use high-quality images (1200x600px+)',
      'Create descriptive alt text for images',
      'Optimize for mobile devices',

      // SEO optimization
      'Target broad keywords, not just local',
      'Create topic clusters with internal links',
      'Build backlinks from authority sites',
      'Use H1 tag with main topic keyword',
      'Include meta description (120-160 chars)',

      // Distribution
      'Submit sitemap to Google Search Console',
      'Submit to Bing Webmaster Tools',
      'Request Google News inclusion',
      'Share on social media platforms',
      'Engage with audience in comments',

      // Content quality
      'Write original, newsworthy content',
      'Cite sources and provide links',
      'Update publish date with new info',
      'Include featured image in every article',
      'Write attention-grabbing headlines',

      // Multilingual support
      'Consider translating popular articles',
      'Use hreflang tags for different languages',
      'Create region-specific content sections',
      'Localize for major markets (US, UK, India, etc.)',
    ];
  }
}

export const googleNewsOptimizer = new GoogleNewsOptimizer();

// Make available globally for debugging
(window as any).__googleNewsOptimizer = googleNewsOptimizer;

export default googleNewsOptimizer;
