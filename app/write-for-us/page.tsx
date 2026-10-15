import type { Metadata } from "next";
import { absoluteUrl } from "../../lib/site";
import WriteForUs from "@/views/WriteForUs";

export const metadata: Metadata = {
  title: "Write For Us | Tradingle",
  description:
    "Contribute to Tradingle — submit articles, opinion pieces, and analysis. Join our team of journalists and expert contributors.",
  alternates: { canonical: absoluteUrl("/write-for-us") },
  openGraph: {
    title: "Write For Us | Tradingle",
    description:
      "Submit articles, opinion pieces, and analysis to Tradingle. Join our contributor network.",
    url: absoluteUrl("/write-for-us"),
    type: "website",
    siteName: "Tradingle",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    site: "@tradingle",
    title: "Write For Us | Tradingle",
    description: "Contribute articles and analysis to Tradingle.",
  },
};

export default function WriteForUsPage() {
  return (
    <main className="flex-1">
      <WriteForUs />
    </main>
  );
}
