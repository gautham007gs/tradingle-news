import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { hostingerApi, type ApiAdSlot } from "@/lib/hostingerApi";
import { Megaphone, Save } from "lucide-react";
import { toast } from "sonner";

const providers = [
  ["placeholder", "Placeholder"],
  ["google_adsense", "Google AdSense"],
  ["google_ad_manager", "Google Ad Manager"],
  ["custom_html", "Custom HTML"],
  ["image", "Image Ad"],
  ["affiliate", "Affiliate"],
  ["sponsored", "Sponsored"],
] as const;

const formats = ["leaderboard", "rectangle", "skyscraper", "native", "in_article", "sticky", "fluid", "custom"];
const enabledFlag = (value: unknown) => value !== 0 && value !== false && value !== "0";

const emptySlot: ApiAdSlot = {
  slot_key: "",
  label: "",
  placement: "custom",
  provider: "placeholder",
  format: "rectangle",
  width: 300,
  height: 250,
  desktop_enabled: true,
  mobile_enabled: true,
  is_active: true,
  lazy_load: true,
  auto_insert: false,
  insert_after_paragraph: null,
  disclosure_label: "Advertisement",
};

const AdSlots = () => {
  const [slots, setSlots] = useState<ApiAdSlot[]>([]);
  const [activeId, setActiveId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<ApiAdSlot>(emptySlot);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (keepActiveId?: number | "new" | null) => {
    setLoading(true);
    try {
      const { data } = await hostingerApi.adminAds();
      setSlots(data);
      // Restore the saved slot after reload, or auto-select first
      if (keepActiveId != null) {
        const restored = data.find((s) => s.id === keepActiveId);
        if (restored) {
          setActiveId(keepActiveId);
          setForm(restored);
        } else if (data[0]) {
          setActiveId(data[0].id || null);
          setForm(data[0]);
        }
      } else if (activeId == null && data[0]) {
        setActiveId(data[0].id || null);
        setForm(data[0]);
      }
    } catch (error: any) {
      toast.error(error?.message || "Could not load ad slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectSlot = (slot: ApiAdSlot) => {
    setActiveId(slot.id || null);
    setForm(slot);
  };

  const update = (key: keyof ApiAdSlot, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!form.slot_key.trim()) {
      toast.error("Slot key is required");
      return;
    }
    if (!form.label.trim()) {
      toast.error("Label is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        slot_key: form.slot_key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, ""),
      };
      const result = await hostingerApi.saveAdSlot(payload);
      toast.success("Ad slot saved");
      // Keep the just-saved slot selected after reload
      await load(result.id ?? activeId as any);
    } catch (error: any) {
      toast.error(error?.message || "Could not save ad slot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="w-7 h-7 text-primary" /> Ads & sponsorships
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage ad inventory and display settings. Keep disclosure labels visible for trust and compliance</p>
        </div>
        <Button onClick={() => { setActiveId("new"); setForm(emptySlot); }} className="h-10">
          New ad slot
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-5">
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading ad slots…</div>
          ) : slots.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No ad slots yet</p>
              <Button 
                size="sm" 
                className="mt-3"
                onClick={() => { setActiveId("new"); setForm(emptySlot); }}
              >
                Create first slot
              </Button>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-muted/30">
                <p className="text-sm font-medium">{slots.length} ad {slots.length === 1 ? "slot" : "slots"}</p>
              </div>
              <div className="space-y-1">
                {slots.map((slot) => (
                  <button
                    key={slot.id || slot.slot_key}
                    type="button"
                    onClick={() => selectSlot(slot)}
                    className={`w-full rounded-none border-b last:border-b-0 p-4 text-left transition-all ${activeId === slot.id ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50"}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">{slot.label}</span>
                      <Badge variant={enabledFlag(slot.is_active) ? "default" : "secondary"} className="text-xs">
                        {enabledFlag(slot.is_active) ? "✓ Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <code className="bg-muted/50 px-2 py-0.5 rounded text-[10px]">{slot.slot_key}</code>
                      <span className="ml-2">{slot.provider}</span>
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-6 space-y-5">
          {!activeId && slots.length > 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm">Select an ad slot to edit</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{activeId === "new" ? "New ad slot" : "Edit ad slot"}</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pb-4 border-b">
            <div><Label>Slot key</Label><Input value={form.slot_key} onChange={(e) => update("slot_key", e.target.value)} placeholder="article_mid_1" /></div>
            <div><Label>Label</Label><Input value={form.label} onChange={(e) => update("label", e.target.value)} placeholder="Article mid content" /></div>
            <div><Label>Placement</Label><Input value={form.placement} onChange={(e) => update("placement", e.target.value)} placeholder="article_body" /></div>
            <div><Label>Disclosure label</Label><Input value={form.disclosure_label || ""} onChange={(e) => update("disclosure_label", e.target.value)} placeholder="Advertisement" /></div>
            <div><Label>Provider</Label>
              <Select value={form.provider} onValueChange={(value) => update("provider", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{providers.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Format</Label>
              <Select value={form.format} onValueChange={(value) => update("format", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{formats.map((format) => <SelectItem key={format} value={format}>{format}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Width</Label><Input type="number" value={form.width || ""} onChange={(e) => update("width", e.target.value)} /></div>
            <div><Label>Height</Label><Input type="number" value={form.height || ""} onChange={(e) => update("height", e.target.value)} /></div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ["is_active", "Active"],
              ["desktop_enabled", "Desktop"],
              ["mobile_enabled", "Mobile"],
              ["lazy_load", "Lazy load"],
            ].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="adslots-label-1">{label}</Label>
                <Switch id="adslots-label-1" checked={enabledFlag((form as any)[key])} onCheckedChange={(checked) => update(key as keyof ApiAdSlot, checked)} />
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>AdSense client</Label><Input value={form.google_client || ""} onChange={(e) => update("google_client", e.target.value)} placeholder="ca-pub-..." /></div>
            <div><Label>AdSense slot</Label><Input value={form.google_slot || ""} onChange={(e) => update("google_slot", e.target.value)} placeholder="1234567890" /></div>
            <div className="md:col-span-2"><Label>Google Ad Manager unit path</Label><Input value={form.gam_unit_path || ""} onChange={(e) => update("gam_unit_path", e.target.value)} placeholder="/1234567/tradingle/article_mid" /></div>
            <div><Label>Image URL</Label><Input value={form.image_url || ""} onChange={(e) => update("image_url", e.target.value)} /></div>
            <div><Label>Target URL</Label><Input value={form.target_url || ""} onChange={(e) => update("target_url", e.target.value)} /></div>
          </div>

          <div><Label>Custom HTML / ad tag</Label><Textarea rows={5} value={form.custom_html || ""} onChange={(e) => update("custom_html", e.target.value)} placeholder="<script>...</script> or sponsored embed code" /></div>

          <div className="grid md:grid-cols-[1fr_160px] gap-4 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div><Label>Automatic in-article insertion</Label><p className="text-xs text-muted-foreground">Stores the rule now; connected slots can be inserted after this paragraph number.</p></div>
              <Switch checked={enabledFlag(form.auto_insert)} onCheckedChange={(checked) => update("auto_insert", checked)} />
            </div>
            <div><Label>After paragraph</Label><Input type="number" min={1} value={form.insert_after_paragraph || ""} onChange={(e) => update("insert_after_paragraph", e.target.value)} /></div>
          </div>

          <div><Label>Internal notes</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} placeholder="Campaign, rate card, refresh notes..." /></div>

              <Button onClick={save} disabled={busy} className="w-full">
                <Save className="w-4 h-4 mr-2" /> 
                {busy ? "Saving..." : "Save ad slot"}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AdSlots;
