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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Trash2, Plus, FolderTree, Pencil, ChevronRight, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import { hostingerApi } from "@/lib/hostingerApi";
import PageHeader from "@/components/cms/PageHeader";
import FieldLabel from "@/components/cms/FieldLabel";

interface Cat {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  show_in_nav: boolean;
  nav_label: string;
  nav_order: number;
  color: string;
}

type CategoryMeta = {
  color: string;
  show_in_nav: boolean;
  nav_label: string;
  nav_order: number;
};

const DEFAULT_META: CategoryMeta = { color: "", show_in_nav: true, nav_label: "", nav_order: 0 };

const emptyForm = {
  id: "", name: "", slug: "", description: "",
  parent_id: "", sort_order: 0,
  image_url: "", seo_title: "", seo_description: "",
};

const emptyMetaForm: CategoryMeta = { ...DEFAULT_META };

const Categories = () => {
  const [items, setItems] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editMeta, setEditMeta] = useState<CategoryMeta>(emptyMetaForm);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editShowAdvanced, setEditShowAdvanced] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await hostingerApi.categories();
      setItems(
        ((data as any[]) ?? []).map((c) => ({
          id: String(c.id),
          name: c.name,
          slug: c.slug,
          description: c.description ?? null,
          parent_id: c.parent_id ? String(c.parent_id) : null,
          sort_order: c.sort_order ?? 0,
          image_url: c.image_url ?? null,
          seo_title: c.seo_title ?? null,
          seo_description: c.seo_description ?? null,
          show_in_nav: !!Number(c.show_in_nav ?? 1),
          nav_label: c.nav_label ?? "",
          nav_order: Number(c.nav_order ?? 0),
          color: c.color ?? "",
        }))
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load categories");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const metaFor = (cat: Cat): CategoryMeta => ({
    color: cat.color, show_in_nav: cat.show_in_nav, nav_label: cat.nav_label, nav_order: cat.nav_order,
  });

  const topLevel = useMemo(
    () => items.filter((c) => !c.parent_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)),
    [items]
  );
  const childrenOf = (id: string) =>
    items.filter((c) => c.parent_id === id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));

  // Tracks which categories are collapsed in the tree view. Empty = everything expanded.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const parentIds = useMemo(() => new Set(items.filter((c) => c.parent_id).map((c) => c.parent_id as string)), [items]);
  const hasChildren = (id: string) => parentIds.has(id);

  const add = async () => {
    if (!form.name.trim()) { toast.error("Category name is required"); return; }
    setSaving(true);
    try {
      await hostingerApi.saveCategory({
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        parent_id: form.parent_id || null,
        sort_order: form.sort_order,
        image_url: form.image_url || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      });
      setForm(emptyForm);
      toast.success("Category added");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add category");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat: Cat) => {
    setEditForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      parent_id: cat.parent_id ?? "",
      sort_order: cat.sort_order,
      image_url: cat.image_url ?? "",
      seo_title: cat.seo_title ?? "",
      seo_description: cat.seo_description ?? "",
    });
    setEditMeta(metaFor(cat));
    setEditShowAdvanced(false);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { toast.error("Category name is required"); return; }
    if (editForm.parent_id === editForm.id) { toast.error("A category cannot be its own parent"); return; }
    setSaving(true);
    try {
      await hostingerApi.saveCategory({
        id: editForm.id,
        name: editForm.name,
        slug: editForm.slug || slugify(editForm.name),
        description: editForm.description || null,
        parent_id: editForm.parent_id || null,
        sort_order: editForm.sort_order,
        image_url: editForm.image_url || null,
        seo_title: editForm.seo_title || null,
        seo_description: editForm.seo_description || null,
        show_in_nav: editMeta.show_in_nav,
        nav_label: editMeta.nav_label || null,
        nav_order: editMeta.nav_order,
        color: editMeta.color || null,
      });
      toast.success("Category updated");
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update category");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (items.some((c) => c.parent_id === id)) {
      toast.error("Move or delete subcategories first.");
      return;
    }
    if (!confirm("Delete this category? Articles in this category will not be deleted.")) return;
    try {
      await hostingerApi.deleteCategory(id);
      toast.success("Category deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete category");
    }
  };

  const Row = ({ cat, depth }: { cat: Cat; depth: number }) => {
    const meta = metaFor(cat);
    const expandable = hasChildren(cat.id);
    const isCollapsed = collapsed.has(cat.id);
    return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-6 py-4 font-semibold">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            {expandable ? (
              <button
                type="button"
                onClick={() => toggleCollapse(cat.id)}
                className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={isCollapsed ? "Expand subcategories" : "Collapse subcategories"}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : depth > 0 ? (
              <span className="w-[18px] flex-shrink-0" />
            ) : null}
            {meta.color && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 border"
                style={{ backgroundColor: meta.color }}
                title={`Nav color: ${meta.color}`}
              />
            )}
            <div>
              <div>{cat.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                {cat.image_url && (
                  <span className="text-[11px] text-muted-foreground">🖼 Has cover image</span>
                )}
                {!meta.show_in_nav && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Hidden from nav</Badge>
                )}
                {meta.nav_label && (
                  <span className="text-[11px] text-muted-foreground">Nav label: "{meta.nav_label}"</span>
                )}
                {expandable && isCollapsed && (
                  <span className="text-[11px] text-muted-foreground">
                    {childrenOf(cat.id).length} subcategor{childrenOf(cat.id).length === 1 ? "y" : "ies"} hidden
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <code className="bg-muted px-2 py-1 rounded text-xs text-muted-foreground">{cat.slug}</code>
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
          {cat.description || "—"}
        </td>
        <td className="px-6 py-4 text-center">
          <span className="text-xs text-muted-foreground">{cat.sort_order}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => openEdit(cat)} title="Edit category">
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => del(cat.id)} className="text-destructive hover:text-destructive" title="Delete category">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </td>
      </tr>
      {!isCollapsed && childrenOf(cat.id).map((child) => <Row key={child.id} cat={child} depth={depth + 1} />)}
    </>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        icon={FolderTree}
        title="Categories"
        description="Organize your content into sections and subsections for navigation and SEO."
        help="Categories power your site's main navigation menu. Create top-level sections (e.g. Politics) and optional subcategories (e.g. Politics > Elections) to nest related coverage. Each category gets its own SEO-optimized archive page."
      />

      {/* Add form */}
      <Card className="p-6 bg-muted/20 border">
        <h2 className="font-semibold mb-4">Add new category</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel help="Shown in navigation menus and category pages.">Category name</FieldLabel>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="e.g., Politics, Technology, Sports…"
                className="mt-1"
              />
              {form.name && (
                <div className="text-xs text-muted-foreground mt-2">
                  Slug: <code className="bg-muted px-2 py-1 rounded">{form.slug || slugify(form.name)}</code>
                </div>
              )}
            </div>
            <div>
              <FieldLabel help="Nest under an existing top-level category to create a subcategory.">Parent category</FieldLabel>
              <Select value={form.parent_id || "none"} onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {topLevel.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel help="Brief description shown on the category archive page and used for its meta description.">Description (optional)</FieldLabel>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Brief description of this category…"
              className="mt-1"
              rows={2}
            />
          </div>

          {/* Advanced fields (collapsible) */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Advanced: SEO, image &amp; sort order
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-4 pl-1 border-l-2 ml-1.5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel help="Custom URL slug. Auto-generated from name if left blank.">Slug (optional)</FieldLabel>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))}
                    placeholder="auto-generated"
                    className="mt-1 font-mono"
                  />
                </div>
                <div>
                  <FieldLabel help="Lower number = appears first in navigation.">Sort order</FieldLabel>
                  <Input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <FieldLabel help="Cover image URL for the category archive page header.">Cover image URL (optional)</FieldLabel>
                <Input
                  value={form.image_url}
                  onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://…"
                  className="mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel help="SEO title for the category archive page. 50–60 characters.">SEO title (optional)</FieldLabel>
                  <Input
                    value={form.seo_title}
                    onChange={(e) => setForm((p) => ({ ...p, seo_title: e.target.value }))}
                    placeholder="Category SEO title…"
                    className="mt-1"
                    maxLength={70}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{form.seo_title.length}/70</div>
                </div>
                <div>
                  <FieldLabel help="SEO meta description for the archive page. 120–160 characters.">SEO description (optional)</FieldLabel>
                  <Textarea
                    value={form.seo_description}
                    onChange={(e) => setForm((p) => ({ ...p, seo_description: e.target.value }))}
                    placeholder="Category SEO description…"
                    rows={2}
                    className="mt-1"
                    maxLength={160}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{form.seo_description.length}/160</div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2">
            <Button onClick={add} size="lg" disabled={saving} className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add category
            </Button>
            {(form.name || form.description || form.parent_id) && (
              <Button onClick={() => setForm(emptyForm)} variant="outline" size="lg" className="w-full sm:w-auto">
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden border">
        <div className="border-b bg-muted/30 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-semibold">{items.length} categories</h2>
            <p className="text-xs text-muted-foreground mt-1">Top-level sections with nested subcategories</p>
          </div>
          <div className="flex items-center gap-2">
            {parentIds.size > 0 && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCollapsed(new Set())}>
                  Expand all
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCollapsed(new Set(parentIds))}>
                  Collapse all
                </Button>
              </>
            )}
            <Badge variant="secondary">{topLevel.length} top-level</Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-6 py-3 font-semibold">Name</th>
                <th className="text-left px-6 py-3 font-semibold">Slug</th>
                <th className="text-left px-6 py-3 font-semibold">Description</th>
                <th className="text-center px-6 py-3 font-semibold">Order</th>
                <th className="text-right px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No categories yet. Create your first one above.</td></tr>
              ) : topLevel.map((c) => <Row key={c.id} cat={c} depth={0} />)}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Update name, parent, description, SEO and appearance settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <FieldLabel help="Renaming updates the URL slug too.">Category name</FieldLabel>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="mt-1" />
              <div className="text-xs text-muted-foreground mt-2">
                Slug: <code className="bg-muted px-2 py-1 rounded">{editForm.slug || slugify(editForm.name)}</code>
              </div>
            </div>
            <div>
              <FieldLabel help="Custom slug — edit carefully, as changing it will break existing links.">Slug</FieldLabel>
              <Input value={editForm.slug} onChange={(e) => setEditForm((p) => ({ ...p, slug: slugify(e.target.value) }))} className="mt-1 font-mono" />
            </div>
            <div>
              <FieldLabel help="Nest under a top-level category, or leave as None.">Parent category</FieldLabel>
              <Select value={editForm.parent_id || "none"} onValueChange={(v) => setEditForm((p) => ({ ...p, parent_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {topLevel.filter((c) => c.id !== editForm.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel help="Shown on the category archive page.">Description</FieldLabel>
              <Textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="mt-1" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel help="Cover image URL for the category header.">Cover image URL</FieldLabel>
                <Input value={editForm.image_url} onChange={(e) => setEditForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://…" className="mt-1" />
              </div>
              <div>
                <FieldLabel help="Lower number = appears first in navigation.">Sort order</FieldLabel>
                <Input type="number" value={editForm.sort_order} onChange={(e) => setEditForm((p) => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))} className="mt-1" min={0} />
              </div>
            </div>

            {/* Advanced SEO (collapsible) */}
            <Collapsible open={editShowAdvanced} onOpenChange={setEditShowAdvanced}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  {editShowAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  SEO settings
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3 pl-1 border-l-2 ml-1.5">
                <div>
                  <FieldLabel help="SEO title for the category archive page.">SEO title</FieldLabel>
                  <Input
                    value={editForm.seo_title}
                    onChange={(e) => setEditForm((p) => ({ ...p, seo_title: e.target.value }))}
                    placeholder="SEO title…"
                    className="mt-1"
                    maxLength={70}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{editForm.seo_title.length}/70</div>
                </div>
                <div>
                  <FieldLabel help="SEO meta description for the archive page.">SEO description</FieldLabel>
                  <Textarea
                    value={editForm.seo_description}
                    onChange={(e) => setEditForm((p) => ({ ...p, seo_description: e.target.value }))}
                    placeholder="SEO description…"
                    rows={2}
                    className="mt-1"
                    maxLength={160}
                  />
                  <div className="text-xs text-muted-foreground mt-1">{editForm.seo_description.length}/160</div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Navigation & display settings — now columns on categories, saved together with the rest of the form */}
            <div className="space-y-3 pt-3 border-t">
              <div className="text-xs font-medium text-muted-foreground">Navigation &amp; display</div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="show-in-nav">Show in navigation menus</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Off hides this category from the header and footer menus without deleting it.</p>
                </div>
                <Switch
                  id="show-in-nav"
                  checked={editMeta.show_in_nav}
                  onCheckedChange={(checked) => setEditMeta((p) => ({ ...p, show_in_nav: checked }))}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel help="Overrides the category name when shown in nav menus. Leave blank to use the category name.">Nav label override (optional)</FieldLabel>
                  <Input
                    value={editMeta.nav_label}
                    onChange={(e) => setEditMeta((p) => ({ ...p, nav_label: e.target.value }))}
                    placeholder={editForm.name || "Uses category name"}
                    className="mt-1"
                  />
                </div>
                <div>
                  <FieldLabel help="Lower number appears first among nav-visible categories. Independent from archive sort order above.">Nav order</FieldLabel>
                  <Input
                    type="number"
                    value={editMeta.nav_order}
                    onChange={(e) => setEditMeta((p) => ({ ...p, nav_order: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <FieldLabel help="Accent color used for this category's badge/tag in nav menus and category chips.">Accent color (optional)</FieldLabel>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={editMeta.color || "#dc2626"}
                    onChange={(e) => setEditMeta((p) => ({ ...p, color: e.target.value }))}
                    className="h-9 w-12 rounded border cursor-pointer bg-transparent"
                    aria-label="Pick accent color"
                  />
                  <Input
                    value={editMeta.color}
                    onChange={(e) => setEditMeta((p) => ({ ...p, color: e.target.value }))}
                    placeholder="#dc2626"
                    className="font-mono"
                  />
                  {editMeta.color && (
                    <Button variant="ghost" size="sm" onClick={() => setEditMeta((p) => ({ ...p, color: "" }))}>Clear</Button>
                  )}
                </div>
              </div>
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

export default Categories;
