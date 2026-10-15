#!/usr/bin/env node

const BASE = (process.env.TRADINGLE_API_BASE || "https://tradingle.com/api").replace(/\/$/, "");
const token = process.env.TRADINGLE_SESSION_TOKEN;
const csrf = process.env.TRADINGLE_CSRF_TOKEN;
if (!token || !csrf) throw new Error("Set TRADINGLE_SESSION_TOKEN and TRADINGLE_CSRF_TOKEN before running.");

const categories = [
  [2, "India", "india"], [3, "World", "world"], [4, "Business", "business"], [5, "Technology", "technology"],
  [6, "Sports", "sports"], [7, "Entertainment", "entertainment"], [8, "Cities", "cities"], [9, "Science", "science"],
  [10, "Lifestyle", "lifestyle"], [11, "Opinion", "opinion"], [13, "Politics", "politics"], [14, "Finance", "finance"],
];
const imagePool = [
  "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=82",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1400&q=82",
];
const angles = [
  "What the latest shift means for India’s next growth cycle",
  "The quiet changes reshaping the year ahead",
  "Why the numbers matter more than the noise",
  "Inside the decisions moving the story forward",
  "A closer look at the people and policy behind the headline",
  "Five signals readers should watch this week",
  "The new playbook emerging across the sector",
  "How a familiar system is being rebuilt from the ground up",
  "What leaders, workers and investors are saying now",
  "The context behind a fast-moving national conversation",
];
const intros = [
  "A fresh set of data and conversations is changing how the story is understood.",
  "The development is still unfolding, but its first effects are already visible across the country.",
  "Reporting from Tradingle’s desk brings together the facts, voices and context behind the latest update.",
];

function htmlBody(title, category, index) {
  const intro = intros[index % intros.length];
  return `<p>${intro} This is a demonstration article for the Tradingle newsroom redesign, written in a clear, reader-first style.</p><h2>The signal behind the headline</h2><p>Across ${category.toLowerCase()}, the central question is no longer whether change is coming, but how quickly institutions and households can adapt. Interviews with people close to the story point to a period of careful experimentation, practical trade-offs and sharper scrutiny.</p><p>For readers, the immediate takeaway is straightforward: watch the implementation, not just the announcement. The next few weeks will reveal which plans become durable policy and which remain short-lived reactions.</p><h2>What to watch next</h2><p>Tradingle will continue to track the data, decisions and lived experience that give this story its meaning. More updates will follow as new evidence emerges.</p>`;
}

async function api(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-CSRF-Token": csrf,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let payload;
  try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
  if (!response.ok) throw new Error(`${response.status}: ${payload.error || text.slice(0, 240)}`);
  return payload;
}

let created = 0;
let skipped = 0;
for (let i = 0; i < 120; i += 1) {
  const [categoryId, categoryName, categorySlug] = categories[i % categories.length];
  const subject = ["public services", "the domestic economy", "new technology", "urban life", "the climate transition", "small businesses", "India’s next generation", "global markets"][i % 8];
  const title = `${categoryName}: ${angles[i % angles.length]} — ${subject} ${2026 + (i % 3)}`;
  const published = new Date(Date.now() - (i * 3 + 2) * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");
  const image = imagePool[i % imagePool.length];
  const payload = {
    title,
    slug: `${categorySlug}-${i + 1}-demo-briefing`,
    excerpt: `${intros[i % intros.length]} Here is the context in under a minute.`,
    content: htmlBody(title, categoryName, i),
    featured_image: image,
    featured_image_alt: `${categoryName} newsroom illustration for ${title}`,
    featured_image_caption: "Illustration for demonstration content.",
    image_source: "Unsplash / Tradingle demo library",
    category_id: categoryId,
    author_id: 1,
    status: "published",
    priority: i % 17 === 0 ? "top" : "normal",
    is_live: false,
    published_at: published,
    content_type: i % 5 === 0 ? "analysis" : "breaking_news",
    audience: i % 4 === 0 ? "professional" : "general",
    location_country: "India",
    seo_title: `${title} | Tradingle`,
    seo_description: `${intros[i % intros.length]} Read Tradingle’s concise report on ${subject}.`,
    focus_keyword: categoryName,
    schema_type: i % 5 === 0 ? "AnalysisNewsArticle" : "NewsArticle",
    // Keep this library taxonomy-neutral: existing tag rules are category-scoped
    // on the live CMS, so optional tags would make otherwise valid seed stories
    // fail publish-time validation.
    tags: [],
    comments_enabled: true,
    robots_index: true,
    robots_follow: true,
  };
  try {
    await api("/articles/save.php", { method: "POST", body: JSON.stringify(payload) });
    created += 1;
    if (created % 10 === 0) console.log(`Created ${created}/120`);
  } catch (error) {
    skipped += 1;
    console.error(`Skipped ${i + 1}: ${error.message}`);
  }
}
console.log(JSON.stringify({ created, skipped, requested: 120 }));
