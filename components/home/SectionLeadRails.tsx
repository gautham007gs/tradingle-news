import MpaLink from "@/components/MpaLink";
import { articlePath } from "@/lib/articlePaths";

interface Story {
  slug?: string;
  title: string;
  image?: string;
  category?: string;
  excerpt?: string;
}

interface Props {
  lead: Story;
  rails: Story[];
}

function StoryImg({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) return null;
  return (
    <img
      src={src}
      alt={alt}
      className={`${className ?? "w-full h-full object-cover"} object-center block`}
      loading="lazy"
      width={400}
      height={225}
    />
  );
}

/**
 * India Today-style section layout:
 *   Left  â†’ big lead card (38% desktop, full width mobile)
 *   Right â†’ stacked thumbnail-row rails (3 items)
 *
 * Responsive: stacks vertically on mobile.
 */
export default function SectionLeadRails({ lead, rails }: Props) {
  return (
    <div className="flex flex-col md:flex-row gap-0">
      {/* Lead card */}
      <MpaLink
        to={articlePath(lead)}
        className="flex flex-col md:w-[38%] md:flex-shrink-0 md:pr-6 md:border-r border-[#e6e6e6] group pb-5 md:pb-0"
      >
        {lead.image && (
          <div className="aspect-[3/2] overflow-hidden mb-3 relative">
            <StoryImg
              src={lead.image}
              alt={lead.title}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
            {/* Category pill overlaid on image â€” cleaner than below-image label */}
                      </div>
        )}
        {/* Category shown below image only when there's no image */}
                <h3 className="text-[15px] sm:text-[17px] font-[600] leading-[1.25] mt-1 line-clamp-3 group-hover:underline underline-offset-2 decoration-[1px] text-left">
          {lead.title}
        </h3>
      </MpaLink>

      {/* Rails */}
      {rails.length > 0 && (
        <div className="flex-1 md:pl-6 flex flex-col border-t md:border-t-0 pt-4 md:pt-0">
          {rails.map((s, i) => (
            <MpaLink
              key={s.slug || i}
              to={articlePath(s)}
              className={`flex gap-3 items-start py-[11px] group ${
                i < rails.length - 1 ? "border-b border-[#e6e6e6]" : ""
              }`}
            >
              {s.image && (
                <div className="w-[100px] h-[68px] sm:w-[112px] sm:h-[76px] overflow-hidden flex-shrink-0">
                  <StoryImg
                    src={s.image}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                                <h3 className="text-[13px] sm:text-[14px] font-[500] leading-[1.35] line-clamp-3 group-hover:underline underline-offset-2 decoration-[1px]">
                  {s.title}
                </h3>
              </div>
            </MpaLink>
          ))}
        </div>
      )}
    </div>
  );
}
