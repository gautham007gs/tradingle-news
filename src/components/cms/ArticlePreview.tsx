/**
 * Enhanced Article Preview
 * Shows realistic preview of how article will look on the frontend
 */

import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, Eye, EyeOff, Facebook, X, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TopNav from '@/components/news/TopNav';
import Footer from '@/components/news/Footer';
import { sanitizeArticleHtml } from '@/lib/contentHtml';

interface ArticlePreviewProps {
  title: string;
  subtitle?: string;
  featuredImage?: string;
  imageCaption?: string;
  author?: string;
  authorAvatar?: string;
  publishedAt?: string;
  category?: string;
  content: string;
  readTime?: number;
  tags?: string[];
}

type DeviceType = 'mobile' | 'tablet' | 'desktop';

const ArticlePreview = React.forwardRef<HTMLDivElement, ArticlePreviewProps>(
  (
    {
      title,
      subtitle,
      featuredImage,
      imageCaption,
      author,
      authorAvatar,
      publishedAt,
      category,
      content,
      readTime,
      tags,
    },
    ref
  ) => {
    const [device, setDevice] = useState<DeviceType>('desktop');
    const [showPreview, setShowPreview] = useState(true);

    // Device dimensions
    const deviceDimensions = {
      mobile: { width: '390px', height: '844px' },
      tablet: { width: '768px', height: '1024px' },
      desktop: { width: '100%', height: '600px' },
    };

    const getDevice = (d: DeviceType) => deviceDimensions[d];

    // Format date
    const formatDate = (dateString?: string) => {
      if (!dateString) return new Date().toLocaleDateString('en-IN');
      try {
        return new Date(dateString).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateString;
      }
    };

    if (!showPreview) {
      return (
        <div
          ref={ref}
          className="flex items-center justify-center h-96 bg-muted rounded-lg border border-border"
        >
          <Button
            onClick={() => setShowPreview(true)}
            variant="outline"
            className="gap-2"
          >
            <Eye size={16} />
            Show Preview
          </Button>
        </div>
      );
    }

    return (
      <div ref={ref} className="space-y-4">
        {/* Controls */}
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Preview:
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant={device === 'mobile' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevice('mobile')}
                className="gap-1.5"
              >
                <Smartphone size={14} />
                Mobile
              </Button>
              <Button
                variant={device === 'tablet' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevice('tablet')}
                className="gap-1.5"
              >
                <Tablet size={14} />
                Tablet
              </Button>
              <Button
                variant={device === 'desktop' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setDevice('desktop')}
                className="gap-1.5"
              >
                <Monitor size={14} />
                Desktop
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(false)}
            className="gap-1.5"
          >
            <EyeOff size={14} />
            Hide
          </Button>
        </div>

        {/* Preview Container */}
        <div
          className="mx-auto bg-background border border-border rounded-lg overflow-hidden shadow-lg"
          style={getDevice(device)}
        >
          <div className="flex flex-col h-full overflow-y-auto">
            {/* Frontend Navigation - Simplified */}
            <div className="border-b border-border py-3 px-4 bg-muted/30 sticky top-0 z-10">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                <span>TRADINGLE preview</span>
                <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-[11px] font-semibold">Live article</span>
              </div>
            </div>

            {/* Article Content */}
            <article className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 lg:py-12">
              {/* Category Badge */}
              {category && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded">
                    {category}
                  </span>
                </div>
              )}

              {/* Title */}
              <h1
                className="text-3xl md:text-4xl font-bold mb-3 leading-tight"
                style={{ color: 'hsl(var(--headline))' }}
              >
                {title}
              </h1>

              {/* Subtitle */}
              {subtitle && (
                <p className="text-lg text-muted-foreground mb-4 font-medium">
                  {subtitle}
                </p>
              )}

              {/* Author & Meta */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/50">
                {authorAvatar && authorAvatar.trim() !== "" && (
                  <img
                    src={authorAvatar}
                    alt={author}
                    className="h-10 w-10 rounded-full object-cover bg-muted"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <div className="text-sm">
                  <p className="font-semibold" style={{ color: 'hsl(var(--headline))' }}>
                    {author || 'Anonymous'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(publishedAt)} •{' '}
                    {readTime ? `${readTime} min read` : 'Featured'}
                  </p>
                </div>
              </div>

              {/* Featured Image */}
              {featuredImage && (
                <figure className="mb-8">
                  <div className="rounded-lg overflow-hidden bg-muted mb-2">
                    <img
                      src={featuredImage}
                      alt={title}
                      className="w-full h-80 object-cover"
                    />
                  </div>
                  {imageCaption && (
                    <figcaption className="text-xs text-muted-foreground text-center italic">
                      {imageCaption}
                    </figcaption>
                  )}
                </figure>
              )}

              {/* Article Body */}
              <div
                className="prose prose-sm dark:prose-invert max-w-none mb-8 text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(content) }}
                style={{ color: 'hsl(var(--foreground))' }}
              />

              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="pt-6 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-block px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Share & Actions */}
              <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-between flex-wrap gap-4">
                <div className="text-xs text-muted-foreground">
                  Publish on: <span className="font-semibold">{formatDate(publishedAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Share:</span>
                  <button className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-primary">
                    <Facebook size={16} />
                  </button>
                  <button className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-primary">
                    <X size={16} />
                  </button>
                  <button className="inline-flex items-center justify-center rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary hover:text-primary">
                    <Mail size={16} />
                  </button>
                </div>
              </div>
            </article>

            {/* Footer - Simplified */}
            <div className="border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground text-center">
              © 2026 TRADINGLE - All rights reserved
            </div>
          </div>
        </div>

        {/* Quality Checklist */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2">Preview Checklist</h4>
          <ul className="space-y-2 text-sm">
            {[
              { ok: Boolean(title), text: "Title is compelling and clear" },
              { ok: Boolean(subtitle), text: "Subtitle/excerpt provided" },
              { ok: Boolean(featuredImage), text: "Featured image selected" },
              { ok: Boolean(category), text: "Category assigned" },
              { ok: Boolean(author), text: "Author byline set" },
              { ok: content && content.length > 100, text: "Content is substantial (100+ characters)" },
              { ok: tags && tags.length > 0, text: "Tags added for SEO" },
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                {item.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
                <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
);

ArticlePreview.displayName = 'ArticlePreview';

export default ArticlePreview;
