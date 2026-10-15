import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import PageSEO from "@/components/seo/PageSEO";
import { Home, Search, BookOpen, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <PageSEO
        title="Page Not Found"
        description="The page you requested could not be found on Tradingle."
        canonical={location.pathname}
        noindex
        nofollow
      />

      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span className="text-4xl font-extrabold text-primary">404</span>
        </div>

        <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
          Page not found
        </h1>
        <p className="mb-8 text-muted-foreground">
          The page at <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{location.pathname}</code> doesn't exist or may have been moved.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:w-auto"
          >
            <Home size={16} />
            Go to Homepage
          </a>
          <button
            onClick={() => window.history.back()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        <div className="mt-10 border-t pt-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            You might be looking for
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a href="/" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              <BookOpen size={12} /> Latest News
            </a>
            <a href="/#editors-picks" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              <Search size={12} /> Editor's Picks
            </a>
            <a href="/about" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              About Tradingle
            </a>
            <a href="/write-for-us" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted">
              Write for Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
