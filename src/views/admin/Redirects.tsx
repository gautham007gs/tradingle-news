"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, ArrowRight, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/cms/PageHeader";
import { hostingerApi } from "@/lib/hostingerApi";

type Redirect = {
  id: number;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  article_id: number | null;
  is_active: boolean;
};

const emptyForm = { from: "", to: "", type: "301" as "301" | "302" };

const Redirects = () => {
  const [redirects, setRedirects] = useState<Redirect[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await hostingerApi.redirects();
      setRedirects(
        (data || []).map((r: any) => ({
          id: Number(r.id),
          from_path: r.from_path,
          to_path: r.to_path,
          status_code: Number(r.status_code) === 302 ? 302 : 301,
          article_id: r.article_id != null ? Number(r.article_id) : null,
          is_active: !!Number(r.is_active ?? 1),
        }))
      );
      setLoadFailed(false);
    } catch {
      toast.error("Failed to load redirects");
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addRedirect = async () => {
    const from = form.from.trim();
    const to = form.to.trim();
    if (!from || !to) { toast.error("Both 'From' and 'To' paths are required"); return; }
    if (!from.startsWith("/")) { toast.error("'From' path must start with /"); return; }
    if (from === to) { toast.error("'From' and 'To' can't be the same path"); return; }
    if (redirects.some((r) => r.from_path === from)) { toast.error("A redirect from this path already exists"); return; }

    setAdding(true);
    try {
      const { id } = await hostingerApi.saveRedirect({
        from_path: from, to_path: to, status_code: form.type === "302" ? 302 : 301,
      });
      setRedirects((prev) => [
        ...prev,
        { id, from_path: from, to_path: to, status_code: form.type === "302" ? 302 : 301, article_id: null, is_active: true },
      ]);
      setForm(emptyForm);
      toast.success("Redirect added — live within about a minute");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add redirect");
    } finally {
      setAdding(false);
    }
  };

  const toggleActive = async (r: Redirect, val: boolean) => {
    const prevList = redirects;
    setRedirects((list) => list.map((x) => (x.id === r.id ? { ...x, is_active: val } : x)));
    try {
      await hostingerApi.saveRedirect({ id: r.id, from_path: r.from_path, to_path: r.to_path, status_code: r.status_code, article_id: r.article_id, is_active: val });
    } catch (e: any) {
      setRedirects(prevList);
      toast.error(e?.message ?? "Could not update redirect");
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    const id = deleteId;
    setDeleteId(null);
    const prevList = redirects;
    setRedirects((list) => list.filter((r) => r.id !== id));
    try {
      await hostingerApi.deleteRedirect(id);
      toast.success("Redirect deleted");
    } catch (e: any) {
      setRedirects(prevList);
      toast.error(e?.message ?? "Could not delete redirect");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Redirect Manager"
          description="Create 301 (permanent) or 302 (temporary) URL redirects. Useful when category or article slugs change."
          icon={ArrowRight}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-blue-300/50 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-900 dark:text-blue-200">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Changes here go live within about a minute</strong> for visitors — each save/toggle/delete
          takes effect immediately, and the site checks for updates roughly every 60 seconds.
        </div>
      </div>

      {loadFailed ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <strong>Couldn't load the current redirects.</strong> Try refreshing before adding new ones.
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={load}>
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Add redirect</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-36">
                <Label htmlFor="redirects-from-path-1" className="text-xs font-medium text-muted-foreground">From path</Label>
                <Input id="redirects-from-path-1"
                  className="mt-1"
                  placeholder="/old-url-path"
                  value={form.from}
                  onChange={(e) => setForm((p) => ({ ...p, from: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addRedirect()}
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground mb-2.5 shrink-0" />
              <div className="flex-1 min-w-36">
                <Label htmlFor="redirects-to-path-url-2" className="text-xs font-medium text-muted-foreground">To path / URL</Label>
                <Input id="redirects-to-path-url-2"
                  className="mt-1"
                  placeholder="/new-url-path or https://…"
                  value={form.to}
                  onChange={(e) => setForm((p) => ({ ...p, to: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addRedirect()}
                />
              </div>
              <div className="w-28">
                <Label className="text-xs font-medium text-muted-foreground">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as "301" | "302" }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="301">301 — Permanent</SelectItem>
                    <SelectItem value="302">302 — Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addRedirect} disabled={adding} size="sm" className="gap-1.5 mb-0.5">
                <Plus className="h-3.5 w-3.5" />
                {adding ? "Adding…" : "Add"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Redirect list */}
      {!loadFailed && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Redirects{" "}
            <span className="text-muted-foreground font-normal">({redirects.length})</span>
          </h3>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {redirects.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground border rounded-lg">
            No redirects configured. Add one above.
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_auto_1fr_80px_80px_60px] gap-2 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b bg-muted/30">
                <span>From</span>
                <span />
                <span>To</span>
                <span className="text-center">Type</span>
                <span className="text-center">Active</span>
                <span />
              </div>

              {redirects.map((r) => (
                <div
                  key={r.id}
                  className={`grid grid-cols-[1fr_auto_1fr_80px_80px_60px] gap-2 items-center px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors ${!r.is_active ? "opacity-50" : ""}`}
                >
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate block">{r.from_path}</code>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded truncate block">{r.to_path}</code>
                  <div className="flex justify-center">
                    <Badge variant={r.status_code === 301 ? "default" : "secondary"} className="text-xs">
                      {r.status_code}
                    </Badge>
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => toggleActive(r, v)}
                      className="scale-75"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      aria-label="Delete redirect" onClick={() => setDeleteId(r.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete redirect?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the redirect from{" "}
              <code className="text-xs bg-muted px-1 rounded">{redirects.find((r) => r.id === deleteId)?.from_path ?? ""}</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Redirects;
