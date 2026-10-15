import { useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertCircle, Newspaper } from "lucide-react";

const destinationFor = (roles: string[]) => {
  if (roles.includes("admin") || roles.includes("editor") || roles.includes("author")) return "/admin";
  if (roles.includes("contributor")) return "/contributor";
  return "/contributor";
};

const AdminLogin = () => {
  const { user, signIn, signUp, complete2fa, roles, loading, googleSignInUrl } = useCmsAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/admin";
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const landingPath = (location.state as any)?.from?.pathname || destinationFor(roles);
  if (user && !loading) return <Navigate to={landingPath} replace />;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error, roles: nextRoles, requires_2fa, two_factor_token } = await signIn(email, password);
    setBusy(false);
    if (error) { setAuthError(error); toast.error(error); return; }
    setAuthError("");
    if (requires_2fa && two_factor_token) {
      setTwoFactorToken(two_factor_token);
      return;
    }
    toast.success("Welcome back");
    nav(from, { replace: true });
  };

  const handle2fa = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error, roles: nextRoles } = await complete2fa(twoFactorToken, totpCode);
    setBusy(false);
    if (error) { setAuthError(error); toast.error(error); return; }
    setAuthError("");
    toast.success("Welcome back");
    nav(from, { replace: true });
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await signUp(email, password, name);
    setBusy(false);
    if (error) {
      setAuthError(error);
      toast.error(error);
    }
    else {
      setAuthError("");
      toast.success("Account created");
      nav("/contributor", { replace: true });
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md overflow-hidden border shadow-xl">
        <div className="h-1 bg-primary" />
        <div className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Newspaper className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-xl font-bold">News CMS</h1>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>
        {authError && (
          <div className="mb-4 flex gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <p className="font-semibold">Sign in failed</p>
              <p className="mt-1 text-xs leading-relaxed">{authError}</p>
            </div>
          </div>
        )}
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 mb-4 w-full">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            {!twoFactorToken ? (
              <form onSubmit={handleSignIn} className="space-y-3" autoComplete="on">
                <div><Label htmlFor="login-email">Email</Label><Input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div><Label htmlFor="login-password">Password</Label><Input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => { window.location.href = googleSignInUrl; }}>
                  Continue with Google
                </Button>
              </form>
            ) : (
              <form onSubmit={handle2fa} className="space-y-3" autoComplete="on">
                <div>
                  <Label htmlFor="admin-totp">Authenticator code</Label>
                  <Input
                    id="admin-totp"
                    value={totpCode}
                    onChange={e => setTotpCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Verifying…" : "Verify & sign in"}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setTwoFactorToken("")}>
                  Back
                </Button>
              </form>
            )}
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-3" autoComplete="on">
              <div><Label htmlFor="signup-name">Display name</Label><Input id="signup-name" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label htmlFor="signup-email">Email</Label><Input id="signup-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label htmlFor="signup-password">Password</Label><Input id="signup-password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating account…" : "Create account"}</Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => { window.location.href = googleSignInUrl; }}>
                Continue with Google
              </Button>
              <p className="text-xs text-muted-foreground">New users start as contributors. An Admin can promote you.</p>
            </form>
          </TabsContent>
        </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default AdminLogin;
