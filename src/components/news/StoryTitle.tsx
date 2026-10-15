import type { CSSProperties } from "react";
import { toTitleCase } from "@/lib/titleCase";

type StoryTitleProps = {
  title: string;
  className?: string;
  style?: CSSProperties;
  as?: "h1" | "h2" | "h3" | "h4" | "span" | "p";
};

const StoryTitle = ({ title, className, style, as: Tag = "span" }: StoryTitleProps) => (
  <Tag className={className} style={style}>
    {toTitleCase(title)}
  </Tag>
);

export default StoryTitle;
