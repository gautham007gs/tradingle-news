import MpaLink from "@/components/MpaLink";
import type { StoryCardData } from "@/lib/articleMapper";
import { articlePath } from "@/lib/articlePaths";
import { categorySlugFromTitle } from "@/lib/categorySlugs";
import SectionHeading from "./SectionHeading";
import StoryTitle from "./StoryTitle";
import { DualCategorySkeleton } from "./NewsSkeletons";

type PanelProps = {
  title: string;
  stories: StoryCardData[];
};

const CategoryPanel = ({ title, stories }: PanelProps) => {
  const lead = stories[0];
  const rails = stories.slice(1, 5);
  if (!lead) return null;

  return (
    <section className="dual-category-panel">
      <SectionHeading title={title} href={`/${categorySlugFromTitle(title)}`} />

      <article>
        <MpaLink to={articlePath(lead)} className="dual-category-lead group">
          {lead.image && (
            <div className="dual-category-lead-image">
              <img
                src={lead.image}
                alt={lead.title}
                className="h-full w-full object-cover trd-img-hover"
                loading="lazy"
                width={320}
                height={180}
              />
            </div>
          )}
          <StoryTitle title={lead.title} as="h3" className="headline-link dual-category-lead-title headline-clamp" />
        </MpaLink>
      </article>

      <div className="dual-category-grid">
        {rails.map((story, index) => (
          <article key={`${story.slug || story.title}-${index}`}>
            <MpaLink to={articlePath(story)} className="dual-category-small group">
              <StoryTitle title={story.title} as="h4" className="headline-link dual-category-small-title headline-clamp" />
              {story.image && (
                <div className="dual-category-small-image">
                  <img
                    src={story.image}
                    alt={story.title}
                    className="h-full w-full object-cover trd-img-hover"
                    loading="lazy"
                    width={160}
                    height={90}
                  />
                </div>
              )}
            </MpaLink>
          </article>
        ))}
      </div>
    </section>
  );
};

const DualCategoryPanel = ({
  leftTitle,
  leftStories,
  rightTitle,
  rightStories,
  loading,
}: {
  leftTitle: string;
  leftStories: StoryCardData[];
  rightTitle: string;
  rightStories: StoryCardData[];
  loading?: boolean;
}) => {
  if (loading) {
    return <DualCategorySkeleton />;
  }

  const hasLeft = leftStories.length > 0;
  const hasRight = rightStories.length > 0;
  if (!hasLeft && !hasRight) return null;

  return (
    <section className="trd-container dual-category-wrap">
      {hasLeft && <CategoryPanel title={leftTitle} stories={leftStories} />}
      {hasRight && <CategoryPanel title={rightTitle} stories={rightStories} />}
    </section>
  );
};

export default DualCategoryPanel;
