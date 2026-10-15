import { useState } from "react";
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hostingerApi } from "@/lib/hostingerApi";

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isAuthModalOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (tab === "signup" && !form.name.trim()) errs.name = "Name is required";
    if (!form.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.password) errs.password = "Password is required";
    else if (form.password.length < 8) errs.password = "Minimum 8 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (tab === "signin") {
        await signIn(form.email, form.password);
        toast({ title: "Welcome back!", description: "You've signed in successfully." });
      } else {
        await signUp(form.name, form.email, form.password);
        toast({ title: "Account created!", description: "Welcome to Tradingle." });
      }
      setForm({ name: "", email: "", password: "" });
      setErrors({});
    } catch (error: any) {
      toast({
        title: tab === "signin" ? "Sign in failed" : "Sign up failed",
        description: error?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (t: "signin" | "signup") => {
    setTab(t);
    setErrors({});
    setForm({ name: "", email: "", password: "" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={closeAuthModal}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-[90vw] max-w-[420px] rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ backgroundColor: "hsl(var(--card))", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with brand bar */}
        <div className="h-[3px]" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))" }} />

        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(var(--headline))" }}>
            {tab === "signin" ? "Sign In" : "Create Account"}
          </h2>
          <button onClick={closeAuthModal} aria-label="Close" className="p-1.5 rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: "hsl(var(--subtext))" }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 flex gap-0 mb-4">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className="flex-1 py-2.5 text-[13px] font-semibold uppercase tracking-wide transition-all"
              style={{
                color: tab === t ? "hsl(var(--primary))" : "hsl(var(--subtext))",
                borderBottom: tab === t ? "2px solid hsl(var(--primary))" : "2px solid transparent",
              }}
            >
              {t === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
          {tab === "signup" && (
            <FieldInput
              icon={<UserIcon size={16} />}
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              error={errors.name}
              autoComplete="name"
            />
          )}
          <FieldInput
            icon={<Mail size={16} />}
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            error={errors.email}
            autoComplete="email"
          />
          <div className="relative">
            <FieldInput
              icon={<Lock size={16} />}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              error={errors.password}
              autoComplete={tab === "signin" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[11px]"
              style={{ color: "hsl(var(--subtext))" }}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {tab === "signin" && (
            <div className="text-right">
              <button type="button" className="text-[12px] font-medium" style={{ color: "hsl(var(--primary))" }}>
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded font-semibold text-[14px] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ backgroundColor: "hsl(var(--primary))", color: "white" }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {tab === "signin" ? "Sign In" : "Create Account"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
            <span className="text-[11px] uppercase tracking-wide" style={{ color: "hsl(var(--subtext))" }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "hsl(var(--border))" }} />
          </div>

          {/* Social buttons */}
          <button
            type="button"
            className="w-full py-2.5 rounded text-[13px] font-medium flex items-center justify-center gap-2 transition-colors"
            style={{ backgroundColor: "hsl(var(--muted))", color: "hsl(var(--headline))", border: "1px solid hsl(var(--border))" }}
            onClick={() => { window.location.href = hostingerApi.googleLoginUrl(); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <p className="text-center text-[11px] pt-1" style={{ color: "hsl(var(--subtext))" }}>
            {tab === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button type="button" onClick={() => switchTab(tab === "signin" ? "signup" : "signin")} className="font-semibold" style={{ color: "hsl(var(--primary))" }}>
              {tab === "signin" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

/* Reusable field input */
const FieldInput = ({
  icon,
  type,
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete?: string;
}) => (
  <div>
    <div
      className="flex items-center gap-2 rounded px-3 py-2.5 transition-colors"
      style={{
        backgroundColor: "hsl(var(--muted))",
        border: error ? "1px solid hsl(var(--destructive))" : "1px solid hsl(var(--border))",
      }}
    >
      <span style={{ color: "hsl(var(--subtext))", flexShrink: 0 }}>{icon}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[hsl(var(--subtext))]"
        style={{ color: "hsl(var(--headline))" }}
      />
    </div>
    {error && <p className="text-[11px] mt-1 font-medium" style={{ color: "hsl(var(--destructive))" }}>{error}</p>}
  </div>
);

export default AuthModal;
