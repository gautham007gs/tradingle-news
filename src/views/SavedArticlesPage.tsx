import { useEffect, useState } from "react";
import MpaLink from "@/components/MpaLink";
import { Bookmark, ArrowRight } from "lucide-react";
import TopNav from "@/components/news/TopNav";
import Footer from "@/components/news/Footer";
import PageSEO from "@/components/seo/PageSEO";
import { useAuth } from "@/hooks/useAuth";
import { hostingerApi } from "@/lib/hostingerApi";
import { apiArticleToStory, type StoryCardData } from "@/lib/articleMapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { articlePath } from "@/lib/articlePaths";

const SavedArticlesPage = () => {
  const { user, openAuthModal } = useAuth();
  const [stories, setStories] = useState<StoryCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setStories([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    hostingerApi.savedArticles()
      .then(({ data }) => {
        if (active) setStories(data.map(apiArticleToStory));
      })
      .catch(() => {
        if (active) setStories([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <PageSEO title="Saved Articles" description="Your saved Tradingle articles." canonical="/saved" noindex />
      <TopNav />
      <main className="trd-container py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <Bookmark className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Saved Articles</h1>
            <p className="text-sm text-muted-foreground">Stories you bookmarked for later reading.</p>
          </div>
        </div>

        {!user ? (
          <div className="max-w-lg border bg-card p-6">
            <h2 className="text-lg font-bold">Sign in to save stories</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Create a free account or sign in, then use the bookmark icon on any article.</p>
            <Button className="mt-4" onClick={openAuthModal}>Sign in</Button>
          </div>
        ) : loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="space-y-3">
                <Skeleton className="aspect-[16/10] w-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-full" />
              </div>
            ))}
          </div>
        ) : stories.length === 0 ? (
          <div className="max-w-lg border bg-card p-6">
            <h2 className="text-lg font-bold">No saved stories yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">When you bookmark an article, it will appear here.</p>
            <Button asChild className="mt-4"><MpaLink to="/">Explore latest news</MpaLink></Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stories.map((story) => (
              <MpaLink key={story.slug || story.title} to={articlePath(story)} className="group block border bg-card">
                {story.image && (
                  <div className="overflow-hidden bg-muted">
                    <img src={story.image} alt={story.title} className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
                  </div>
                )}
                <div className="p-4">
                  <span className="trd-category-tag">{story.category || "Latest"}</span>
                  <h2 className="mt-1 text-lg font-bold leading-tight headline-link">{story.title}</h2>
                  {story.excerpt && <p className="trd-excerpt">{story.excerpt}</p>}
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary">Read article <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </MpaLink>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SavedArticlesPage;
