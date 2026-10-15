"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

/* Newsletter sign-up band at the top of the site footer. Posts to the existing
   public endpoint api/newsletters/subscribe.php (rate-limited per IP
   server-side). Kept as a small client island — the rest of the footer is
   server-rendered. Colours come from the `.trd-foot` contract on the ancestor
   <footer>. */

export default function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setStatus("busy");
    setError("");
    try {
      await hostingerApi.subscribeNewsletter({ email: value, source: "footer" });
      setStatus("done");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Could not subscribe right now. Please try again.");
      setStatus("idle");
    }
  };

  return (
    <section
      aria-labelledby="footer-newsletter-title"
      className="border-b border-b-[color:var(--ft-rule)]"
    >
      <div className="trd-container grid gap-x-10 gap-y-5 py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:py-9">
        <div>
          <p className="text-[10.5px] font-[700] uppercase tracking-[0.16em] text-[color:var(--ft-fg-mute)]">
            Newsletter
          </p>
          <h2
            id="footer-newsletter-title"
            className="mt-1.5 text-[22px] font-[700] leading-[1.15] tracking-[-0.018em] text-[color:var(--ft-fg)] sm:text-[25px]"
          >
            The Daily Briefing
          </h2>
          <p className="mt-2 max-w-[58ch] text-[13.5px] leading-[1.5] text-[color:var(--ft-fg-dim)]">
            The five stories setting the agenda, in your inbox by 7:00 IST every weekday. Free, and one click to
            leave.
          </p>
        </div>

        <div className="lg:justify-self-end lg:w-full">
          {status === "done" ? (
            <p
              role="status"
              className="flex items-center gap-2 text-[13.5px] font-[600] text-[color:var(--ft-fg)]"
            >
              <CheckCircle2 size={16} strokeWidth={2.2} aria-hidden />
              You&apos;re subscribed. Check your inbox to confirm.
            </p>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="footer-newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  disabled={status === "busy"}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "footer-newsletter-error" : undefined}
                  className="h-11 min-w-0 flex-1 border border-[color:var(--ft-rule-strong)] bg-[color:var(--ft-tint)] px-3.5 text-[13.5px] text-[color:var(--ft-fg)] placeholder:text-[color:var(--ft-fg-mute)] focus:border-[color:var(--ft-fg)] focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-[color:var(--ft-fg)]"
                />
                <button
                  type="submit"
                  disabled={status === "busy"}
                  className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 bg-[color:var(--ft-fg)] px-5 text-[11.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--ft-bg)] transition-opacity duration-150 hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ft-fg)] disabled:opacity-60"
                >
                  {status === "busy" ? (
                    <>
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                      Sending
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
                    </>
                  )}
                </button>
              </div>
              {error && (
                <p
                  id="footer-newsletter-error"
                  role="alert"
                  className="mt-2 text-[12px] font-[600] text-[color:var(--ft-fg)]"
                >
                  {error}
                </p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
