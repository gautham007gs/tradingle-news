"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

const WriteForUs = () => (
  <div className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
    <Card className="overflow-hidden">
      <div className="bg-primary/5 border-b px-6 sm:px-8 py-8 sm:py-10">
        <p className="trd-category-tag mb-3">Contribute</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Write for Tradingle</h1>
        <p className="mt-3 text-muted-foreground leading-relaxed text-sm sm:text-base">
          Share your expertise with our audience. We welcome opinion pieces, analysis, and
          in-depth reporting from writers across disciplines.
        </p>
      </div>
      <div className="space-y-6 px-6 sm:px-8 py-8">
        <section>
          <h2 className="font-semibold text-lg mb-2">What we look for</h2>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
            <li>Original reporting, analysis, or opinion — not previously published elsewhere</li>
            <li>800–2,000 words for opinion; longer for in-depth investigations</li>
            <li>Fact-checked, cited sources, no plagiarism</li>
            <li>A clear, compelling argument or narrative</li>
          </ul>
        </section>
        <section>
          <h2 className="font-semibold text-lg mb-2">Topics we cover</h2>
          <div className="flex flex-wrap gap-2">
            {["India", "World Affairs", "Politics", "Business", "Economy", "Technology", "Science", "Environment", "Sports", "Opinion"].map(t => (
              <span key={t} className="rounded-full border px-3 py-1 text-xs font-medium">{t}</span>
            ))}
          </div>
        </section>
        <section>
          <h2 className="font-semibold text-lg mb-2">How to submit</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create a contributor account, draft your piece in our editor, and submit for editorial review.
            Our team responds within 3–5 business days.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/contributor">Submit via Contributor Portal</Link>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:contribute@tradingle.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Email pitch
              </a>
            </Button>
          </div>
        </section>
        <p className="text-xs text-muted-foreground border-t pt-4">
          By submitting, you confirm the work is original and grant Tradingle a non-exclusive licence to
          publish and distribute it. Contributors are credited by name.
        </p>
      </div>
    </Card>
  </div>
);

export default WriteForUs;
