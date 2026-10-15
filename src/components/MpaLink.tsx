"use client";

import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";

type MpaLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  replace?: boolean;
};

/** Native anchor link — triggers full page load (MPA). Drop-in for react-router Link. */
const MpaLink = forwardRef<HTMLAnchorElement, MpaLinkProps>(function MpaLink(
  { to, replace: _replace, onClick, target, rel, ...rest },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target === "_blank") return;
    if (!to.startsWith("/") || to.startsWith("//")) return;
    if (to.startsWith("/admin") || to.startsWith("/contributor")) return;
  };

  const safeRel = target === "_blank" ? rel ?? "noopener noreferrer" : rel;

  return <a ref={ref} href={to} onClick={handleClick} target={target} rel={safeRel} {...rest} />;
});

export default MpaLink;
