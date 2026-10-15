"use client";

import dynamic from "next/dynamic";

const ContributorApp = dynamic(
  () =>
    import("@/AppAdmin").then((mod) => {
      // Contributor routes are inside AppAdmin
      return mod;
    }),
  { ssr: false },
);

export default function ContributorCatchAll() {
  return <ContributorApp />;
}
