import MpaLink from "@/components/MpaLink";
import { articlePath } from "@/lib/articlePaths";
import type { StoryCardData } from "../../lib/homepage";
import StoryImage from "./StoryImage";

export interface HomePageContentProps {
  heroStories: StoryCardData[];
  railStories: StoryCardData[];
  editorsPicks: StoryCardData[];
  sectionStories: Record<string, StoryCardData[]>;
  moreForYouStories: StoryCardData[];
  slotStories: Record<string, StoryCardData[]>;
  spotlightLabel: string;
  spotlightKicker: string;
  moreForYouTitle: string;
}

const SECTIONS = [
  ["India", "india"],
  ["Business", "business"],
  ["Markets", "finance"],
  ["Technology", "technology"],
  ["World", "world"],
  ["Cities", "cities"],
  ["Science & climate", "science"],
  ["Culture", "entertainment"],
] as const;

function Kicker({ children }: { children?: React.ReactNode }) {
  return children ? <span className="trd-kicker">{children}</span> : null;
}

function Meta({ story }: { story: StoryCardData }) {
  return (
    <div className="trd-story-meta">
      <span>{story.author || "Tradingle Desk"}</span>
      {story.readTime ? <><span aria-hidden>·</span><span>{story.readTime}</span></> : null}
      {story.timestamp ? <><span aria-hidden>·</span><span>{story.timestamp}</span></> : null}
    </div>
  );
}

function StoryLink({ story, className = "" }: { story: StoryCardData; className?: string }) {
  return <MpaLink to={articlePath(story)} className={`group block ${className}`}>
    {story.image ? <StoryImage src={story.image} alt={story.title} frameClassName="trd-story-art" loading="lazy" sizes="(max-width: 768px) 100vw, 33vw" imageClassName="trd-story-img" /> : null}
    <Kicker>{story.category}</Kicker>
    <h3 className="trd-story-title">{story.title}</h3>
    {story.excerpt ? <p className="trd-story-excerpt">{story.excerpt}</p> : null}
    <Meta story={story} />
  </MpaLink>;
}

function SectionHead({ title, href }: { title: string; href?: string }) {
  return <div className="trd-section-headline">
    <h2>{title}</h2>
    {href ? <MpaLink to={href}>View all <span aria-hidden>→</span></MpaLink> : null}
  </div>;
}

