import MpaLink from "@/components/MpaLink";
import type { ReactNode } from "react";
import StoryTitle from "@/components/news/StoryTitle";
import AdSpace from "@/components/news/AdSpace";
import type { StoryCardData } from "@/lib/articleMapper";

type StoryLink = Pick<StoryCardData, "title" | "slug" | "image" | "category">;

type ArticleLeftRailProps = {
  related: StoryLink[];
  trending: StoryLink[];
  articleHref: (story: StoryLink) => string;
};

const RailHeading = ({ children }: { children: ReactNode }) => (
  <h2 className="article-rail-heading">{children}</h2>
);

const ArticleLeftRail = ({
  related,
  trending,
  articleHref,
}: ArticleLeftRailProps) => (
  <aside className="article-left-rail hidden md:block">
    <div className="article-left-rail-inner">
      {related.length > 0 && (
        <section className="article-rail-block">
          <RailHeading>Related News</RailHeading>
          <ul className="article-rail-list">
            {related.map((story, i) => (
              <li key={`rel-${story.slug || story.title}-${i}`}>
                <MpaLink to={articleHref(story)} className="article-rail-text-link headline-link">
                  <StoryTitle title={story.title} as="span" className="article-rail-link-title" />
                </MpaLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trending.length > 0 && (
        <section className="article-rail-block">
          <RailHeading>Trending News</RailHeading>
          <ol className="article-rail-trending">
            {trending.map((story, i) => (
              <li key={`trnd-${story.slug || story.title}-${i}`}>
                <MpaLink to={articleHref(story)} className="article-rail-trending-link headline-link">
                  <span className="article-rail-trending-rank">{i + 1}</span>
                  <StoryTitle title={story.title} as="span" className="article-rail-link-title" />
                </MpaLink>
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="article-rail-fill">
        <div className="article-rail-fill-inner">
          <AdSpace height={600} label="Advertisement" slotKey="article_left_rail_sticky" />
        </div>
      </div>
    </div>
  </aside>
);

export default ArticleLeftRail;
