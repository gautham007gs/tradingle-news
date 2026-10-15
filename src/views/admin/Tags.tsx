import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Tag as TagIcon, Pencil, Check, X, Globe2, ChevronDown, Combine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { slugify } from "@/lib/slugify";
import { hostingerApi } from "@/lib/hostingerApi";
import PageHeader from "@/components/cms/PageHeader";
import FieldLabel from "@/components/cms/FieldLabel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const Tags = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [restrictOpenId, setRestrictOpenId] = useState<string | null>(null);
  const [pendingCategoryIds, setPendingCategoryIds] = useState<string[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data }, { data: cats }] = await Promise.all([
        hostingerApi.tags(),
        hostingerApi.categories(),
      ]);
      setItems(data ?? []);
      setCategories((cats ?? []).map((c: any) => ({ id: String(c.id), name: c.name })));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load tags");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = searchQuery.trim()
    ? items.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.slug.includes(searchQuery.toLowerCase()))
    : items;

  const add = async () => {
    if (!name.trim()) { toast.error("Tag name is required"); return; }
    try {
      await hostingerApi.saveTag({ name, slug: slugify(name), description: newDescription || undefined });
      toast.success("Tag added");
      setName("");
      setNewDescription("");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not add tag");
    }
  };

  const startEdit = (t: any) => {
    setEditingId(String(t.id));
    setEditName(t.name);
    setEditDescription(t.description ?? "");
  };

  const cancelEdit = () => { setEditingId(null); setEditName(""); setEditDescription(""); };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) { toast.error("Tag name is required"); return; }
    setSaving(true);
    try {
      await hostingerApi.saveTag({ id, name: editName, slug: slugify(editName), description: editDescription || undefined });
      toast.success("Tag updated");
      cancelEdit();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update tag");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this tag? Articles tagged with this will lose the tag.")) return;
    try {
      await hostingerApi.deleteTag(id);
      toast.success("Tag deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete tag");
    }
  };

  const openRestrict = (t: any) => {
    setRestrictOpenId(String(t.id));
    setPendingCategoryIds((t.category_ids ?? []).map((id: any) => String(id)));
  };

  const toggleCategory = (categoryId: string) => {
    setPendingCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId]
    );
  };

  const saveRestrictions = async (t: any) => {
    setSaving(true);
    try {
      await hostingerApi.saveTag({ id: t.id, name: t.name, slug: t.slug, category_ids: pendingCategoryIds });
      toast.success(pendingCategoryIds.length === 0 ? "Tag is now global" : "Tag relevance updated");
      setRestrictOpenId(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update tag relevance");
    } finally {
      setSaving(false);
    }
  };

  const exitMergeMode = () => { setMergeMode(false); setSelectedForMerge([]); setMergeTargetId(null); };

  const toggleMergeSelection = (id: string) => {
    setSelectedForMerge((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (mergeTargetId && !next.includes(mergeTargetId)) setMergeTargetId(null);
      if (!mergeTargetId && next.length > 0) setMergeTargetId(next[0]);
      return next;
    });
  };

  const runMerge = async () => {
    if (!mergeTargetId || selectedForMerge.length < 2) {
      toast.error("Select at least two tags, and which one should survive");
      return;
    }
    const sourceIds = selectedForMerge.filter((id) => id !== mergeTargetId);
    const targetTag = items.find((t) => String(t.id) === mergeTargetId);
    const sourceNames = items.filter((t) => sourceIds.includes(String(t.id))).map((t) => t.name);
    if (!confirm(`Merge ${sourceNames.join(", ")} into "${targetTag?.name}"? This can't be undone.`)) return;
    setMerging(true);
    try {
      const res = await hostingerApi.mergeTags({ target_id: mergeTargetId, source_ids: sourceIds });
      toast.success(`Merged ${res.merged.join(", ")} into "${res.target_name}"`);
      exitMergeMode();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not merge tags");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        icon={TagIcon}
        title="Tags"
        description="Keywords that help readers find related content across categories."
        help="Tags are cross-cutting labels (e.g. 'inflation', 'elections-2026') that link related stories regardless of category. Unlike categories, an article can have many tags. By default a tag is 'Global' and can be used under any category. Restrict a tag to specific categories to stop it from being misapplied elsewhere."
        actions={
          mergeMode ? (
            <Button variant="outline" size="sm" onClick={exitMergeMode}>
              <X className="w-4 h-4 mr-2" /> Cancel merge
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setMergeMode(true)}>
              <Combine className="w-4 h-4 mr-2" /> Merge tags
            </Button>
          )
        }
      />

      {mergeMode && (
        <Card className="p-4 bg-primary/5 border-primary/30 flex flex-wrap items-center gap-3 sticky top-2 z-10">
          <span className="text-sm text-muted-foreground">
            {selectedForMerge.length === 0
              ? "Check 2 or more near-duplicate tags below to merge them."
              : `${selectedForMerge.length} tag${selectedForMerge.length === 1 ? "" : "s"} selected.`}
          </span>
          {selectedForMerge.length >= 2 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Keep:</span>
              {selectedForMerge.map((id) => {
                const t = items.find((it) => String(it.id) === id);
                if (!t) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMergeTargetId(id)}
                    className={`text-xs rounded-full border px-3 py-1 transition-colors ${
                      mergeTargetId === id ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
              <Button size="sm" onClick={runMerge} disabled={merging}>
                <Combine className="w-3.5 h-3.5 mr-1.5" /> Merge into selected
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Add form */}
      <Card className="p-6 bg-muted/20 border">
        <h2 className="font-semibold mb-4">Add new tag</h2>
        <div className="space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="tagname" help="Short, specific keywords work best. Use lowercase, hyphenated slugs for consistency.">Tag name</FieldLabel>
              <Input
                id="tagname"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && add()}
                placeholder="e.g., breaking-news, analysis, opinion…"
                className="mt-1"
              />
              {name && <div className="text-xs text-muted-foreground mt-2">Slug: <code className="bg-muted px-2 py-1 rounded">{slugify(name)}</code></div>}
            </div>
            <div>
              <FieldLabel help="Optional editorial note about what this tag covers. Not shown to readers.">Description (optional)</FieldLabel>
              <Textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="e.g., Use for articles about Indian parliamentary elections…"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={add} size="lg" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Add tag
            </Button>
            {(name || newDescription) && (
              <Button onClick={() => { setName(""); setNewDescription(""); }} variant="outline" size="lg" className="w-full sm:w-auto">
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tag list */}
      <Card className="overflow-hidden border">
        <div className="border-b bg-muted/30 px-6 py-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold">
              {searchQuery ? `${filtered.length} of ${items.length} tags` : `${items.length} tags`}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Click a tag to rename it. Use "Relevance" to restrict which categories it can appear under.</p>
          </div>
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tags…"
            className="w-48 h-8 text-sm"
          />
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {searchQuery ? `No tags matching "${searchQuery}"` : "No tags yet. Create one above."}
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => (
                <div key={t.id} className={`border rounded-lg ${mergeMode && selectedForMerge.includes(String(t.id)) ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between px-3 py-2.5 gap-2">
                    {mergeMode && (
                      <input
                        type="checkbox"
                        checked={selectedForMerge.includes(String(t.id))}
                        onChange={() => toggleMergeSelection(String(t.id))}
                        className="w-4 h-4 accent-primary shrink-0"
                      />
                    )}
                    {editingId === String(t.id) ? (
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-1">
                          <Input
                            autoFocus
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(String(t.id));
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            className="h-7 w-48 text-sm"
                          />
                          <button onClick={() => saveEdit(String(t.id))} disabled={saving} className="rounded-full p-1 hover:bg-primary/10 text-primary" title="Save">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={cancelEdit} className="rounded-full p-1 hover:bg-muted" title="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <Textarea
                          value={editDescription}
                          onChange={e => setEditDescription(e.target.value)}
                          placeholder="Description (optional)…"
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 flex-wrap flex-1 min-w-0">
                        <div className="min-w-0">
                          <span className="font-medium text-sm">{t.name}</span>
                          {t.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(t.category_ids ?? []).length === 0 ? (
                            <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
                              <Globe2 className="w-3 h-3" /> Global
                            </Badge>
                          ) : (
                            (t.category_names ?? []).map((cn: string) => (
                              <Badge key={cn} variant="secondary" className="text-[10px]">{cn}</Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0">
                      {!mergeMode && editingId !== String(t.id) && (
                        <>
                          <button
                            onClick={() => (restrictOpenId === String(t.id) ? setRestrictOpenId(null) : openRestrict(t))}
                            className="text-xs flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted border"
                            title="Set category relevance"
                          >
                            Relevance <ChevronDown className={`w-3 h-3 transition-transform ${restrictOpenId === String(t.id) ? "rotate-180" : ""}`} />
                          </button>
                          <button onClick={() => startEdit(t)} className="hover:bg-primary/10 rounded-full p-1.5" title="Rename tag">
                            <Pencil className="w-3.5 h-3.5 text-primary" />
                          </button>
                          <button onClick={() => del(t.id)} className="hover:bg-destructive/20 rounded-full p-1.5" title="Delete tag">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <Collapsible open={restrictOpenId === String(t.id)}>
                    <CollapsibleContent>
                      <div className="border-t bg-muted/20 px-3 py-3 space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Leave everything unchecked to keep this tag <strong>Global</strong> (usable under any category). Check one or more categories to restrict it.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleCategory(c.id)}
                              className={`text-xs rounded-full border px-3 py-1 transition-colors ${
                                pendingCategoryIds.includes(c.id)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background hover:bg-muted"
                              }`}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveRestrictions(t)} disabled={saving}>Save relevance</Button>
                          <Button size="sm" variant="outline" onClick={() => setRestrictOpenId(null)}>Cancel</Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Tags;
