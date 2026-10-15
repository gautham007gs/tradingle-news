import { SITE_URL } from "@/lib/siteUrl";

export type EdgeSeoPayload = {
  managed: boolean;
  pageTitle: string;
  title: string;
  description: string;
  canonical: string;
  canonicalPath: string;
  type: "website" | "article";
  image?: string;
  noindex?: boolean;
  nofollow?: boolean;
  httpStatus?: number;
};

declare global {
  interface Window {
    __TRD_EDGE_SEO__?: EdgeSeoPayload;
  }
}

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const truncateDescription = (value: string, max = 160) => {
  const normalized = normalizeText(value);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3)}...`;
};

export const readEdgeSeoPayload = (): EdgeSeoPayload | null => {
  if (typeof window === "undefined" || !window.__TRD_EDGE_SEO__?.managed) {
    return null;
  }
  return window.__TRD_EDGE_SEO__;
};

type PageSeoCompareInput = {
  title: string;
  description: string;
  canonical: string;
  type?: "website" | "article";
  image?: string;
  noindex?: boolean;
  nofollow?: boolean;
};

/** Returns true when PHP edge injection already matches client PageSEO props. */
export const edgeSeoMatchesProps = (edge: EdgeSeoPayload, props: PageSeoCompareInput): boolean => {
  const canonicalPath = props.canonical.startsWith("http")
    ? new URL(props.canonical).pathname
    : props.canonical;
  const fullCanonical = props.canonical.startsWith("http")
    ? props.canonical
    : `${SITE_URL}${props.canonical}`;
  const expectedTitle = `${props.title} | Tradingle`;

  return (
    edge.canonicalPath === canonicalPath &&
    edge.canonical === fullCanonical &&
    edge.pageTitle === props.title &&
    edge.title === expectedTitle &&
    edge.description === truncateDescription(props.description) &&
    edge.type === (props.type || "website") &&
    Boolean(edge.noindex) === Boolean(props.noindex) &&
    Boolean(edge.nofollow) === Boolean(props.nofollow)
  );
};
