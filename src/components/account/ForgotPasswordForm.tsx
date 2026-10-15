"use client";

import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Enter your email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok && payload.error) {
        setError(payload.error);
        setBusy(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Could not reach the reset service. Please try again.");
    }
    setBusy(false);
  };

  if (submitted) {
    return (
      <div>
        <p>
          If an account exists for that address, a password reset link has been
          sent. It expires in 30 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto text-left">
      <label className="block text-sm mb-1" htmlFor="fp-email">Email address</label>
      <input
        id="fp-email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
        placeholder="you@example.com"
      />
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full bg-primary text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
