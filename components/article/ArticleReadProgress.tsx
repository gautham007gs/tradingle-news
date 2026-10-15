"use client";

interface ArticleReadProgressProps {
  progress: number;
}

export default function ArticleReadProgress({ progress }: ArticleReadProgressProps) {
  return (
    <div
      className="fixed top-0 left-0 z-[60] h-[3px] transition-all duration-150"
      style={{ width: `${progress}%`, backgroundColor: "hsl(var(--primary))" }}
      aria-hidden="true"
    />
  );
}
