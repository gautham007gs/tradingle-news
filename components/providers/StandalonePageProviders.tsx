"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/useTheme";
import { AuthProvider } from "@/hooks/useAuth";
import { CmsAuthProvider } from "@/hooks/useCmsAuth";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

export default function StandalonePageProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CmsAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner position="bottom-right" />
            {children}
          </TooltipProvider>
        </CmsAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
