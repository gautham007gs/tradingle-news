"use client";

import { useId, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

/* Signup form used on the /newsletters hub — once inline on each edition card
   and once in the page's combined sign-up band. `source` is passed through to
   api/newsletters/subscribe.php so we can see which edition drove a signup;
   `categorySlug` maps the edition onto an existing desk where one exists. */
export default function NewsletterSignup({
  source,
  categorySlug,
  label = "Subscribe",
  compact = false,
}: {
  source: string;
  categorySlug?: string;
  label?: string;
  compact?: boolean;
}) {
  const uid = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !value.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setStatus("busy");
    setError("");
    try {
      await hostingerApi.subscribeNewsletter({ email: value, source, category_slug: categorySlug });
      setStatus("done");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Could not subscribe right now. Please try again.");
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-[13px] font-[600] text-[color:var(--ink-900)]"
      >
        <CheckCircle2 size={15} strokeWidth={2.2} aria-hidden />
        Subscribed. Check your inbox to confirm.
      </p>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={compact ? "" : "max-w-[420px]"}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`${uid}-email`} className="sr-only">
          Email address
        </label>
        <input
          id={`${uid}-email`}
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
          aria-describedby={error ? `${uid}-error` : undefined}
          className="h-10 min-w-0 flex-1 border border-[color:var(--rule-strong)] bg-[color:var(--canvas)] px-3 text-[13.5px] text-[color:var(--ink-900)] placeholder:text-[color:var(--ink-500)] focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-[color:var(--ink-900)]"
        />
        <button
          type="submit"
          disabled={status === "busy"}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 bg-[color:var(--ink-900)] px-4 text-[11.5px] font-[700] uppercase tracking-[0.12em] text-[color:var(--on-ink)] transition-opacity hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--ink-900)] disabled:opacity-60"
        >
          {status === "busy" ? (
            <>
              <Loader2 size={13} className="animate-spin" aria-hidden />
              Sending
            </>
          ) : (
            <>
              {label}
              <ArrowRight size={13} aria-hidden />
            </>
          )}
        </button>
      </div>
      {error && (
        <p id={`${uid}-error`} role="alert" className="mt-2 text-[12px] font-[600] text-[color:var(--ink-900)]">
          {error}
        </p>
      )}
    </form>
  );
}
