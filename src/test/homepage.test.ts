import { describe, expect, it } from "vitest";
import { uniqueStories, type StoryCardData } from "../../lib/homepage";

function story(overrides: Partial<StoryCardData> = {}): StoryCardData {
  return {
    title: "Markets close higher",
    timestamp: "",
    ...overrides,
  };
}

describe("uniqueStories", () => {
  it("deduplicates a story by slug when its title differs", () => {
    const stories = uniqueStories([
      story({ slug: "markets-close", title: "Markets close higher" }),
      story({ slug: "markets-close", title: "Markets finish higher" }),
    ]);

    expect(stories).toHaveLength(1);
  });

  it("deduplicates normalized titles when slugs differ", () => {
    const stories = uniqueStories([
      story({ slug: "market-close", title: "Markets close higher" }),
      story({ slug: "markets-finish", title: "  Markets   close higher " }),
    ]);

    expect(stories).toHaveLength(1);
  });

  it("shares claimed story identities across homepage sections", () => {
    const claimed = new Set<string>();
    const lead = uniqueStories([story({ slug: "markets-close" })], claimed);
    const section = uniqueStories(
      [
        story({ slug: "markets-close", title: "Markets close higher" }),
        story({ slug: "rupee-rises", title: "Rupee rises against dollar" }),
      ],
      claimed,
    );

    expect(lead).toHaveLength(1);
    expect(section.map((item) => item.slug)).toEqual(["rupee-rises"]);
  });
});
