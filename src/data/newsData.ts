// This file previously also held ~330 lines of mock/placeholder navigation
// and article data left over from early prototyping, none of which was
// wired into any live page (verified: nothing imported navItems, heroStory,
// moreStories, or any of the other mock arrays). Trimmed to just the
// fallback stock images below, which genuinely are used - as defaults for
// author avatars and category hero images when no real image is set.
import heroImg from "@/assets/hero-news-1.webp";
import politicsImg from "@/assets/news-politics.webp";
import businessImg from "@/assets/news-business.webp";
import sportsImg from "@/assets/news-sports.webp";
import techImg from "@/assets/news-tech.webp";
import entertainmentImg from "@/assets/news-entertainment.webp";
import worldImg from "@/assets/news-world.webp";
import lifestyleImg from "@/assets/news-lifestyle.webp";
import cityImg from "@/assets/news-city.webp";
import scienceImg from "@/assets/news-science.webp";
import climateImg from "@/assets/news-climate.webp";
import electionImg from "@/assets/news-election.webp";
import author1 from "@/assets/author-1.webp";
import author2 from "@/assets/author-2.webp";
import author3 from "@/assets/author-3.webp";
import author4 from "@/assets/author-4.webp";

export const images = {
  hero: heroImg,
  politics: politicsImg,
  business: businessImg,
  sports: sportsImg,
  tech: techImg,
  entertainment: entertainmentImg,
  world: worldImg,
  lifestyle: lifestyleImg,
  city: cityImg,
  science: scienceImg,
  climate: climateImg,
  election: electionImg,
  author1, author2, author3, author4,
};
