"use client";

import { FormEvent, useState } from "react";

export default function AdminCatchAll() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.user) {
        throw new Error(payload.error || payload.message || "Unable to sign in. Check your credentials and try again.");
      }
      window.location.assign("/admin");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-5 text-[#17202a]">
      <section className="w-full max-w-[430px] overflow-hidden rounded-2xl border border-[#e1e5ea] bg-white shadow-[0_18px_60px_rgba(24,36,48,.10)]">
        <div className="h-1 bg-[#d71920]" />
        <div className="p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d71920] text-xl font-black text-white">T</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Tradingle CMS</h1>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-[.14em] text-[#68727d]">Admin Console</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-[#68727d]">Sign in to manage articles, categories, media and editorial settings.</p>
          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold">
              Email
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 block h-11 w-full rounded-lg border border-[#d6dce2] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#d71920] focus:ring-2 focus:ring-red-100" />
            </label>
            <label className="block text-sm font-semibold">
              Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 block h-11 w-full rounded-lg border border-[#d6dce2] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#d71920] focus:ring-2 focus:ring-red-100" />
            </label>
            <button disabled={busy} className="h-11 w-full rounded-lg bg-[#d71920] text-sm font-bold text-white transition hover:bg-[#b9151b] disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="mt-7 border-t border-[#edf0f2] pt-5 text-center text-xs leading-5 text-[#7b858e]">Use your Tradingle administrator credentials. Sessions are secured with an HttpOnly cookie.</p>
        </div>
      </section>
    </main>
  );
}
