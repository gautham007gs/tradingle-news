import type { Metadata } from "next";
import { absoluteUrl } from "../../../lib/site";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Advertise With Us",
  description:
    "Reach millions of engaged readers. Advertising opportunities on Tradingle.",
  alternates: { canonical: absoluteUrl("/advertise") },
};

export default function AdvertisePage() {
  return (
    <main className="trd-container static-page py-10 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Advertise With Us</h1>
      <div className="prose prose-lg">
        <p>
          Tradingle reaches a highly engaged audience of news readers across
          India and globally. We offer display advertising, sponsored content,
          and custom partnership packages.
        </p>
        <p>
          Contact our business team at{" "}
          <a href="mailto:ads@tradingle.com">ads@tradingle.com</a> to request
          our media kit and rate card.
        </p>
      </div>
    </main>
  );
}
