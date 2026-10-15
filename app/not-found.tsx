import Link from "next/link";

export default function NotFound() {
  return (
    <main className="trd-container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <span className="text-4xl font-extrabold text-primary">404</span>
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        This page doesn&apos;t exist or may have been moved. Try one of the links below.
      </p>

      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to Homepage
        </Link>
        <Link
          href="/write-for-us"
          className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Write for Us
        </Link>
      </div>

      <div className="mt-10 border-t pt-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Popular sections
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { label: "India", href: "/india" },
            { label: "World", href: "/world" },
            { label: "Business", href: "/business" },
            { label: "Sports", href: "/sports" },
            { label: "Opinion", href: "/opinion" },
            { label: "Saved Articles", href: "/saved" },
          ].map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
