import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Trash2, Plus, Pencil, BookOpen, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import { hostingerApi } from "@/lib/hostingerApi";
import PageHeader from "@/components/cms/PageHeader";
import FieldLabel from "@/components/cms/FieldLabel";

interface Series {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  article_count: number;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  image_url: "",
  is_active: true,
  sort_order: 0,
  seo_title: "",
  seo_description: "",
};

const Series = () => {
  const [items, setItems] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await hostingerApi.seriesList();
      setItems(
        ((data as any[]) ?? []).map((s) => ({
          id: String(s.id),
          name: s.name,
          slug: s.slug,
          description: s.description ?? null,
          image_url: s.image_url ?? null,
          is_active: Boolean(s.is_active),
          sort_order: s.sort_order ?? 0,
          seo_title: s.seo_title ?? null,
          seo_description: s.seo_description ?? null,
          article_count: s.article_count ?? 0,
          created_at: s.created_at ?? "",
          updated_at: s.updated_at ?? "",
        }))
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load series");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.name.trim()) {
      toast.error("Series name is required");
      return;
    }
    setSaving(true);
    try {
      await hostingerApi.saveSeries({
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        image_url: form.image_url || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      });
      setForm(emptyForm);
      toast.success("Series created");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create series");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (s: Series) => {
    setEditForm({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description ?? "",
      image_url: s.image_url ?? "",
      is_active: s.is_active,
      sort_order: s.sort_order,
      seo_title: s.seo_title ?? "",
      seo_description: s.seo_description ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("Series name is required");
      return;
    }
    setSaving(true);
    try {
      await hostingerApi.saveSeries({
        id: editForm.id,
        name: editForm.name,
        slug: editForm.slug || slugify(editForm.name),
        description: editForm.description || null,
        image_url: editForm.image_url || null,
        is_active: editForm.is_active,
        sort_order: editForm.sort_order,
        seo_title: editForm.seo_title || null,
        seo_description: editForm.seo_description || null,
      });
      toast.success("Series updated");
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update series");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string, articleCount: number) => {
    if (articleCount > 0) {
      if (!confirm(`This series has ${articleCount} published articles. Deleting it will unlink them from the series (the articles themselves stay). Continue?`)) return;
    } else {
      if (!confirm("Delete this series? This cannot be undone.")) return;
    }
    try {
      await hostingerApi.deleteSeries(id);
      toast.success("Series deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete series");
    }
  };

  const slugPreview = useMemo(() => slugify(form.name), [form.name]);

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        icon={BookOpen}
        title="Story Series"
        description="Group related articles into ongoing coverage threads for readers to follow."
        help="A Story Series bundles articles covering the same developing story — e.g. 'Budget 2026–27', 'India–Pakistan Tensions', 'IPL 2026'. Articles in a series appear linked together, improving reader engagement and SEO through topical authority."
      />

      {/* Add form */}
      <Card className="p-6 bg-muted/20 border">
        <h2 className="font-semibold mb-4">Create new series</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel help="The series name shown to readers and used as the heading.">Series name</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="e.g., Budget 2026–27, IPL 2026…"
                className="mt-1"
              />
              {form.name && (
                <div className="text-xs text-muted-foreground mt-2">
                  Slug: <code className="bg-muted px-2 py-1 rounded">{slugPreview}</code>
                </div>
              )}
            </div>
            <div>
              <FieldLabel help="Custom URL slug. Auto-generated from name if left blank.">Slug (optional)</FieldLabel>
              <Input
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                placeholder="auto-generated"
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div>
            <FieldLabel help="Describe what this series covers. Shown on the series landing page.">Description (optional)</FieldLabel>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this ongoing series…"
              className="mt-1"
              rows={2}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel help="Cover image URL for the series landing page.">Cover image URL (optional)</FieldLabel>
              <Input
                value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3 mt-6">
              <div>
                <Label className="text-xs font-semibold">Active series</Label>
                <p className="text-[11px] text-muted-foreground">Show series badge on articles</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={add} size="lg" disabled={saving} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Create series
            </Button>
            {(form.name || form.description) && (
              <Button onClick={() => setForm(emptyForm)} variant="outline" size="lg" className="w-full sm:w-auto">
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="overflow-hidden border">
        <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{items.length} series</h2>
            <p className="text-xs text-muted-foreground mt-1">Assign articles to a series via the article editor</p>
          </div>
          <Badge variant="secondary">{items.filter((s) => s.is_active).length} active</Badge>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Name</th>
                <th className="text-left px-6 py-3 font-semibold">Slug</th>
                <th className="text-left px-6 py-3 font-semibold">Articles</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No series yet. Create your first one above.</td></tr>
              ) : items.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{s.name}</div>
                    {s.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <code className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">{s.slug}</code>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline" className="text-xs">{s.article_count} published</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {s.is_active ? (
                      <Badge className="bg-emerald-100 text-emerald-800 text-xs">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)} title="Edit series">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => del(s.id, s.article_count)}
                        className="text-destructive hover:text-destructive"
                        title="Delete series"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit series</DialogTitle>
            <DialogDescription>Update the name, slug, description, and SEO fields for this series.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <FieldLabel help="Renaming updates the slug too, which may break existing links.">Series name</FieldLabel>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1"
              />
              <div className="text-xs text-muted-foreground mt-2">
                Slug: <code className="bg-muted px-2 py-1 rounded">{editForm.slug || slugify(editForm.name)}</code>
              </div>
            </div>
            <div>
              <FieldLabel help="Custom slug — leave blank to auto-generate from name.">Slug</FieldLabel>
              <Input
                value={editForm.slug}
                onChange={(e) => setEditForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <FieldLabel>Cover image URL</FieldLabel>
              <Input
                value={editForm.image_url}
                onChange={(e) => setEditForm((p) => ({ ...p, image_url: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel help="SEO title for the series landing page.">SEO title (optional)</FieldLabel>
                <Input
                  value={editForm.seo_title}
                  onChange={(e) => setEditForm((p) => ({ ...p, seo_title: e.target.value }))}
                  placeholder="SEO title…"
                  className="mt-1"
                  maxLength={70}
                />
              </div>
              <div>
                <FieldLabel help="SEO meta description for the series landing page.">SEO description (optional)</FieldLabel>
                <Textarea
                  value={editForm.seo_description}
                  onChange={(e) => setEditForm((p) => ({ ...p, seo_description: e.target.value }))}
                  placeholder="SEO description…"
                  rows={2}
                  className="mt-1"
                  maxLength={160}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-xs font-semibold">Active series</Label>
                <p className="text-[11px] text-muted-foreground">Show series badge on articles</p>
              </div>
              <Switch
                checked={editForm.is_active}
                onCheckedChange={(checked) => setEditForm((p) => ({ ...p, is_active: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Series;
