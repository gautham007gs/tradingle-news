"use client";

import { useEffect, useState } from "react";

interface RelativeTimeProps {
  /** Absolute ISO datetime — rendered server-side first for SEO/no-JS */
  isoDate: string;
  /** Pre-formatted absolute fallback from server */
  absoluteLabel: string;
  className?: string;
  itemProp?: string;
}

function formatRelative(isoDate: string): string {
  const date = new Date(isoDate);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RelativeTime({
  isoDate,
  absoluteLabel,
  className = "",
  itemProp,
}: RelativeTimeProps) {
  const [label, setLabel] = useState(absoluteLabel);

  useEffect(() => {
    setLabel(formatRelative(isoDate));
    const id = window.setInterval(
      () => setLabel(formatRelative(isoDate)),
      60_000,
    );
    return () => window.clearInterval(id);
  }, [isoDate]);

  return (
    <time dateTime={isoDate} className={className} itemProp={itemProp} suppressHydrationWarning>
      {label}
    </time>
  );
}
