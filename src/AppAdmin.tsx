"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { CmsAuthProvider } from "@/hooks/useCmsAuth";
import { lazy, Suspense, useEffect, Component, type ReactNode } from "react";
import AdminLogin from "./views/admin/AdminLogin";

const AdminLayout = lazy(() => import("./views/admin/AdminLayout"));
const Dashboard = lazy(() => import("./views/admin/Dashboard"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-xs text-muted-foreground">Loading CMS…</span>
    </div>
  </div>
);

class AdminErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "An unexpected error occurred." };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
        <section className="max-w-lg rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-semibold text-destructive">Admin application error</p>
          <p className="mt-2 text-sm text-muted-foreground">{this.state.error}</p>
          <button className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground" onClick={() => window.location.reload()}>
            Reload admin
          </button>
        </section>
      </main>
    );
  }
}

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, search]);
  return null;
};

const AppAdmin = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CmsAuthProvider>
          <TooltipProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <ScrollToTop />
              <AdminErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Dashboard />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/admin/login" replace />} />
                  </Routes>
                </Suspense>
              </AdminErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </CmsAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default AppAdmin;
