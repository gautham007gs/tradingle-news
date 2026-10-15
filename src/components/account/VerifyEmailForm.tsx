"use client";

import { useCallback, useEffect, useState } from "react";

type Status = "verifying" | "success" | "error";

export default function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resending, setResending] = useState(false);

  const verify = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/verify-email.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(payload.error || "This link is invalid or has expired.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the verification service. Please try again.");
    }
  }, [token]);

  useEffect(() => {
    if (token) void verify();
  }, [token, verify]);

  const resend = async () => {
    setResending(true);
    try {
      await fetch("/api/auth/resend-verification.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "" }),
      });
    } catch {
      // ignored — response is intentionally generic to avoid enumeration
    }
    setResending(false);
    setResendSent(true);
  };

  if (status === "verifying") {
    return <p className="text-muted-foreground">Verifying your email…</p>;
  }

  if (status === "success") {
    return (
      <div>
        <p className="mb-4">Your email address has been verified. You are all set.</p>
        <a href="/" className="text-primary underline">Return to homepage</a>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4">{message}</p>
      <div className="flex gap-4 justify-center">
        <button
          type="button"
          onClick={verify}
          className="text-primary underline"
        >
          Try again
        </button>
        {!resendSent ? (
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="text-primary underline disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        ) : (
          <span className="text-muted-foreground">
            If your address is registered, a new link is on its way.
          </span>
        )}
      </div>
    </div>
  );
}
