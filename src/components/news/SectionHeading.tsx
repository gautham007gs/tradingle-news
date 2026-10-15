import MpaLink from "@/components/MpaLink";

import { ChevronRight } from "lucide-react";
import { toTitleCase } from "@/lib/titleCase";

type SectionHeadingProps = {
  title: string;
  href?: string;
  viewMoreHref?: string;
  viewMoreLabel?: string;
};

const SectionHeading = ({ title, href, viewMoreHref, viewMoreLabel = "View more" }: SectionHeadingProps) => {
  return (
    <div className={`trd-editorial-section-head${viewMoreHref ? "" : " trd-editorial-section-head--solo"}`}>
      {href ? (
        <MpaLink to={href} className="trd-editorial-section-title headline-link">
          <span className="trd-editorial-section-accent" aria-hidden />
          {toTitleCase(title)}
          <ChevronRight size={16} className="trd-editorial-section-chevron" aria-hidden />
        </MpaLink>
      ) : (
        <h2 className="trd-editorial-section-title">
          <span className="trd-editorial-section-accent" aria-hidden />
          {toTitleCase(title)}
        </h2>
      )}
      {viewMoreHref && (
        <MpaLink to={viewMoreHref} className="trd-editorial-section-more headline-link">
          {viewMoreLabel}
        </MpaLink>
      )}
    </div>
  );
};

export default SectionHeading;
