"use client";

import { useEffect, useState } from "react";
import MpaLink from "@/components/MpaLink";
import { X, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { COOKIE_CONSENT_KEY } from "@/lib/privacy";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        const timer = window.setTimeout(() => setVisible(true), 900);
        return () => window.clearTimeout(timer);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = (value: "accepted" | "rejected") => {
    setLeaving(true);
    setTimeout(() => {
      try {
        localStorage.setItem(COOKIE_CONSENT_KEY, value);
        document.cookie = `trd_consent=${value}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent("trd-cookie-consent", { detail: value }));
      } catch {
        /* ignore */
      }
      setVisible(false);
      setLeaving(false);
    }, 260);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cc-title"
      aria-describedby="cc-desc"
      className={`cc-root${leaving ? " cc-root--leaving" : ""}`}
    >
      <div className="cc-card">
        {/* Top row: icon + title + close */}
        <div className="cc-top">
          <div className="cc-icon-wrap" aria-hidden>
            <ShieldCheck size={18} strokeWidth={2} />
          </div>
          <div className="cc-headline-group">
            <p className="cc-eyebrow">Privacy</p>
            <h2 id="cc-title" className="cc-title">Your cookie settings</h2>
          </div>
          <button
            type="button"
            className="cc-close"
            onClick={() => dismiss("rejected")}
            aria-label="Close and use essential cookies only"
          >
            <X size={15} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <p id="cc-desc" className="cc-body">
          We use essential cookies to run the site and optional analytics cookies
          to improve your experience.{" "}
          <MpaLink to="/cookies" className="cc-link">
            Cookie policy
          </MpaLink>
        </p>

        {/* Actions */}
        <div className="cc-actions">
          <button
            type="button"
            className="cc-btn cc-btn--accept"
            onClick={() => dismiss("accepted")}
          >
            <ShieldCheck size={14} aria-hidden />
            Accept all
          </button>
          <button
            type="button"
            className="cc-btn cc-btn--essential"
            onClick={() => dismiss("rejected")}
          >
            <SlidersHorizontal size={13} aria-hidden />
            Essential only
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
