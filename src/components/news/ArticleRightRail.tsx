import MpaLink from "@/components/MpaLink";
import AdSpace from "@/components/news/AdSpace";
import StoryTitle from "@/components/news/StoryTitle";
import type { StoryCardData } from "@/lib/articleMapper";

type StoryLink = Pick<StoryCardData, "title" | "slug" | "image" | "category">;

type ArticleRightRailProps = {
  dontMiss?: StoryLink | null;
  related?: StoryLink[];
  articleHref: (story: StoryLink) => string;
};

const ArticleRightRail = ({ dontMiss, related = [], articleHref }: ArticleRightRailProps) => (
  <aside className="article-right-rail hidden lg:block">
    <div className="article-right-rail-inner">
      <AdSpace height={280} label="Advertisement" slotKey="article_sidebar_rect" />

      {dontMiss && (
        <section className="article-rail-block article-rail-dont-miss">
          <h2 className="article-rail-heading">Don&apos;t Miss</h2>
          <MpaLink to={articleHref(dontMiss)} className="article-rail-dont-miss-card headline-link">
            {dontMiss.image && (
              <div className="article-rail-dont-miss-thumb">
                <img src={dontMiss.image} alt={dontMiss.title} loading="lazy" className="h-full w-full object-cover" width={320} height={180} />
              </div>
            )}
            <StoryTitle title={dontMiss.title} as="span" className="article-rail-dont-miss-title" />
          </MpaLink>
        </section>
      )}

      {related.length > 0 && (
        <section className="article-rail-block article-rail-related">
          <h2 className="article-rail-heading">Related News</h2>
          <div className="article-rail-related-list">
            {related.map((story) => (
              <MpaLink key={story.slug || story.title} to={articleHref(story)} className="article-rail-related-card headline-link">
                {story.image ? <img src={story.image} alt="" loading="lazy" width={112} height={70} className="article-rail-related-thumb" /> : null}
                <div>
                  <span className="article-rail-related-category">{story.category || "Latest"}</span>
                  <StoryTitle title={story.title} as="span" className="article-rail-related-title" />
                </div>
              </MpaLink>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4">
        <AdSpace height={280} label="Advertisement" slotKey="article_sidebar_rect_2" />
      </div>

      <div className="article-rail-fill">
        <div className="article-rail-fill-inner">
          <AdSpace height={600} label="Advertisement" slotKey="article_sidebar_sticky" />
        </div>
      </div>
    </div>
  </aside>
);

export default ArticleRightRail;
