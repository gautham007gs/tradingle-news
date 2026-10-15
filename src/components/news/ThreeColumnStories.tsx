import MpaLink from "@/components/MpaLink";
import { ChevronRight } from "lucide-react";
import { type StoryCardData } from "@/lib/articleMapper";
import { articlePath } from "@/lib/articlePaths";
import AdSpace from "@/components/news/AdSpace";
import { BelowTopSkeleton } from "./NewsSkeletons";
import StoryTitle from "./StoryTitle";

const LeadMiniCard = ({ story }: { story: StoryCardData }) => (
  <MpaLink to={articlePath(story)} className="trd-layout-mini-lead group">
    <div className="trd-layout-mini-lead-image">
      <img src={story.image} alt={story.title} className="h-full w-full object-cover trd-img-hover" loading="lazy" />
    </div>
    <StoryTitle title={story.title} as="h3" className="headline-link trd-layout-mini-lead-title" />
  </MpaLink>
);

const HeadlineRail = ({ stories }: { stories: StoryCardData[] }) => (
  <div className="trd-layout-headline-rail">
    {stories.slice(0, 3).map((story, index) => (
      <MpaLink key={`${story.slug || story.title}-rail-${index}`} to={articlePath(story)} className="trd-layout-headline-rail-item group">
        <StoryTitle title={story.title} as="h3" className="headline-link" />
      </MpaLink>
    ))}
  </div>
);

const MiniGrid = ({ stories }: { stories: StoryCardData[] }) => (
  <div className="trd-layout-mini-grid">
    {stories.slice(0, 6).map((story, index) => (
      <MpaLink key={`${story.slug || story.title}-mini-${index}`} to={articlePath(story)} className="trd-layout-mini-rail-card group">
        <StoryTitle title={story.title} as="h3" className="headline-link" />
        {story.image && (
          <div className="trd-layout-mini-rail-thumb">
            <img src={story.image} alt={story.title} className="h-full w-full object-cover trd-img-hover" loading="lazy" />
          </div>
        )}
      </MpaLink>
    ))}
  </div>
);

const OpinionRail = ({ stories }: { stories: StoryCardData[] }) => (
  <section className="trd-layout-side-section">
    <h2 className="trd-layout-side-title">Opinion <ChevronRight size={18} /></h2>
    <div className="trd-layout-opinion-list">
      {stories.slice(0, 3).map((story, index) => (
        <MpaLink key={`${story.slug || story.title}-opinion-${index}`} to={articlePath(story)} className="trd-layout-opinion-item group">
          {story.image ? (
            <img src={story.image} alt={`${story.author || story.title} avatar`} className="h-12 w-12 rounded-full object-cover" loading="lazy" width={48} height={48} />
          ) : (
            <div className="trd-layout-opinion-mark">T</div>
          )}
          <div>
            <StoryTitle title={story.title} as="h3" className="headline-link" />
          </div>
        </MpaLink>
      ))}
    </div>
  </section>
);

const SidebarSpotlight = ({
  story,
  label = "Spotlight",
  kicker = "Analyses, Explainers, Exclusives",
}: {
  story?: StoryCardData;
  label?: string;
  kicker?: string;
}) => {
  if (!story) return null;
  return (
    <section className="trd-layout-spotlight-card">
      <p className="trd-layout-spotlight-label">{label}</p>
      <p className="trd-layout-spotlight-kicker">{kicker}</p>
      <MpaLink to={articlePath(story)} className="group block">
        {story.image && (
          <div className="trd-layout-spotlight-image">
            <img src={story.image} alt={story.title} className="h-full w-full object-cover trd-img-hover" loading="lazy" />
          </div>
        )}
        <StoryTitle title={story.title} as="h3" className="headline-link trd-layout-spotlight-title" />
      </MpaLink>
    </section>
  );
};

interface ThreeColumnStoriesProps {
  stories?: StoryCardData[];
  opinionStories?: StoryCardData[];
  spotlightStory?: StoryCardData;
  spotlightLabel?: string;
  spotlightKicker?: string;
  loading?: boolean;
}

const ThreeColumnStories = ({
  stories: cmsStories = [],
  opinionStories: cmsOpinion = [],
  spotlightStory: cmsSpotlight,
  spotlightLabel = "Spotlight",
  spotlightKicker = "Analyses, Explainers, Exclusives",
  loading = false,
}: ThreeColumnStoriesProps) => {
  if (loading) {
    return <BelowTopSkeleton />;
  }

  if (!cmsStories.length) return null;

  const stories = cmsStories;

  const leadStories = stories.slice(0, 2);
  const railStories = stories.slice(2, 5);
  const miniGridStories = stories.slice(5, 11);
  const spotlightStory = cmsSpotlight || stories[11] || stories[0];
  const opinions = cmsOpinion.length ? cmsOpinion : stories.slice(12, 15);

  return (
    <section className="trd-container trd-layout-below-top">
      <div className="grid grid-cols-1 gap-7 trd-layout-below-top-grid">
        <div className="trd-layout-below-main">
          <div className="trd-layout-below-lead-row">
            {leadStories.map((story) => <LeadMiniCard key={story.slug || story.title} story={story} />)}
            <HeadlineRail stories={railStories} />
          </div>
          <MiniGrid stories={miniGridStories} />
          <div className="home-mid-ad-strip" role="complementary" aria-label="Advertisement">
            <AdSpace height={72} slotKey="home_before_editors" />
          </div>
        </div>

        <aside className="trd-layout-below-sidebar">
          <OpinionRail stories={opinions} />
          <SidebarSpotlight story={spotlightStory} label={spotlightLabel} kicker={spotlightKicker} />
        </aside>
      </div>
    </section>
  );
};

export default ThreeColumnStories;
