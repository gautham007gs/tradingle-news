"use client";

import MpaLink from "@/components/MpaLink";
import Logo from "./Logo";
import { footerColumns, footerLegalLinks, socialLinks } from "@/lib/navConfig";
import { Twitter, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { usePublicSiteSettings } from "@/lib/usePublicSiteSettings";

/* Client-rendered footer used by the CMS article preview and the saved-articles
   view, both of which render outside the (site) route group and so cannot use
   the server footer. Markup and classes are kept in step with
   components/layout/FooterServer.tsx — change both together. The newsletter
   band is omitted here on purpose: neither surface is a reader entry point. */

const SOCIAL_ICONS: Record<string, LucideIcon> = {
  Twitter,
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
  YouTube: Youtube,
};

const COL_TITLE =
  "text-[11px] font-[700] uppercase tracking-[0.15em] text-[color:var(--ft-fg)] pb-2.5 mb-3 border-b border-b-[color:var(--ft-rule-strong)]";

const COL_LINK =
  "block py-[3px] text-[13px] leading-[1.45] text-[color:var(--ft-fg-dim)] transition-colors duration-150 hover:text-[color:var(--ft-fg)] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ft-fg)]";

const SOCIAL_LINK =
  "inline-flex h-9 w-9 items-center justify-center border border-[color:var(--ft-rule)] text-[color:var(--ft-fg-dim)] transition-colors duration-150 hover:border-[color:var(--ft-fg)] hover:bg-[color:var(--ft-tint)] hover:text-[color:var(--ft-fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ft-fg)]";

const LEGAL_LINK =
  "text-[11.5px] leading-[1.4] text-[color:var(--ft-fg-mute)] transition-colors duration-150 hover:text-[color:var(--ft-fg)] hover:underline hover:underline-offset-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ft-fg)]";

const Footer = () => {
  const siteSettings = usePublicSiteSettings();

  return (
    <footer className="trd-foot mt-auto" role="contentinfo" aria-label="Site footer">
      <div className="trd-container grid gap-x-8 gap-y-9 py-10 lg:grid-cols-[224px_minmax(0,1fr)] lg:gap-x-12 lg:py-12 xl:grid-cols-[248px_minmax(0,1fr)]">
        <div>
          <div className="flex items-center">
            <Logo size="lg" variant="footer" />
          </div>
          <p className="mt-4 max-w-[46ch] text-[13px] leading-[1.55] text-[color:var(--ft-fg-dim)]">
            {siteSettings.footer_tagline ||
              "Breaking news, in-depth reporting and analysis on India, markets, technology and global affairs."}
          </p>

          <h2 className="mt-6 text-[10.5px] font-[700] uppercase tracking-[0.15em] text-[color:var(--ft-fg-mute)]">
            Follow Tradingle
          </h2>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {socialLinks.map((social) => {
              const Icon = SOCIAL_ICONS[social.name];
              if (!Icon) return null;
              return (
                <li key={social.name}>
                  <a
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOCIAL_LINK}
                    aria-label={`Tradingle on ${social.name}`}
                  >
                    <Icon size={15} strokeWidth={1.9} aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid gap-x-7 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {footerColumns.map((column, i) => (
            <nav
              key={column.title}
              aria-labelledby={`client-footer-col-${column.id ?? column.title}`}
              className={`border-[color:var(--ft-rule)] ${i % 2 === 1 ? "sm:border-l sm:pl-7" : ""} ${
                i % 3 === 0 ? "lg:border-l-0 lg:pl-0" : "lg:border-l lg:pl-7"
              } ${i === 0 ? "xl:border-l-0 xl:pl-0" : "xl:border-l xl:pl-6"}`}
            >
              <h2 id={`client-footer-col-${column.id ?? column.title}`} className={COL_TITLE}>
                {column.title}
              </h2>
              <ul>
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.href}`}>
                    <MpaLink to={link.href} className={COL_LINK}>
                      {link.label}
                    </MpaLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-t-[color:var(--ft-rule)]">
        <div className="trd-container flex flex-col gap-4 py-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="lg:max-w-[62%]">
            <nav aria-label="Legal and editorial standards" className="flex flex-wrap gap-x-4 gap-y-1.5">
              {footerLegalLinks.map((l) => (
                <MpaLink key={l.href} to={l.href} className={LEGAL_LINK}>
                  {l.label}
                </MpaLink>
              ))}
            </nav>
            <p className="mt-3 text-[11.5px] leading-[1.5] text-[color:var(--ft-fg-mute)]">
              © {new Date().getFullYear()} Tradingle Media Pvt. Ltd. All rights reserved. Registered in India.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