export default function HomePageContent({
  heroStories,
  railStories,
  editorsPicks,
  sectionStories,
  moreForYouStories,
  spotlightLabel,
  spotlightKicker,
  moreForYouTitle,
}: HomePageContentProps) {
  const lead = heroStories.find((story) => story.image?.includes("images.unsplash.com")) || heroStories[0];
  const heroPool = lead ? [lead, ...heroStories.filter((story) => story !== lead)] : heroStories;
  const secondary = heroPool.slice(1, 3);
  const latest = heroPool.slice(3, 10);
  const latestLeft = latest.slice(0, 3);
  const latestFeature = latest[3] || latest[0];
  const latestRight = latest.slice(4, 7);
  const picks = editorsPicks.length ? editorsPicks : heroStories.slice(6, 10);
  const safeSections = SECTIONS.map(([label, key]) => ({ label, key, stories: sectionStories[key] || [] })).filter((s) => s.stories.length);

  return <main id="main-content" className="trd-home">
    <section className="trd-home-lead trd-container" aria-label="Top stories">
      <div className="trd-lead-grid">
        {lead ? <MpaLink to={articlePath(lead)} className="trd-lead-story group" style={{ display: "flex", flexDirection: "column", alignSelf: "start", height: "fit-content" }}>
          <div className="trd-lead-copy"><Kicker>{lead.category || "Top story"}</Kicker><h2>{lead.title}</h2>{lead.excerpt ? <p>{lead.excerpt}</p> : null}<Meta story={lead} /></div>
          {lead.image ? <StoryImage src={lead.image} alt={lead.title} frameClassName="trd-lead-art" frameStyle={{ height: "clamp(190px, 18vw, 260px)", minHeight: 0, maxHeight: 260, aspectRatio: "1.8", flex: "0 0 auto", overflow: "hidden", position: "relative", contain: "paint", isolation: "isolate" }} staticImage loading="eager" fetchPriority="high" sizes="(max-width: 900px) 100vw, 58vw" imageClassName="trd-story-img" /> : null}
        </MpaLink> : <div className="trd-empty-state">Your front page is ready for its first story.</div>}
        <div className="trd-lead-secondary">{secondary.map((story) => <StoryLink key={story.slug || story.title} story={story} />)}</div>
        <aside className="trd-home-ad-rail" aria-label="Tradingle brief">
          <div className="trd-ad-placeholder"><span>Advertisement</span></div>
          <div className="trd-rail-brief">
            <Kicker>Tradingle brief</Kicker>
            {railStories.slice(0, 3).map((story) => (
              <MpaLink key={story.slug || story.title} to={articlePath(story)} className="trd-rail-brief-item group">
                <div className="trd-rail-brief-row">
                  {story.image ? <StoryImage src={story.image} alt="" frameClassName="trd-rail-brief-image" loading="lazy" sizes="72px" imageClassName="trd-story-img" /> : null}
                  <strong>{story.title}</strong>
                </div>
                <Meta story={story} />
              </MpaLink>
            ))}
          </div>
        </aside>
      </div>
      <section className="trd-latest-index" aria-label="Latest news">
        <div className="trd-latest-rail">
          <div className="trd-index-label">Latest</div>
          {latestLeft.map((story, i) => <MpaLink key={story.slug || story.title} to={articlePath(story)} className="trd-index-item group"><span>{String(i + 1).padStart(2, "0")}</span><strong>{story.title}</strong><small>{story.category || "News"}</small></MpaLink>)}
        </div>
        {latestFeature ? <MpaLink to={articlePath(latestFeature)} className="trd-latest-feature group">
          {latestFeature.image ? <StoryImage src={latestFeature.image} alt={latestFeature.title} frameClassName="trd-latest-feature-image" loading="lazy" sizes="(max-width: 760px) 100vw, 32vw" imageClassName="trd-story-img" /> : null}
          <Kicker>{latestFeature.category || "Latest"}</Kicker>
          <h3>{latestFeature.title}</h3>
          <Meta story={latestFeature} />
        </MpaLink> : null}
        <div className="trd-latest-rail">
          <div className="trd-index-label">More latest</div>
          {latestRight.map((story, i) => <MpaLink key={story.slug || story.title} to={articlePath(story)} className="trd-index-item group"><span>{String(i + 4).padStart(2, "0")}</span><strong>{story.title}</strong><small>{story.category || "News"}</small></MpaLink>)}
        </div>
      </section>
    </section>

    <section className="trd-home-strip"><div className="trd-container trd-news-strip"><span>Tradingle brief</span><div className="trd-news-strip-viewport"><div className="trd-news-strip-track">{[...railStories.slice(0, 4), ...railStories.slice(0, 4)].map((story, index) => <MpaLink key={`${story.slug || story.title}-${index}`} to={articlePath(story)}>{story.title}</MpaLink>)}</div></div></div></section>

    {picks.length ? <section className="trd-container trd-home-section"><SectionHead title="Editors’ picks" href="/editors-picks" /><div className="trd-picks-grid">{picks.slice(0, 4).map((story) => <StoryLink key={story.slug || story.title} story={story} />)}</div></section> : null}

    {safeSections.map(({ label, key, stories }) => <section key={key} className="trd-container trd-home-section"><SectionHead title={label} href={`/${key}`} /><div className="trd-section-grid"><div className="trd-section-feature"><StoryLink story={stories[0]} /></div><div className="trd-section-list">{stories.slice(1, 5).map((story, i) => <MpaLink key={story.slug || story.title} to={articlePath(story)} className="trd-list-story group"><span>{String(i + 1).padStart(2, "0")}</span><div><Kicker>{story.category}</Kicker><h3>{story.title}</h3><Meta story={story} /></div></MpaLink>)}</div></div></section>)}

    {moreForYouStories.length ? <section className="trd-home-more"><div className="trd-container"><SectionHead title={moreForYouTitle || "More for you"} /><div className="trd-more-grid">{moreForYouStories.slice(0, 6).map((story) => <StoryLink key={story.slug || story.title} story={story} />)}</div></div></section> : null}
  </main>;
}
