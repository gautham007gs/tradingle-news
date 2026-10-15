import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { hostingerApi } from "@/lib/hostingerApi";
import { slugify } from "@/lib/slugify";
import { toast } from "sonner";
import { ExternalLink, Plus, Save, UserRound } from "lucide-react";

const empty = {
  id: "",
  display_name: "",
  email: "",
  slug: "",
  avatar_url: "",
  role_title: "",
  bio: "",
  social_x: "",
  social_linkedin: "",
  social_website: "",
};

const Authors = () => {
  const [authors, setAuthors] = useState<any[]>([]);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await hostingerApi.adminAuthors();
      setAuthors(data ?? []);
    } catch (error: any) {
      toast.error(error?.message || "Could not refresh authors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedAuthor = useMemo(
    () => authors.find((author) => String(author.id) === String(form.id)),
    [authors, form.id]
  );

  const update = (key: keyof typeof empty, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      // Auto-generate slug from display_name only for new authors AND only
      // if the user hasn't manually changed the slug yet (slug still matches
      // the auto-generated value from the current display_name).
      ...(key === "display_name" && !prev.id && (!prev.slug || prev.slug === slugify(prev.display_name))
        ? { slug: slugify(value) }
        : {}),
    }));
  };

  const edit = (author: any) => {
    setForm({
      id: String(author.id ?? ""),
      display_name: author.display_name ?? "",
      email: author.email ?? "",
      slug: author.slug ?? "",
      avatar_url: author.avatar_url ?? "",
      role_title: author.role_title ?? "",
      bio: author.bio ?? "",
      social_x: author.social_x ?? "",
      social_linkedin: author.social_linkedin ?? "",
      social_website: author.social_website ?? "",
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.display_name.trim()) return toast.error("Author name is required.");
    setBusy(true);
    try {
      const payload = { ...form, id: form.id || undefined };
      const res = await hostingerApi.saveAuthor(payload);
      toast.success(`Author "${form.display_name}" saved successfully`);
      setForm((prev) => ({ ...prev, id: String(res.id), slug: res.slug }));
      load();
    } catch (error: any) {
      toast.error(error?.message || "Could not save author.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserRound className="w-7 h-7 text-primary" /> Authors & Bylines
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage author profiles with photos, bios, beats, and social links</p>
        </div>
        <Button onClick={() => setForm(empty)} className="h-10">
          <Plus className="mr-2 h-4 w-4" /> New author
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading authors...</Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <Card className="h-fit overflow-hidden">
            {authors.length === 0 ? (
              <div className="p-12 text-center">
                <UserRound className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground font-medium">No authors yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first newsroom byline to get started</p>
                <Button 
                  onClick={() => setForm(empty)}
                  className="mt-4"
                >
                  <Plus className="mr-2 h-4 w-4" /> Create author
                </Button>
              </div>
            ) : (
              <>
                <div className="p-4 border-b bg-muted/30">
                  <p className="text-sm font-medium">{authors.length} {authors.length === 1 ? "author" : "authors"}</p>
                </div>
                <div className="divide-y">
                  {authors.map((author) => (
                    <button
                      key={author.id}
                      type="button"
                      onClick={() => edit(author)}
                      className={`flex items-start gap-3 p-4 text-left transition-all hover:bg-muted/70 ${
                        String(form.id) === String(author.id) ? "bg-primary/5 border-l-2 border-primary" : ""
                      }`}
                    >
                      <div className="relative">
                        {author.avatar_url ? (
                          <img src={author.avatar_url} alt={author.display_name} className="h-14 w-14 rounded-full object-cover ring-2 ring-muted" />
                        ) : (
                          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary ring-2 ring-muted">
                            <UserRound className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">{author.display_name}</p>
                        {author.role_title && <p className="text-xs text-muted-foreground">{author.role_title}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground flex items-center">
                          📝 {author.article_count || 0} {author.article_count === 1 ? "article" : "articles"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Card>

          <Card className="h-fit p-6">
            <form onSubmit={save} className="space-y-5">
              <div className="flex items-center gap-4">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-muted text-muted-foreground ring-2 ring-primary/30">
                    <UserRound className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold">{form.id ? "Edit author" : "New author"}</h2>
                  {form.slug && (
                    <a href={`/author/${form.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      View profile <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <div>
                  <Label htmlFor="authors-display-name-1" className="text-xs font-semibold">Display name *</Label>
                  <Input id="authors-display-name-1" 
                    value={form.display_name} 
                    onChange={(e) => update("display_name", e.target.value)} 
                    placeholder="Jane Smith"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="authors-url-slug-2" className="text-xs font-semibold">URL slug</Label>
                  <Input id="authors-url-slug-2" 
                    value={form.slug} 
                    onChange={(e) => update("slug", slugify(e.target.value))} 
                    placeholder="jane-smith"
                    className="mt-1 font-mono text-xs"
                  />
                  {form.slug && <p className="text-[10px] text-muted-foreground mt-1">→ /author/{form.slug}</p>}
                </div>

                <div>
                  <Label htmlFor="authors-role-beat-3" className="text-xs font-semibold">Role / beat</Label>
                  <Input id="authors-role-beat-3" 
                    value={form.role_title} 
                    onChange={(e) => update("role_title", e.target.value)} 
                    placeholder="e.g., Markets Editor, Tech Reporter"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="authors-avatar-url-4" className="text-xs font-semibold">Avatar URL</Label>
                  <Input id="authors-avatar-url-4" 
                    value={form.avatar_url} 
                    onChange={(e) => update("avatar_url", e.target.value)} 
                    placeholder="https://..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="authors-short-bio-5" className="text-xs font-semibold">Short bio</Label>
                  <Textarea id="authors-short-bio-5" 
                    rows={3} 
                    value={form.bio} 
                    onChange={(e) => update("bio", e.target.value)} 
                    placeholder="Credibility-focused bio (150 chars recommended)"
                    className="mt-1 text-sm"
                  />
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs font-semibold mb-3 text-muted-foreground">Social links (optional)</p>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="authors-x-twitter-6" className="text-xs">X / Twitter</Label>
                      <Input id="authors-x-twitter-6" 
                        value={form.social_x} 
                        onChange={(e) => update("social_x", e.target.value)} 
                        placeholder="https://x.com/..."
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="authors-linkedin-7" className="text-xs">LinkedIn</Label>
                      <Input id="authors-linkedin-7" 
                        value={form.social_linkedin} 
                        onChange={(e) => update("social_linkedin", e.target.value)} 
                        placeholder="https://linkedin.com/in/..."
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="authors-personal-website-8" className="text-xs">Personal website</Label>
                      <Input id="authors-personal-website-8" 
                        value={form.social_website} 
                        onChange={(e) => update("social_website", e.target.value)} 
                        placeholder="https://..."
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="authors-email-address-9" className="text-xs font-semibold">Email address</Label>
                  <Input id="authors-email-address-9" 
                    type="email" 
                    value={form.email} 
                    onChange={(e) => update("email", e.target.value)} 
                    placeholder="Optional"
                    className="mt-1 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    If empty, an internal Tradingle email is generated
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                <Button type="submit" className="w-full" disabled={busy}>
                  <Save className="mr-2 h-4 w-4" />
                  {busy ? "Saving..." : "Save author"}
                </Button>
                {!!form.id && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    disabled={busy}
                    onClick={async () => {
                      if (!form.id) return;
                      if (!window.confirm(`Delete author ${form.display_name}? This cannot be undone.`)) return;
                      setBusy(true);
                      try {
                        await hostingerApi.deleteAuthor(form.id);
                        toast.success(`Author "${form.display_name}" deleted.`);
                        setForm(empty);
                        load();
                      } catch (error: any) {
                        toast.error(error?.message || "Could not delete author.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Delete author
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Authors;
