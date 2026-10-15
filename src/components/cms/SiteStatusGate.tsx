import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchRawSiteSettings } from "@/lib/usePublicSiteSettings";

type Props = {
  children: ReactNode;
};

const hslPattern = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;

const SiteStatusGate = ({ children }: Props) => {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [path, setPath] = useState("");
  const isCmsPath = path.startsWith("/admin") || path.startsWith("/contributor") || path.startsWith("/write-for-us");

  useEffect(() => {
    let active = true;
    setPath(window.location.pathname);
    const load = () => {
      fetchRawSiteSettings()
        .then((next) => {
          if (!active) return;
          setSettings(next);
          if (next.primary_color && hslPattern.test(next.primary_color)) {
            document.documentElement.style.setProperty("--primary", next.primary_color);
          }
          if (next.accent_color && hslPattern.test(next.accent_color)) {
            document.documentElement.style.setProperty("--accent", next.accent_color);
          }
        })
        .catch(() => {
          if (active) setSettings(null);
        });
    };

    const idleId = "requestIdleCallback" in window
      ? (window as any).requestIdleCallback(load, { timeout: 2500 }) as ReturnType<typeof setTimeout>
      : (setTimeout(load, 800) as unknown as number);

    return () => {
      active = false;
      if ("cancelIdleCallback" in window) {
        (window as any).cancelIdleCallback(idleId as number);
      } else {
        clearTimeout(idleId as ReturnType<typeof setTimeout>);
      }
    };
  }, []);

  if (settings?.maintenance_enabled === "1" && !isCmsPath) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Tradingle</div>
          <h1 className="mt-3 text-3xl font-bold text-headline">We are updating the newsroom</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {settings.maintenance_message || "Tradingle is being updated. Please check back soon."}
          </p>
        </div>
      </div>
    );
  }

  const showAnnouncement =
    settings?.announcement_enabled === "1" &&
    Boolean(settings.announcement_text?.trim()) &&
    !isCmsPath;

  return (
    <>
      <div className="trd-announcement-slot" data-active={showAnnouncement ? "true" : "false"} aria-hidden={!showAnnouncement}>
        {showAnnouncement && (
          <div
            className="trd-announcement-bar border-b px-4 py-2 text-center text-xs font-medium leading-snug"
            style={{
              background: "hsl(var(--primary) / 0.1)",
              borderColor: "hsl(var(--primary) / 0.25)",
              color: "hsl(var(--foreground))",
            }}
            role="status"
          >
            {settings?.announcement_text}
          </div>
        )}
      </div>
      {children}
    </>
  );
};

export default SiteStatusGate;
