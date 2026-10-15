import { slugify } from "@/lib/slugify";
import { categoryConfig } from "@/lib/categoryConfig";

const TITLE_ALIASES: Record<string, string> = {
  tech: "technology",
};

/** Map a homepage section title to the canonical category URL slug. */
export const categorySlugFromTitle = (title: string): string => {
  const slug = slugify(title);
  if (categoryConfig[slug]) return slug;
  const alias = TITLE_ALIASES[slug];
  if (alias && categoryConfig[alias]) return alias;
  return slug;
};
