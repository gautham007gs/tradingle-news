import type { Metadata } from "next";
import StandalonePageProviders from "../../components/providers/StandalonePageProviders";

export const metadata: Metadata = {
  title: "Saved Articles – Tradingle",
  robots: { index: false, follow: false },
};

export default function SavedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StandalonePageProviders>{children}</StandalonePageProviders>;
}
