import React, { useState } from "react";
import { Mail, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

const Newsletter = React.forwardRef<HTMLElement>(function Newsletter(_, ref) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await hostingerApi.subscribeNewsletter({ email: email.trim(), source: "homepage" });
      setSubmitted(true);
      setEmail("");
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: any) {
      setError(err?.message || "Could not subscribe. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section ref={ref} className="trd-container py-5 sm:py-6 md:py-7">
      <div
        className="relative overflow-hidden rounded-sm px-4 py-5 sm:px-6 sm:py-6 md:px-7 md:py-6"
        style={{ background: "linear-gradient(135deg, hsl(var(--nav-bg)), hsl(218 42% 15%))", border: "1px solid hsl(var(--border))" }}
      >
        {/* Background accent - subtle */}
        <div
          className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full blur-3xl"
          style={{ background: "hsl(var(--primary))" }}
        />

        <div className="relative z-10">
          {submitted ? (
            // Success State - Compact
            <div className="flex flex-col items-center text-center space-y-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: "hsl(var(--primary))" }}
              >
                <CheckCircle2 className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <div>
                <h3
                  className="text-sm font-bold"
                  style={{ color: "hsl(var(--nav-foreground))" }}
                >
                  Subscribed!
                </h3>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "hsl(218 12% 48%)" }}
                >
                  Check your inbox
                </p>
              </div>
            </div>
          ) : (
            // Subscription Form
            <div>
              {/* Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    <Mail className="w-3 h-3" style={{ color: "white" }} />
                  </div>
                  <h2
                    className="text-base sm:text-lg font-bold leading-tight"
                    style={{ color: "hsl(var(--nav-foreground))" }}
                  >
                    Daily Briefing
                  </h2>
                </div>
                <p
                  className="text-xs ml-8"
                  style={{ color: "hsl(218 12% 48%)" }}
                >
                  Top stories delivered daily • Free • No spam
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    disabled={busy}
                    className="flex-1 px-3 py-2 text-sm rounded outline-none transition-all"
                    style={{
                      background: "hsl(218 42% 13%)",
                      color: "hsl(var(--nav-foreground))",
                      border: error ? "2px solid rgba(255,255,255,0.75)" : "1px solid hsl(0 0% 22%)",
                    }}
                    onFocus={(e) => {
                      if (!error) {
                        e.currentTarget.style.borderColor = "hsl(var(--primary))";
                      }
                    }}
                    onBlur={(e) => {
                      if (!error) {
                        e.currentTarget.style.borderColor = "hsl(218 30% 22%)";
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className="px-3 py-2 font-semibold rounded transition-all flex items-center justify-center gap-1 group hover:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-sm sm:px-4"
                    style={{
                      background: "hsl(var(--primary))",
                      color: "white",
                    }}
                  >
                    {busy ? "..." : "Subscribe"}
                    {!busy && <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 text-xs p-2 rounded" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
                    <AlertCircle size={13} style={{ color: "#ffffff", flexShrink: 0 }} />
                    <span style={{ color: "#ffffff", fontWeight: 600 }}>{error}</span>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

export default Newsletter;
