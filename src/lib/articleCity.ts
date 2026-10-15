const CITY_SLUGS = new Set([
  "delhi",
  "mumbai",
  "bengaluru",
  "hyderabad",
  "chennai",
  "kolkata",
  "south-india",
]);

export const getArticleCityLabel = (categorySlug?: string, categoryName?: string): string | null => {
  const slug = (categorySlug || "").toLowerCase();
  if (!slug || slug === "cities") return null;
  if (!CITY_SLUGS.has(slug)) return null;
  if (categoryName && categoryName.toLowerCase() !== "cities") return categoryName;
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};
