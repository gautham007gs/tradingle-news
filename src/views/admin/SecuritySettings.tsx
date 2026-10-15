"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/cms/PageHeader";
import { hostingerApi } from "@/lib/hostingerApi";
import { useCmsAuth } from "@/hooks/useCmsAuth";

/**
 * Admin security panel (audit issue #17).
 *
 * Two-factor authentication (TOTP) management. The flow is:
 *   1. Setup — generates a secret + otpauth:// provisioning URI.
 *   2. Enable — the admin proves they hold the secret by entering a valid code.
 *   3. Disable — requires a valid code too, so a stolen session cookie cannot
 *      silently downgrade the account.
 * All three calls go through hostingerApi (authenticated + CSRF-protected).
 */
const SecuritySettings = () => {
  const { user, refresh } = useCmsAuth();
  const totpEnabled = Boolean(user?.totp_enabled);

  const [phase, setPhase] = useState<"idle" | "pending" | "enabled" | "disabled">(totpEnabled ? "enabled" : "idle");
  const [secret, setSecret] = useState("");
  const [provisioningUri, setProvisioningUri] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPhase(totpEnabled ? "enabled" : "disabled");
  }, [totpEnabled]);

  const beginSetup = async () => {
    setBusy(true);
    try {
      const res = await hostingerApi.setup2fa();
      setSecret(res.secret);
      setProvisioningUri(res.provisioning_uri);
      setPhase("pending");
      setCode("");
    } catch (e: any) {
      toast.error(e.message || "Could not start two-factor setup.");
    }
    setBusy(false);
  };

  const confirmEnable = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    try {
      await hostingerApi.enable2fa(code);
      await refresh();
      setPhase("enabled");
      setSecret("");
      setProvisioningUri("");
      setCode("");
      toast.success("Two-factor authentication is now enabled.");
    } catch (e: any) {
      toast.error(e.message || "Invalid code. Please try again.");
    }
    setBusy(false);
  };

  const confirmDisable = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter a valid 6-digit code to confirm disabling.");
      return;
    }
    setBusy(true);
    try {
      await hostingerApi.disable2fa(code);
      await refresh();
      setPhase("disabled");
      setCode("");
      toast.success("Two-factor authentication disabled.");
    } catch (e: any) {
      toast.error(e.message || "Invalid code. Two-factor authentication was not disabled.");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Two-factor authentication and account hardening"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {phase === "enabled" ? <ShieldCheck className="h-5 w-5 text-green-600" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
            Two-factor authentication
          </CardTitle>
          <CardDescription>
            Adds a second factor to admin logins using any TOTP app (Google Authenticator,
            Authy, 1Password). Enable it to protect privileged account access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase === "enabled" && (
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600">Enabled</Badge>
              <span className="text-sm text-muted-foreground">
                Your admin login now requires a code from your authenticator app.
              </span>
            </div>
          )}

          {phase === "pending" && (
            <div className="space-y-4 rounded-md border p-4">
              <p className="text-sm">
                Scan the QR code in your authenticator app, or enter this secret manually:
              </p>
              <code className="block rounded bg-muted px-3 py-2 text-sm break-all">{secret}</code>
              {provisioningUri && (
                <a
                  href={provisioningUri}
                  className="text-sm text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in authenticator (otpauth://)
                </a>
              )}
              <label className="block text-sm" htmlFor="2fa-code">
                Enter the 6-digit code to confirm
              </label>
              <Input
                id="2fa-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              <Button onClick={confirmEnable} disabled={busy}>
                <KeyRound className="mr-2 h-4 w-4" />
                {busy ? "Verifying…" : "Enable two-factor authentication"}
              </Button>
            </div>
          )}

          {phase === "disabled" && (
            <Button onClick={beginSetup} disabled={busy}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              {busy ? "Generating secret…" : "Set up two-factor authentication"}
            </Button>
          )}

          {phase === "enabled" && (
            <div className="space-y-2 border-t pt-4">
              <label className="block text-sm" htmlFor="2fa-disable-code">
                To disable, enter a valid code:
              </label>
              <div className="flex max-w-sm items-center gap-3">
                <Input
                  id="2fa-disable-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                />
                <Button variant="destructive" onClick={confirmDisable} disabled={busy}>
                  Disable
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SecuritySettings;
