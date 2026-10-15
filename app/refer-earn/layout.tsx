import type { Metadata } from "next";
import StandalonePageProviders from "../../components/providers/StandalonePageProviders";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function ReferEarnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StandalonePageProviders>{children}</StandalonePageProviders>;
}
