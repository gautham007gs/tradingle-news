import React from "react";
import { ChevronRight } from "lucide-react";
import MpaLink from "@/components/MpaLink";

import { articlePath } from "@/lib/articlePaths";
import { categorySlugFromTitle } from "@/lib/categorySlugs";
import { Skeleton } from "@/components/ui/skeleton";
import SectionHeading from "./SectionHeading";
import { PillarCardSkeleton } from "./NewsSkeletons";
import StoryTitle from "./StoryTitle";

const subtitles: Record<string, string> = {
  India: "Politics & Policy",
  Politics: "Power & Policy",
  World: "Global Affairs",
  Business: "Markets & Economy",
  Finance: "Markets, Money & Investing",
  Technology: "Innovation & AI",
  Cities: "Urban India",
  Science: "Discovery & Research",
  Entertainment: "Film, TV & Culture",
  Sports: "Scores & Stories",
  Lifestyle: "Health, Travel & Food",
};

interface CategoryBlockProps {
  title: string;
  stories: { title: string; image?: string; timestamp: string; slug?: string; excerpt?: string; category?: string }[];
  layout: "featured" | "list" | "horizontal" | "grid" | "magazine" | "cards" | "trd-layout-grid" | "pillar-card";
  hideExcerpt?: boolean;
  hideTimestamp?: boolean;
}

