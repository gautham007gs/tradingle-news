import React, { useMemo } from "react";
import MpaLink from "@/components/MpaLink";
import { type StoryCardData } from "@/lib/articleMapper";
import { articlePath } from "@/lib/articlePaths";
import SectionHeading from "./SectionHeading";
import StoryTitle from "./StoryTitle";
import { SectionLoader } from "./NewsSkeletons";

const MoreForYouCard = ({ story }: { story: StoryCardData }) => (
  <article className="more-for-you-card">
    <MpaLink to={articlePath(story)} className="group block h-full">
      {story.image && (
        <div className="more-for-you-card-image">
          <img src={story.image} alt={story.title} className="h-full w-full object-cover trd-img-hover" loading="lazy" width={320} height={180} />
        </div>
      )}
      <StoryTitle title={story.title} as="h3" className="headline-link more-for-you-card-title headline-clamp" />
    </MpaLink>
  </article>
);

interface MoreStoriesSectionProps {
  stories?: StoryCardData[];
  title?: string;
  loading?: boolean;
}

const MoreStoriesSection = React.forwardRef<HTMLElement, MoreStoriesSectionProps>(function MoreStoriesSection(
  { stories: cmsStories = [], title = "More for You", loading = false },
  ref
) {
  const picks = useMemo(() => cmsStories.slice(0, 4), [cmsStories]);

  if (loading) {
    return <SectionLoader />;
  }

  if (!picks.length) return null;

  return (
    <section ref={ref} className="more-for-you-section">
      <div className="trd-container">
        <SectionHeading title={title} href="/search" />
        <div className="more-for-you-grid">
          {picks.map((story, index) => (
            <MoreForYouCard key={`${story.slug || story.title}-${index}`} story={story} />
          ))}
        </div>
      </div>
    </section>
  );
});

export default MoreStoriesSection;
