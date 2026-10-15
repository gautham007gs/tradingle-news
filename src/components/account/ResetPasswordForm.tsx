"use client";

import { useState } from "react";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setStatus("busy");
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = await res.json().catch(() => ({}));
      if (res.ok && payload.ok) {
        setStatus("done");
        return;
      }
      setStatus("error");
      setError(payload.error || "This reset link is invalid or has expired.");
    } catch {
      setStatus("error");
      setError("Could not reach the reset service. Please try again.");
    }
  };

  if (status === "done") {
    return (
      <div>
        <p className="mb-4">
          Your password has been reset. All existing sessions were signed out —
          you can now sign in with your new password.
        </p>
        <a href="/" className="text-primary underline">Continue to homepage</a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm mx-auto text-left">
      <label className="block text-sm mb-1" htmlFor="rp-password">New password</label>
      <input
        id="rp-password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-3"
      />
      <label className="block text-sm mb-1" htmlFor="rp-confirm">Confirm new password</label>
      <input
        id="rp-confirm"
        type="password"
        autoComplete="new-password"
        required
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full border rounded px-3 py-2 mb-4"
      />
      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      <button
        type="submit"
        disabled={status === "busy"}
        className="w-full bg-primary text-white rounded px-4 py-2 disabled:opacity-50"
      >
        {status === "busy" ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
