"use client";

import { FormEvent, useEffect, useState } from "react";

type CmsUser = {
  display_name?: string;
  email?: string;
  roles?: string[];
};

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#d71920] text-xl font-black text-white">T</div>
      <div>
        <h1 className="text-xl font-bold tracking-tight">Tradingle CMS</h1>
        <p className="mt-0.5 text-xs font-medium uppercase tracking-[.14em] text-[#68727d]">Admin Console</p>
      </div>
    </div>
  );
}

function LoginScreen() {
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
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-5 text-[#17202a]">
      <section className="w-full max-w-[430px] overflow-hidden rounded-2xl border border-[#e1e5ea] bg-white shadow-[0_18px_60px_rgba(24,36,48,.10)]">
        <div className="h-1 bg-[#d71920]" />
        <div className="p-8 sm:p-10">
          <Brand />
          <h2 className="mt-8 text-2xl font-bold tracking-tight">Welcome back</h2>
          <p className="mt-2 text-sm leading-6 text-[#68727d]">Sign in to manage articles, categories, media and editorial settings.</p>
          {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          <form onSubmit={signIn} className="mt-7 space-y-4">
            <label className="block text-sm font-semibold">Email
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 block h-11 w-full rounded-lg border border-[#d6dce2] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#d71920] focus:ring-2 focus:ring-red-100" />
            </label>
            <label className="block text-sm font-semibold">Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 block h-11 w-full rounded-lg border border-[#d6dce2] bg-white px-3 text-sm font-normal outline-none transition focus:border-[#d71920] focus:ring-2 focus:ring-red-100" />
            </label>
            <button disabled={busy} className="h-11 w-full rounded-lg bg-[#d71920] text-sm font-bold text-white transition hover:bg-[#b9151b] disabled:cursor-wait disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className="mt-7 border-t border-[#edf0f2] pt-5 text-center text-xs leading-5 text-[#7b858e]">Sessions are secured with an HttpOnly cookie.</p>
        </div>
      </section>
    </main>
  );
}

function AdminHub({ user }: { user: CmsUser }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const cards = [
    ["Articles", "Review, edit and publish your news desk content.", "/admin/articles"],
    ["Homepage", "Curate lead stories, latest rails and editorial sections.", "/admin/homepage"],
    ["Media library", "Manage images and supporting editorial assets.", "/admin/media"],
    ["Site settings", "Update navigation, categories and publication settings.", "/admin/settings"],
  ];

  async function signOut() {
    setLoggingOut(true);
    await fetch("/api/auth/logout.php", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
    window.location.assign("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-[#17202a]">
      <header className="border-b border-[#e1e5ea] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{user.display_name || "Tradingle Admin"}</p><p className="text-xs text-[#68727d]">{user.email}</p></div>
            <button onClick={signOut} disabled={loggingOut} className="rounded-lg border border-[#d6dce2] px-3 py-2 text-sm font-semibold hover:bg-[#f5f6f8] disabled:opacity-60">{loggingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-[#d71920]">Editorial workspace</p><h2 className="mt-2 text-3xl font-bold tracking-tight">Good to see you, {user.display_name || "Admin"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#68727d]">Your administrator session is active. Choose a workspace to continue managing Tradingle.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map(([title, description, href]) => <a key={href} href={href} className="rounded-xl border border-[#e1e5ea] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#d71920] hover:shadow-md"><h3 className="text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#68727d]">{description}</p><span className="mt-5 inline-block text-sm font-bold text-[#d71920]">Open workspace →</span></a>)}
        </div>
      </div>
    </main>
  );
}

export default function AdminCatchAll() {
  const [path, setPath] = useState("");
  const [user, setUser] = useState<CmsUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const currentPath = window.location.pathname;
    setPath(currentPath);
    if (currentPath === "/admin/login") {
      setChecking(false);
      return;
    }
    fetch("/api/auth/me.php", { credentials: "include" })
      .then((response) => response.json())
      .then((payload) => {
        if (payload.user) setUser(payload.user);
        else window.location.assign("/admin/login");
      })
      .catch(() => window.location.assign("/admin/login"))
      .finally(() => setChecking(false));
  }, []);

  if (path === "/admin/login" || !path) return <LoginScreen />;
  if (checking) return <main className="grid min-h-screen place-items-center bg-[#f5f6f8] text-sm text-[#68727d]">Checking admin session…</main>;
  return user ? <AdminHub user={user} /> : null;
}
