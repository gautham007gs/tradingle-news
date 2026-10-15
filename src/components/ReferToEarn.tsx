import React, { useState, useEffect } from "react";
import { Users, Gift, Copy, CheckCircle2, AlertCircle, Mail, LogIn, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { hostingerApi } from "@/lib/hostingerApi";

interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  totalPointsEarned: number;
  referralCode: string;
  qualifyingTarget?: number;
  avgPendingProgress?: number;
}

interface ReferralRow {
  referred_email: string;
  qualifying_articles: number;
  status: string;
  points_earned: number;
}

const encodeReferralEmailCode = (email: string) => {
  const encoded = btoa(email.trim().toLowerCase())
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `e_${encoded.slice(0, 62)}`;
};

const ReferToEarn = () => {
  const { user, openAuthModal } = useAuth();
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [referralRows, setReferralRows] = useState<ReferralRow[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;


    const loadReferralData = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setError("");
        const [statsRes, listRes] = await Promise.all([
          hostingerApi.referralStats(),
          hostingerApi.referralList().catch(() => null),
        ]);

        if (!active) return;

        if (statsRes?.data?.referralCode) {
          setReferralStats(statsRes.data);
        } else {
          throw new Error("Referral code unavailable");
        }

        if (listRes?.data?.referrals) {
          setReferralRows(listRes.data.referrals);
        }
      } catch (err) {
        console.error("Failed to load referral stats:", err);
        if (!active) return;
        setReferralStats({
          totalReferrals: 0,
          qualifiedReferrals: 0,
          totalPointsEarned: 0,
          referralCode: encodeReferralEmailCode(user.email),
          qualifyingTarget: 5,
        });
      } finally {
        if (active) setLoading(false);
      }
    };

    loadReferralData();
    const timer = setInterval(loadReferralData, 30000);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [user?.email]);

  const getReferralLink = () => {
    if (!referralStats?.referralCode) return "";
    return `${window.location.origin}?ref=${referralStats.referralCode}`;
  };

  const handleCopyLink = async () => {
    const link = getReferralLink();
    if (!link) {
      setError("Referral code not available");
      return;
    }
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        const copiedViaFallback = document.execCommand("copy");
        document.body.removeChild(textarea);
        if (!copiedViaFallback) throw new Error("Copy command failed");
      }
      setCopied(true);
      setSuccess("Link copied to clipboard!");
      setTimeout(() => {
        setCopied(false);
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError("Could not copy automatically. Select the link and copy it manually.");
    }
  };

  const handleInviteNow = async () => {
    if (!referralStats?.referralCode) {
      setError("Referral code not available");
      return;
    }
    
    const link = getReferralLink();
    const text = `Join Tradingle as a writer using my invite link: ${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join Tradingle", text, url: link });
        return;
      } catch {
        // User cancelled native share; keep the link available.
      }
    }
    window.location.href = `mailto:?subject=${encodeURIComponent("Join Tradingle as a Writer")}&body=${encodeURIComponent(text)}`;
  };

  if (!user) {
    return (
      <div className="trd-container py-8 sm:py-10">
        <div className="mx-auto max-w-xl rounded-lg border p-6 text-center" style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card-bg))" }}>
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: "hsl(var(--primary) / 0.12)", color: "hsl(var(--primary))" }}>
            <Users size={20} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: "hsl(var(--headline))" }}>Refer & Earn</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: "hsl(var(--subtext))" }}>
            Sign in or create an account to get your referral link and track earned rewards.
          </p>
          <button
            type="button"
            onClick={openAuthModal}
            className="mx-auto mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition-opacity hover:opacity-90"
            style={{ background: "hsl(var(--primary))", color: "white" }}
          >
            <LogIn size={16} />
            Sign in / Sign up
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="trd-container py-8 sm:py-10">
        <div className="rounded-lg border p-6 text-center" style={{ borderColor: "hsl(var(--border))" }}>
          <p style={{ color: "hsl(var(--subtext))" }}>
            Loading your referral details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="trd-container py-8 sm:py-10 md:py-12">
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "linear-gradient(135deg, hsl(var(--card-bg)), hsl(218 25% 18%))" }}
      >
        {/* Header */}
        <div className="px-5 py-6 sm:px-8 sm:py-8 border-b" style={{ borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: "hsl(var(--primary))" }}
            >
              <Gift className="w-5 h-5" style={{ color: "white" }} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "hsl(var(--headline))" }}>
                Refer & Earn
              </h2>
              <p className="text-xs sm:text-sm" style={{ color: "hsl(var(--subtext))" }}>
                Invite writers and earn 100 bonus points per referral
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-5 mt-5 sm:mx-8 sm:mt-5 flex items-center gap-2 p-3 rounded bg-red-500/10 border border-red-500/20">
            <AlertCircle size={16} style={{ color: "var(--ink-900)" }} />
            <span style={{ fontSize: "13px", color: "var(--ink-900)", fontWeight: 600 }}>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mx-5 mt-5 sm:mx-8 sm:mt-5 flex items-center gap-2 p-3 rounded bg-green-500/10 border border-green-500/20">
            <CheckCircle2 size={16} style={{ color: "#10b981" }} />
            <span style={{ fontSize: "13px", color: "#10b981" }}>{success}</span>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div
              className="rounded-lg p-4 border"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card-bg))" }}
            >
              <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                Total Referrals
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "hsl(var(--primary))" }}>
                {referralStats?.totalReferrals || 0}
              </p>
            </div>

            <div
              className="rounded-lg p-4 border"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card-bg))" }}
            >
              <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                Qualified (5+ Articles)
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "hsl(var(--primary))" }}>
                {referralStats?.qualifiedReferrals || 0}
              </p>
            </div>

            <div
              className="rounded-lg p-4 border col-span-2 sm:col-span-1"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card-bg))" }}
            >
              <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                Points Earned
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: "hsl(var(--primary))" }}>
                {referralStats?.totalPointsEarned || 0}
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div
            className="rounded-lg p-4 sm:p-5 mb-8 border"
            style={{ borderColor: "hsl(var(--border))", background: "hsl(218 30% 15%)" }}
          >
            <h3 className="font-bold text-sm mb-4" style={{ color: "hsl(var(--headline))" }}>
              How It Works
            </h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: "hsl(var(--primary))", color: "white" }}
                >
                  1
                </div>
                <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                  Share your referral link with potential writers
                </p>
              </div>
              <div className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: "hsl(var(--primary))", color: "white" }}
                >
                  2
                </div>
                <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                  They publish 5 editor-approved articles on current news (recent, top/breaking, or homepage trending)
                </p>
              </div>
              <div className="flex gap-3">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                  style={{ background: "hsl(var(--primary))", color: "white" }}
                >
                  3
                </div>
                <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                  You earn 100 bonus points when they qualify
                </p>
              </div>
            </div>
          </div>

          {/* Referral Link - Compact */}
          {referralStats?.referralCode && (
            <div
              className="rounded-lg p-4 sm:p-5 border mb-8"
              style={{ borderColor: "hsl(var(--primary))", background: "hsl(var(--primary) / 0.1)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "hsl(var(--primary))" }}>
                YOUR REFERRAL LINK
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={getReferralLink()}
                  className="flex-1 text-xs px-3 py-2 rounded border bg-background"
                  style={{
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded transition-all flex items-center gap-1.5 text-xs font-semibold"
                  style={{
                    background: "hsl(var(--primary))",
                    color: "white",
                  }}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Share Options */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInviteNow}
                  className="flex-1 sm:flex-none px-3 py-2 rounded text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  style={{
                    border: "1px solid hsl(var(--primary))",
                    color: "hsl(var(--primary))",
                  }}
                >
                  {navigator.share ? <Send size={14} /> : <Mail size={14} />}
                  <span>Invite Now</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded text-xs mb-4" style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <AlertCircle size={14} style={{ color: "var(--ink-900)" }} />
              <span style={{ color: "var(--ink-900)", fontWeight: 600 }}>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded text-xs mb-4" style={{ background: "rgba(34, 197, 94, 0.1)" }}>
              <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
              <span style={{ color: "#22c55e" }}>{success}</span>
            </div>
          )}

          {referralRows.length > 0 && (
            <div className="mb-8 rounded-lg border p-4" style={{ borderColor: "hsl(var(--border))" }}>
              <h3 className="mb-3 text-sm font-bold" style={{ color: "hsl(var(--headline))" }}>
                Referral progress
              </h3>
              <ul className="space-y-2">
                {referralRows.slice(0, 6).map((row) => {
                  const target = referralStats?.qualifyingTarget ?? 5;
                  const progress = Math.min(row.qualifying_articles, target);
                  return (
                    <li key={row.referred_email} className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate">{row.referred_email}</span>
                        <span className="font-semibold capitalize">{row.status}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(progress / target) * 100}%`,
                            background: "hsl(var(--primary))",
                          }}
                        />
                      </div>
                      <p className="mt-1">{progress}/{target} qualifying articles</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="text-xs" style={{ color: "hsl(var(--subtext))" }}>
            Only unique, real email addresses qualify. Temporary emails are blocked. Progress updates automatically when referred writers are published on current news.
          </p>
        </div>
      </div>
    </section>
  );
};

export default ReferToEarn;
