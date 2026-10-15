"use client";

import { ArrowLeft, Home, LayoutDashboard } from "lucide-react";
import MpaLink from "@/components/MpaLink";
import ReferToEarn from "@/components/ReferToEarn";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import Logo from "@/components/news/Logo";

export default function ReferEarnContent() {
  const { user, isStaff, roles } = useCmsAuth();
  const canOpenAdmin = Boolean(user && (isStaff || roles.includes("author")));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40" style={{ background: "hsl(var(--nav-bg))" }}>
        <div className="trd-container flex h-[58px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex h-9 items-center gap-2 border px-3 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ borderColor: "rgba(255,255,255,0.28)", color: "rgba(255,255,255,0.88)" }}
              aria-label="Go back"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="hidden sm:block">
              <Logo size="md" />
            </div>
            <h1 className="truncate text-sm font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.72)" }}>
              Refer & Earn
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {canOpenAdmin && (
              <MpaLink
                to="/admin"
                className="inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "hsl(var(--primary))", color: "white" }}
              >
                <LayoutDashboard size={15} />
                <span className="hidden sm:inline">Admin panel</span>
              </MpaLink>
            )}
            <MpaLink
              to="/"
              className="inline-flex h-9 items-center gap-2 border px-3 text-sm font-semibold transition-colors hover:opacity-80"
              style={{ borderColor: "rgba(255,255,255,0.28)", color: "rgba(255,255,255,0.88)" }}
              aria-label="Back to home"
            >
              <Home size={15} />
              <span className="hidden sm:inline">Home</span>
            </MpaLink>
          </div>
        </div>
      </header>
      <main className="py-8">
        <ReferToEarn />
      </main>
    </div>
  );
}
