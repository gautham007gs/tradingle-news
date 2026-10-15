import { slugify } from "./slugify";
import { images } from "@/data/newsData";

export interface MockAuthor {
  slug: string;
  name: string;
  avatar: string;
  bio: string;
  roleTitle: string;
  socialX?: string;
  socialLinkedin?: string;
  socialWebsite?: string;
}

// Mock author registry (mirrors authors used in newsData & ArticlePage).
// When CMS profiles exist for these slugs, CMS data wins.
export const mockAuthors: MockAuthor[] = [
  {
    slug: slugify("Sanjay Gupta"),
    name: "Sanjay Gupta",
    avatar: (images.author1 as any).src || "",
    bio: "Sanjay Gupta is a senior foreign affairs correspondent at Tradingle with over 15 years of experience covering geopolitics across the Middle East and South Asia.",
    roleTitle: "Senior Foreign Affairs Correspondent",
    socialX: "tradingle",
  },
  {
    slug: slugify("Kabir Taneja"),
    name: "Kabir Taneja",
    avatar: (images.author1 as any).src || "",
    bio: "Kabir Taneja writes on geopolitics, energy markets and the intersection of South Asian foreign policy.",
    roleTitle: "Opinion Columnist",
  },
  {
    slug: slugify("Syed Zubair Ahmed"),
    name: "Syed Zubair Ahmed",
    avatar: images.author2,
    bio: "Syed Zubair Ahmed covers US politics, global power shifts and long-form opinion for Tradingle.",
    roleTitle: "Opinion Columnist",
  },
  {
    slug: slugify("Vikram Mehta"),
    name: "Vikram Mehta",
    avatar: images.author3,
    bio: "Vikram Mehta is a sports analyst focused on cricket strategy, T20 leagues and Indian sporting policy.",
    roleTitle: "Sports Analyst",
  },
  {
    slug: slugify("Priya Nair"),
    name: "Priya Nair",
    avatar: images.author4,
    bio: "Priya Nair writes on Indian state politics, social movements and the politics of South India.",
    roleTitle: "Political Columnist",
  },
];

export const getAuthorBySlug = (slug: string) =>
  mockAuthors.find((a) => a.slug === slug);

export const authorSlugFor = (name: string) => slugify(name);