const CategoryBlock = React.forwardRef<HTMLElement, CategoryBlockProps>(
  function CategoryBlock({ title, stories, layout }, ref) {
    if (!stories.length) return null;
    const first = stories[0];
    const rest = stories.slice(1);
    const magazineSideStories = rest.slice(0, 3);
    const magazineLowerStories = rest.slice(3, 5);
    const sub = subtitles[title];
    const categorySlug = categorySlugFromTitle(title);
    
    const isLoading = !stories || stories.length === 0;

    const renderLoadingSkeleton = (itemCount: number = 3) => (
      <>
        {[...Array(itemCount)].map((_, i) => (
          <div key={i} style={{ paddingBottom: "12px" }}>
            {i === 0 && layout !== "list" && layout !== "horizontal" && (
              <Skeleton className="h-[150px] w-full mb-2" />
            )}
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </>
    );

    const sectionClass =
      layout === "pillar-card"
        ? "pillar-category-card"
        : "trd-news-section trd-layout-section-block";

    return (
      <section ref={ref} className={sectionClass}>
        {layout === "pillar-card" ? (
          <SectionHeading title={title} href={`/${categorySlug}`} />
        ) : (
          <h2 className="mb-3 flex items-center gap-2 sm:mb-4">
            <MpaLink to={`/${categorySlug}`} className="flex min-w-0 items-center gap-2 headline-link transition-colors hover:text-primary">
              <span style={{ fontSize: "18px", fontWeight: 700, color: "hsl(var(--headline))" }}>{title}</span>
              {sub && <span className="hidden truncate text-xs font-normal text-muted-foreground sm:inline">/ {sub}</span>}
              <ChevronRight size={16} style={{ color: "hsl(var(--primary))" }} />
            </MpaLink>
          </h2>
        )}

        {isLoading ? (
          layout === "pillar-card" ? <PillarCardSkeleton /> : renderLoadingSkeleton()
        ) : (
          <>
            {layout === "featured" && (
              <div className="grid grid-cols-1 gap-[12px] md:grid-cols-2 md:gap-[18px]">
                <MpaLink to={articlePath(first)} className="block group trd-layout-story-lead transition-all duration-300">
                  {first.image && (
                    <div className="overflow-hidden bg-muted rounded-sm">
                      <img src={first.image} alt={first.title} className="h-[150px] w-full object-cover trd-img-hover sm:h-[190px] md:h-[220px]" loading="lazy" />
                    </div>
                  )}
                  <StoryTitle title={first.title} as="h3" className="trd-headline-lg headline-link mt-[8px] line-clamp-3 sm:mt-[10px]" />
                  {first.excerpt && (
                    <p className="trd-excerpt line-clamp-2 sm:line-clamp-3">{first.excerpt}</p>
                  )}
                  <span className="trd-timestamp block">{first.timestamp}</span>
                </MpaLink>
                <div className="space-y-0">
                  {rest.map((s, i) => (
                    <MpaLink key={i} to={articlePath(s)} className="trd-layout-list-item block py-2 group transition-colors hover:text-primary sm:py-2.5">
                      <StoryTitle title={s.title} as="h4" className="trd-headline-sm headline-link line-clamp-2" />
                      <span className="trd-timestamp block text-xs">{s.timestamp}</span>
                    </MpaLink>
                  ))}
                </div>
              </div>
            )}

            {layout === "list" && (
              <div className="space-y-0">
                {stories.map((s, i) => (
                  <MpaLink key={i} to={articlePath(s)} className="trd-layout-list-item group flex gap-3 py-2.5 transition-colors hover:text-primary">
                    {s.image && i === 0 && (
                      <div className="w-[116px] flex-shrink-0 overflow-hidden bg-muted rounded-sm sm:w-[130px]">
                        <img src={s.image} alt={s.title} className="h-[78px] w-full object-cover trd-img-hover" loading="lazy" />
                      </div>
                    )}
                    <div>
                      <StoryTitle title={s.title} as="h4" className="trd-headline-sm headline-link" style={{ fontWeight: i === 0 ? 600 : 400 }} />
                      {s.excerpt && i === 0 && <p className="trd-excerpt trd-excerpt-sm">{s.excerpt}</p>}
                      <span className="trd-timestamp block text-xs">{s.timestamp}</span>
                    </div>
                  </MpaLink>
                ))}
              </div>
            )}

            {layout === "horizontal" && (
              <div>
                <MpaLink to={articlePath(first)} className="group trd-layout-story-lead mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:gap-4 transition-all duration-300">
                  {first.image && (
                    <div className="w-full flex-shrink-0 overflow-hidden bg-muted sm:w-[240px] rounded-sm">
                      <img src={first.image} alt={first.title} className="h-[145px] w-full object-cover trd-img-hover sm:h-[150px]" loading="lazy" />
                    </div>
                  )}
                  <div>
                    <StoryTitle title={first.title} as="h3" className="trd-headline-lg headline-link line-clamp-3" />
                    {first.excerpt && <p className="trd-excerpt line-clamp-2 sm:line-clamp-3">{first.excerpt}</p>}
                    <span className="trd-timestamp block">{first.timestamp}</span>
                  </div>
                </MpaLink>
                <div className="space-y-0">
                  {rest.map((s, i) => (
                    <MpaLink key={i} to={articlePath(s)} className="trd-layout-list-item block py-[8px] group transition-colors hover:text-primary">
                      <StoryTitle title={s.title} as="h4" className="trd-headline-sm headline-link line-clamp-2" />
                      <span className="trd-timestamp block text-xs">{s.timestamp}</span>
                    </MpaLink>
                  ))}
                </div>
              </div>
            )}

            {layout === "grid" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
                {stories.map((s, i) => (
                  <MpaLink key={i} to={articlePath(s)} className="block group trd-layout-story-lead transition-all duration-300" style={{ paddingBottom: "12px" }}>
                    {s.image && (
                      <div className="mb-2 overflow-hidden bg-muted rounded-sm">
                        <img src={s.image} alt={s.title} className="h-[130px] w-full object-cover trd-img-hover" loading="lazy" />
                      </div>
                    )}
                    <StoryTitle title={s.title} as="h4" className="headline-link line-clamp-2" style={{ fontSize: "15px", fontWeight: 600 }} />
                    <span className="trd-timestamp block text-xs">{s.timestamp}</span>
                  </MpaLink>
                ))}
              </div>
            )}

            {layout === "magazine" && (
              <div className="grid grid-cols-1 gap-[12px] md:grid-cols-3 md:gap-[16px]">
                <div className="md:col-span-2">
                  <MpaLink to={articlePath(first)} className="block group relative overflow-hidden bg-muted transition-all duration-300">
                    {first.image && (
                      <div className="overflow-hidden relative">
                        <img src={first.image} alt={first.title} className="h-[210px] w-full object-cover trd-img-hover sm:h-[260px] md:h-[300px]" loading="lazy" />
                        <div className="absolute inset-0 trd-image-copy-overlay" />
                        <div className="absolute bottom-0 left-0 right-0 trd-image-copy-panel p-[14px] pt-[52px] sm:p-[16px] sm:pt-[64px]">
                          <StoryTitle title={first.title} as="h3" className="headline-link trd-image-copy trd-hero-title line-clamp-3" style={{ fontSize: "clamp(18px, 5vw, 22px)", fontWeight: 700, color: "white", lineHeight: 1.25 }} />
                          {first.excerpt && (
                            <p className="trd-excerpt trd-excerpt-sm trd-hero-summary line-clamp-2" style={{ marginTop: "6px" }}>{first.excerpt}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </MpaLink>
                  {magazineLowerStories.length > 0 && (
                    <div className="mt-[12px] grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                      {magazineLowerStories.map((s, i) => (
                        <MpaLink key={`${s.slug || s.title}-${i}`} to={articlePath(s)} className="group block pt-[10px] transition-colors hover:text-primary">
                          <StoryTitle title={s.title} as="h4" className="headline-link line-clamp-2 text-[14px] font-semibold leading-snug" />
                          <span className="trd-timestamp mt-1 block text-xs">{s.timestamp}</span>
                        </MpaLink>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-0">
                  {magazineSideStories.map((s, i) => (
                    <MpaLink key={i} to={articlePath(s)} className="trd-layout-list-item group flex gap-2.5 py-2.5 transition-colors hover:text-primary">
                      {s.image && (
                        <div className="w-[92px] flex-shrink-0 overflow-hidden bg-muted rounded-sm">
                          <img src={s.image} alt={s.title} className="h-[64px] w-full object-cover trd-img-hover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <StoryTitle title={s.title} as="h4" className="trd-headline-sm headline-link line-clamp-2" style={{ fontWeight: 500 }} />
                        <span className="trd-timestamp text-xs">{s.timestamp}</span>
                      </div>
                    </MpaLink>
                  ))}
                </div>
              </div>
            )}

            {layout === "cards" && (
              <div className="space-y-0">
                {stories.slice(0, 5).map((s, i) => (
                  <MpaLink key={i} to={articlePath(s)} className="group block transition-all duration-300 mb-[12px]">
                    {s.image && (
                      <div className="relative overflow-hidden bg-muted rounded-sm mb-[8px]">
                        <img src={s.image} alt={s.title} className="h-[110px] w-full object-cover trd-img-hover" loading="lazy" />
                      </div>
                    )}
                    <StoryTitle title={s.title} as="h4" className="headline-link line-clamp-2 text-[14px] leading-snug font-semibold" style={{ color: "hsl(var(--headline))" }} />
                    <span className="trd-timestamp block text-xs mt-1">{s.timestamp}</span>
                  </MpaLink>
                ))}
              </div>
            )}

            {layout === "pillar-card" && (
              <div className="pillar-card-body">
                <MpaLink to={articlePath(first)} className="pillar-story-card pillar-story-card--lead group">
                  {first.image && (
                    <div className="pillar-card-image">
                      <img src={first.image} alt={first.title} className="h-full w-full object-cover trd-img-hover" loading="lazy" />
                    </div>
                  )}
                  <StoryTitle title={first.title} as="h3" className="headline-link pillar-card-lead" />
                </MpaLink>
                {rest.slice(0, 3).map((item, idx) => (
                  <MpaLink key={idx} to={articlePath(item)} className="pillar-story-card pillar-story-card--text headline-link group">
                    <StoryTitle title={item.title} as="span" />
                  </MpaLink>
                ))}
              </div>
            )}

            {layout === "trd-layout-grid" && (
              <div className="trd-layout-column-package">
                <MpaLink to={articlePath(first)} className="group block">
                  {first.image && (
                    <div className="trd-layout-column-image">
                      <img src={first.image} alt={first.title} className="h-full w-full object-cover trd-img-hover" loading="lazy" />
                    </div>
                  )}
                  <StoryTitle title={first.title} as="h3" className="headline-link trd-layout-column-title" />
                </MpaLink>
                <div>
                  {rest.slice(0, 5).map((item, idx) => (
                    <MpaLink key={idx} to={articlePath(item)} className="trd-layout-list-item group block">
                      <StoryTitle title={item.title} as="h4" className="headline-link trd-layout-side-headline" />
                    </MpaLink>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    );
  }
);

export default CategoryBlock;
