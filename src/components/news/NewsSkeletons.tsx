import { Skeleton } from "@/components/ui/skeleton";

export const HeroSkeleton = () => (
  <section className="trd-layout-home-shell trd-skeleton-block">
    <div className="trd-container">
      <Skeleton className="trd-skeleton-line mb-4 h-4 w-48" />
      <div className="trd-layout-top-grid">
        <div className="trd-layout-main-grid">
          <Skeleton className="trd-skeleton-media aspect-[16/9] w-full rounded-none" />
          <div className="mt-4 space-y-2">
            <Skeleton className="trd-skeleton-line h-7 w-full" />
            <Skeleton className="trd-skeleton-line h-7 w-4/5" />
          </div>
        </div>
        <div className="hidden gap-4 md:grid md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="trd-skeleton-media aspect-[16/10] w-full rounded-none" />
              <Skeleton className="trd-skeleton-line h-4 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export const TopStoriesSkeleton = () => (
  <div className="top-stories-grid trd-skeleton-block">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="top-stories-card">
        <Skeleton className="trd-skeleton-media top-stories-card-media rounded-none" />
        <Skeleton className="trd-skeleton-line mt-3 h-4 w-full" />
        <Skeleton className="trd-skeleton-line mt-2 h-4 w-3/4" />
      </div>
    ))}
  </div>
);

export const BelowTopSkeleton = () => (
  <div className="trd-container trd-layout-below-top py-4 trd-skeleton-block">
    <div className="grid grid-cols-1 gap-6 trd-layout-below-top-grid">
      <div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="trd-skeleton-media aspect-[16/9] w-full rounded-none" />
              <Skeleton className="trd-skeleton-line mt-2 h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-0 border-t border-border pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_104px] items-center gap-3 border-b border-border py-3">
              <Skeleton className="trd-skeleton-line h-4 w-full" />
              <Skeleton className="trd-skeleton-media aspect-[16/9] w-full rounded-none" />
            </div>
          ))}
        </div>
        <Skeleton className="trd-skeleton-media mt-4 h-[72px] w-full rounded-none" />
      </div>
      <div className="hidden lg:block">
        <Skeleton className="trd-skeleton-line mb-4 h-6 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-4 grid grid-cols-[52px_1fr] gap-3">
            <Skeleton className="trd-skeleton-media h-12 w-12 rounded-full" />
            <Skeleton className="trd-skeleton-line h-4 w-full" />
          </div>
        ))}
        <Skeleton className="trd-skeleton-media mt-4 aspect-[16/9] w-full rounded-none" />
      </div>
    </div>
  </div>
);

export const EditorsPicksSkeleton = () => (
  <div className="editors-picks-grid trd-skeleton-block col-span-full">
    {[1, 2, 3, 4].map((i) => (
      <div key={i}>
        <Skeleton className="trd-skeleton-media aspect-[16/9] w-full rounded-none" />
        <Skeleton className="trd-skeleton-line mt-3 h-5 w-full" />
        <Skeleton className="trd-skeleton-line mt-2 h-4 w-2/3" />
      </div>
    ))}
  </div>
);

export const PillarCardSkeleton = () => (
  <div className="trd-skeleton-block">
    <Skeleton className="trd-skeleton-line mb-4 h-6 w-36" />
    <Skeleton className="trd-skeleton-media mb-3 aspect-[16/9] w-full rounded-none" />
    <Skeleton className="trd-skeleton-line mb-4 h-5 w-full" />
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="trd-skeleton-line mb-3 h-4 w-full" />
    ))}
  </div>
);

export const DualCategorySkeleton = () => (
  <section className="trd-container dual-category-wrap trd-skeleton-block">
    {[1, 2].map((panel) => (
      <div key={panel} className="dual-category-panel space-y-4">
        <Skeleton className="trd-skeleton-line h-6 w-32" />
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <Skeleton className="trd-skeleton-media aspect-[4/3] w-full rounded-none" />
          <Skeleton className="trd-skeleton-line h-5 w-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_80px] gap-2 py-2">
              <Skeleton className="trd-skeleton-line h-4 w-full" />
              <Skeleton className="trd-skeleton-media aspect-[4/3] w-full rounded-none" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </section>
);

export const SectionLoader = () => (
  <div className="trd-container py-5 trd-skeleton-block">
    <Skeleton className="trd-skeleton-line mb-4 h-6 w-40" />
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Skeleton className="trd-skeleton-media aspect-[16/9] w-full rounded-none" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="trd-skeleton-line h-4 w-full" />
        ))}
      </div>
    </div>
  </div>
);
