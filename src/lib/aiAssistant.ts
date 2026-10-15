/**
 * Enhanced AI Assistant for Article Editor
 * Real-time SEO, fact-checking, and content optimization
 */

import { googleNewsOptimizer } from '@/lib/googleNewsOptimizer';
import { calculateSEOScore, extractKeywords } from '@/lib/seoUtilities';
import { hostingerApi } from '@/lib/hostingerApi';

export interface AiAssistance {
  type: 'seo' | 'grammar' | 'headline' | 'excerpt' | 'fact_check' | 'readability' | 'google_news' | 'plagiarism';
  suggestions: string[];
  score?: number;
  priority: 'low' | 'medium' | 'high';
}

class ArticleAiAssistant {
  /**
  /**
   * Get real-time SEO assistance
   */
  async getSeoAssistance(article: {
    title: string;
    excerpt: string;
    seo_title?: string;
    seo_description?: string;
    content: string;
    featured_image?: string;
    focus_keyword?: string;
  }): Promise<AiAssistance> {
    const score = calculateSEOScore(article);
    const suggestions: string[] = [];
    let priority: 'low' | 'medium' | 'high' = 'low';
    const title = article.seo_title || article.title;
    const description = article.seo_description || article.excerpt;
    const keyword = article.focus_keyword || title.split(' ')[0] || '';
    const wordCount = article.content.split(/\s+/).filter(Boolean).length;

    if (title.length < 30) {
      suggestions.push('Use a longer SEO title (30-60 characters) with the main topic up front.');
      priority = 'high';
    } else if (title.length > 60) {
      suggestions.push('Keep the SEO title under 60 characters so it displays cleanly in search results.');
      priority = 'medium';
    }

    if (keyword && !title.toLowerCase().includes(keyword.toLowerCase())) {
      suggestions.push('Include your focus keyword near the beginning of the SEO title.');
      priority = 'medium';
    }

    if (description.length < 120) {
      suggestions.push('Write a fuller meta description (120-160 characters) that summarizes the article and uses the focus keyword.');
      priority = 'high';
    } else if (description.length > 160) {
      suggestions.push('Shorten the meta description to 160 characters or less to avoid truncation in search results.');
      priority = 'medium';
    }

    if (keyword && !description.toLowerCase().includes(keyword.toLowerCase())) {
      suggestions.push('Mention the focus keyword naturally in the SEO description.');
      priority = 'medium';
    }

    if (!article.featured_image) {
      suggestions.push('Add a featured image to improve rich preview appearance on social and search.');
      priority = 'high';
    }

    if (wordCount < 300) {
      suggestions.push(`Expand the article body to at least ${300} words for basic SEO coverage.`);
      priority = 'medium';
    } else if (wordCount < 1000) {
      suggestions.push('Aim for 1000+ words for stronger ranking potential and deeper coverage.');
      priority = 'low';
    }

    if (article.focus_keyword && !article.content.toLowerCase().includes(article.focus_keyword.toLowerCase())) {
      suggestions.push('Use the focus keyword in the first paragraph and at least one heading.');
      priority = 'medium';
    }

    const internalLinkCount = (article.content.match(/<a\s+href="\//gi) || []).length;
    if (internalLinkCount === 0) {
      suggestions.push('Include at least one internal link to another relevant article on the site.');
      priority = 'low';
    }

    if (score < 60) {
      priority = 'high';
    }

    return { type: 'seo', suggestions, score, priority };
  }

  /**
   * Get Google News optimization suggestions
   */
  async getGoogleNewsAssistance(article: {
    title: string;
    excerpt: string;
    content: string;
    featured_image?: string;
    published_at?: Date;
    canonical_url?: string;
  }): Promise<AiAssistance> {
    const wordCount = article.content.split(/\s+/).length;
    const validation = googleNewsOptimizer.validateForGoogleNews({
      title: article.title,
      description: article.excerpt,
      publicationDate: article.published_at || new Date(),
      content: article.content,
      hasImage: !!article.featured_image,
      wordCount,
      isOriginal: !article.canonical_url,
      language: 'en',
    });

    const suggestions: string[] = [
      ...validation.issues,
      ...validation.recommendations,
    ];

    return {
      type: 'google_news',
      suggestions,
      score: validation.isValid ? 100 : Math.max(0, 100 - validation.issues.length * 20),
      priority: validation.isValid ? 'low' : 'high',
    };
  }

  /**
   * Generate headline suggestions
   */
  async getHeadlineSuggestions(
    article: {
      content: string;
      excerpt: string;
    },
    count = 5
  ): Promise<AiAssistance> {
    const content = article.content.substring(0, 500);
    const suggestions = await this.callAiApi({
      task: 'generate_headlines',
      content,
      count,
    });

    return {
      type: 'headline',
      suggestions: suggestions || this.generateDefaultHeadlines(content, count),
      priority: 'medium',
    };
  }

  /**
   * Generate excerpt suggestions
   */
  async getExcerptSuggestions(
    article: {
      title: string;
      content: string;
    },
    count = 3
  ): Promise<AiAssistance> {
    const content = article.content.substring(0, 500);
    const suggestions = await this.callAiApi({
      task: 'generate_excerpts',
      title: article.title,
      content,
      count,
    });

    return {
      type: 'excerpt',
      suggestions: suggestions || this.generateDefaultExcerpts(article.content, count),
      priority: 'medium',
    };
  }

  /**
   * Get readability analysis
   */
  async getReadabilityAnalysis(content: string): Promise<AiAssistance> {
    const suggestions: string[] = [];
    let score = 100;

    // Check sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;

    if (avgSentenceLength > 20) {
      suggestions.push('Break up long sentences for better readability');
      score -= 10;
    }

    // Check paragraph length
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphs.length;

    if (avgParagraphLength > 150) {
      suggestions.push('Break up long paragraphs (aim for 3-5 sentences per paragraph)');
      score -= 10;
    }

    // Check word count
    const words = content.split(/\s+/).length;
    if (words < 100) {
      suggestions.push('Add more content for better readability and SEO');
      score -= 15;
    }

    // Check for passive voice (rough estimate)
    const passiveVoiceCount = (content.match(/is\s+\w+ed|are\s+\w+ed|was\s+\w+ed|were\s+\w+ed/gi) || []).length;
    if (passiveVoiceCount > 5) {
      suggestions.push('Use active voice more often (current: ' + passiveVoiceCount + ' passive constructions)');
      score -= 5;
    }

    if (suggestions.length === 0) {
      suggestions.push('Great readability! Your article is well-structured.');
    }

    return {
      type: 'readability',
      suggestions,
      score: Math.max(0, score),
      priority: score < 70 ? 'high' : 'low',
    };
  }

  /**
   * Get fact-check reminders
   */
  async getFactCheckReminders(article: {
    title: string;
    content: string;
  }): Promise<AiAssistance> {
    const suggestions: string[] = [
      'Have you verified all numerical statistics and data points?',
      'Are all quotes properly attributed with sources?',
      'Have you linked to primary sources where possible?',
      'Is the context accurate and free of bias?',
      'Have you checked for spelling and grammar errors?',
      'Are all names and titles correctly spelled?',
      'Have you included the publication date?',
      'Is the featured image relevant and properly credited?',
    ];

    return {
      type: 'fact_check',
      suggestions: suggestions.slice(0, 4),
      priority: 'medium',
    };
  }

  /**
   * Get plagiarism and originality guidance
   */
  async getPlagiarismGuidance(article: {
    title: string;
    excerpt: string;
    content: string;
    focus_keyword?: string;
  }): Promise<AiAssistance> {
    const suggestions: string[] = [];
    let priority: 'low' | 'medium' | 'high' = 'low';
    const wordCount = article.content.split(/\s+/).filter(Boolean).length;
    const repeatedPhrases = (article.content.match(/(\b\w{6,}\b[\s\S]{0,50}?\b\w{6,}\b)[\s\S]*?\1/gi) || []).length;
    const hasSource = /https?:\/\/|www\.|source|reported by|according to/i.test(article.content);
    const hasQuotes = /"|‘|’|“|”/.test(article.content);

    if (wordCount < 300) {
      suggestions.push('Short articles are harder to make unique and authoritative; expand the story with new details.');
      priority = 'medium';
    }

    if (repeatedPhrases > 0) {
      suggestions.push('Avoid repeating the same phrases or sentences. Rewrite repeated content in your own words.');
      priority = 'medium';
    }

    if (hasQuotes && !hasSource) {
      suggestions.push('Cite the source when using quotes or direct statements from others.');
      priority = 'high';
    }

    if (!hasSource) {
      suggestions.push('Add at least one source link or internal reference to support the reporting.');
      priority = 'low';
    }

    if (article.focus_keyword && !article.title.toLowerCase().includes(article.focus_keyword.toLowerCase())) {
      suggestions.push('Keep the headline and first paragraph tightly aligned to the chosen focus keyword.');
      priority = 'low';
    }

    suggestions.push('Ensure the article is original by writing summaries, analysis, and quotes in your own voice.');

    return {
      type: 'plagiarism',
      suggestions,
      priority,
    };
  }

  /**
   * Generate default headlines (fallback)
   */
  private generateDefaultHeadlines(content: string, count: number): string[] {
    const words = content.split(/\s+/).slice(0, 20).join(' ');
    const suggestions: string[] = [];

    // Extract key terms
    const keyTerms = extractKeywords(words, '').split(", ").filter(Boolean);

    for (let i = 0; i < count && i < keyTerms.length; i++) {
      suggestions.push(`Breaking: ${keyTerms[i].charAt(0).toUpperCase() + keyTerms[i].slice(1)} Update`);
    }

    // Add generic headlines
    if (suggestions.length < count) {
      suggestions.push('Latest News and Updates');
      suggestions.push('In-Depth Analysis of Recent Developments');
    }

    return suggestions.slice(0, count);
  }

  /**
   * Generate default excerpts (fallback)
   */
  private generateDefaultExcerpts(content: string, count: number): string[] {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const excerpts: string[] = [];

    for (let i = 0; i < count && i < sentences.length; i++) {
      let excerpt = sentences[i].trim();
      if (excerpt.length > 160) {
        excerpt = excerpt.substring(0, 157) + '...';
      }
      if (excerpt.length > 50) {
        excerpts.push(excerpt);
      }
    }

    return excerpts.slice(0, count);
  }

  /**
   * Call AI API for advanced features. Routes through hostingerApi.request()
   * (issue #6) so auth comes from the HttpOnly session cookie / in-memory
   * token — never a raw token read from localStorage — and CSRF is added
   * centrally. Returns null on failure so callers fall back to local guidance.
   */
  private async callAiApi(options: Record<string, any>): Promise<string[] | null> {
    try {
      const data = await hostingerApi.aiAssist({
        task: (options.task as string) as any,
        title: options.title,
        excerpt: options.excerpt,
        content: options.content,
        focus_keyword: options.focus_keyword,
        field: options.field,
        selected_text: options.selected_text,
      });
      return data.suggestions || null;
    } catch (error) {
      console.error('AI API error:', error);
    }

    return null;
  }

  /**
   * Get comprehensive article analysis
   */
  async analyzeArticle(article: {
    title: string;
    excerpt: string;
    content: string;
    featured_image?: string;
    published_at?: Date;
  }): Promise<{
    seo: AiAssistance;
    googleNews: AiAssistance;
    readability: AiAssistance;
    factCheck: AiAssistance;
    overallScore: number;
  }> {
    const [seo, googleNews, readability, factCheck] = await Promise.all([
      this.getSeoAssistance(article),
      this.getGoogleNewsAssistance(article),
      this.getReadabilityAnalysis(article.content),
      this.getFactCheckReminders(article),
    ]);

    const overallScore = Math.round(
      (seo.score || 0) * 0.3 +
      (googleNews.score || 0) * 0.3 +
      (readability.score || 0) * 0.2 +
      75 * 0.2 // factCheck is informational
    );

    return {
      seo,
      googleNews,
      readability,
      factCheck,
      overallScore,
    };
  }
}

export const aiAssistant = new ArticleAiAssistant();

// Make available globally
if (typeof window !== "undefined") {
  (window as any).__aiAssistant = aiAssistant;
}

export default aiAssistant;
