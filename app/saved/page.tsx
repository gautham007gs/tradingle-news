"use client";

import dynamic from "next/dynamic";

const SavedArticlesPage = dynamic(
  () => import("@/views/SavedArticlesPage"),
  { ssr: false },
);

export default function SavedPage() {
  return <SavedArticlesPage />;
}
