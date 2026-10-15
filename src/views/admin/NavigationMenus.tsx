"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowDown,
  Globe,
  Navigation,
  AlertTriangle,
  Save,
  Link2,
  Layers,
  Radio,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/cms/PageHeader";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type NavChild = { id: string; label: string; href: string };
type NavItem = {
  id: string;
  label: string;
  href: string;
  type: "link" | "section" | "live";
  showInDesktopInline: boolean;
  children: NavChild[];
};
type FooterColumn = {
  id: string;
  title: string;
  links: { id: string; label: string; href: string }[];
};
type FooterLegalLink = { id: string; label: string; href: string };
type SocialLink = { id: string; name: string; url: string };
type NavigationData = {
  primaryNav: NavItem[];
  footerColumns: FooterColumn[];
  footerLegalLinks: FooterLegalLink[];
  socialLinks: SocialLink[];
};

const uid = () => Math.random().toString(36).slice(2, 9);

const SOCIAL_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Twitter, Facebook, Instagram, LinkedIn: Linkedin, YouTube: Youtube,
};

const TYPE_LABELS: Record<NavItem["type"], string> = {
  section: "Section",
  link: "Link",
  live: "Live",
};

const emptyItemForm = { label: "", href: "", type: "link" as NavItem["type"], showInDesktopInline: false };
const emptyLinkForm = { label: "", href: "" };

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NavigationMenus = () => {
  const [data, setData] = useState<NavigationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Dialog state
  const [itemDialog, setItemDialog] = useState<{
    open: boolean;
    editingIndex: number | null;
    parentIndex: number | null;
  }>({ open: false, editingIndex: null, parentIndex: null });
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const [linkDialog, setLinkDialog] = useState<{
    open: boolean;
    colIndex: number | null;
    linkIndex: number | null;
    section: "footer" | "legal";
  }>({ open: false, colIndex: null, linkIndex: null, section: "footer" });
  const [linkForm, setLinkForm] = useState(emptyLinkForm);

  const [colDialog, setColDialog] = useState<{ open: boolean; editingIndex: number | null; title: string }>({
    open: false, editingIndex: null, title: "",
  });

  const [socialDialog, setSocialDialog] = useState<{
    open: boolean;
    editingIndex: number | null;
    name: string;
    url: string;
  }>({ open: false, editingIndex: null, name: "", url: "" });

  // â”€â”€ Load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    fetch("/api/navigation")
      .then((r) => r.json())
      .then((d: NavigationData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load navigation data");
        setLoading(false);
      });
  }, []);

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const save = useCallback(async () => {
    if (!data) return;
    setSaving(true);
    try {
      // The session credential is the HttpOnly `tradingle_session` cookie,
      // sent automatically on same-origin fetches â€” no Authorization header
      // (the old `tradingle_cms_session` localStorage token no longer exists).
      const res = await fetch("/api/navigation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: "Save failed" }));
        throw new Error(message);
      }
      toast.success("Navigation saved â€” changes are now live");
      setDirty(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not save navigation");
    } finally {
      setSaving(false);
    }
  }, [data]);

  const mutate = useCallback((fn: (d: NavigationData) => NavigationData) => {
    setData((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  }, []);

  // â”€â”€ Primary nav mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const movePrimary = (i: number, dir: -1 | 1) =>
    mutate((d) => {
      const arr = [...d.primaryNav];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
      return { ...d, primaryNav: arr };
    });

  const deletePrimary = (i: number) =>
    mutate((d) => ({ ...d, primaryNav: d.primaryNav.filter((_, idx) => idx !== i) }));

  const toggleDesktop = (i: number, val: boolean) =>
    mutate((d) => {
      const arr = [...d.primaryNav];
      arr[i] = { ...arr[i], showInDesktopInline: val };
      return { ...d, primaryNav: arr };
    });

  const moveChild = (pi: number, i: number, dir: -1 | 1) =>
    mutate((d) => {
      const nav = [...d.primaryNav];
      const children = [...(nav[pi].children ?? [])];
      [children[i], children[i + dir]] = [children[i + dir], children[i]];
      nav[pi] = { ...nav[pi], children };
      return { ...d, primaryNav: nav };
    });

  const deleteChild = (pi: number, i: number) =>
    mutate((d) => {
      const nav = [...d.primaryNav];
      nav[pi] = { ...nav[pi], children: (nav[pi].children ?? []).filter((_, idx) => idx !== i) };
      return { ...d, primaryNav: nav };
    });

  // â”€â”€ Item dialog handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openAddTopLevel = () => {
    setItemForm(emptyItemForm);
    setItemDialog({ open: true, editingIndex: null, parentIndex: null });
  };

  const openAddChild = (parentIndex: number) => {
    setItemForm(emptyItemForm);
    setItemDialog({ open: true, editingIndex: null, parentIndex });
  };

  const openEditItem = (item: NavItem | NavChild, itemIndex: number, parentIndex: number | null) => {
    setItemForm({
      label: item.label,
      href: item.href,
      type: "type" in item ? item.type : "link",
      showInDesktopInline: "showInDesktopInline" in item ? item.showInDesktopInline : false,
    });
    setItemDialog({ open: true, editingIndex: itemIndex, parentIndex });
  };

  const saveItemDialog = () => {
    if (!itemForm.label.trim() || !itemForm.href.trim()) {
      toast.error("Label and URL are required");
      return;
    }
    const { editingIndex, parentIndex } = itemDialog;

    mutate((d) => {
      const nav = [...d.primaryNav];
      if (parentIndex === null) {
        // Top-level
        if (editingIndex === null) {
          nav.push({ id: uid(), label: itemForm.label, href: itemForm.href, type: itemForm.type, showInDesktopInline: itemForm.showInDesktopInline, children: [] });
        } else {
          nav[editingIndex] = { ...nav[editingIndex], label: itemForm.label, href: itemForm.href, type: itemForm.type, showInDesktopInline: itemForm.showInDesktopInline };
        }
      } else {
        // Child
        const children = [...(nav[parentIndex].children ?? [])];
        if (editingIndex === null) {
          children.push({ id: uid(), label: itemForm.label, href: itemForm.href });
        } else {
          children[editingIndex] = { ...children[editingIndex], label: itemForm.label, href: itemForm.href };
        }
        nav[parentIndex] = { ...nav[parentIndex], children };
      }
      return { ...d, primaryNav: nav };
    });
    setItemDialog({ open: false, editingIndex: null, parentIndex: null });
    setItemForm(emptyItemForm);
  };

  // â”€â”€ Footer column mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const moveCol = (i: number, dir: -1 | 1) =>
    mutate((d) => {
      const cols = [...d.footerColumns];
      [cols[i], cols[i + dir]] = [cols[i + dir], cols[i]];
      return { ...d, footerColumns: cols };
    });

  const deleteCol = (i: number) =>
    mutate((d) => ({ ...d, footerColumns: d.footerColumns.filter((_, idx) => idx !== i) }));

  const saveColDialog = () => {
    if (!colDialog.title.trim()) { toast.error("Column title is required"); return; }
    mutate((d) => {
      const cols = [...d.footerColumns];
      if (colDialog.editingIndex === null) {
        cols.push({ id: uid(), title: colDialog.title, links: [] });
      } else {
        cols[colDialog.editingIndex] = { ...cols[colDialog.editingIndex], title: colDialog.title };
      }
      return { ...d, footerColumns: cols };
    });
    setColDialog({ open: false, editingIndex: null, title: "" });
  };

  const moveFooterLink = (ci: number, li: number, dir: -1 | 1) =>
    mutate((d) => {
      const cols = [...d.footerColumns];
      const links = [...cols[ci].links];
      [links[li], links[li + dir]] = [links[li + dir], links[li]];
      cols[ci] = { ...cols[ci], links };
      return { ...d, footerColumns: cols };
    });

  const deleteFooterLink = (ci: number, li: number) =>
    mutate((d) => {
      const cols = [...d.footerColumns];
      cols[ci] = { ...cols[ci], links: cols[ci].links.filter((_, idx) => idx !== li) };
      return { ...d, footerColumns: cols };
    });

  const moveLegal = (i: number, dir: -1 | 1) =>
    mutate((d) => {
      const arr = [...d.footerLegalLinks];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
      return { ...d, footerLegalLinks: arr };
    });

  const deleteLegal = (i: number) =>
    mutate((d) => ({ ...d, footerLegalLinks: d.footerLegalLinks.filter((_, idx) => idx !== i) }));

  // â”€â”€ Link dialog handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openAddFooterLink = (colIndex: number) => {
    setLinkForm(emptyLinkForm);
    setLinkDialog({ open: true, colIndex, linkIndex: null, section: "footer" });
  };

  const openEditFooterLink = (colIndex: number, linkIndex: number, link: { label: string; href: string }) => {
    setLinkForm({ label: link.label, href: link.href });
    setLinkDialog({ open: true, colIndex, linkIndex, section: "footer" });
  };

  const openAddLegal = () => {
    setLinkForm(emptyLinkForm);
    setLinkDialog({ open: true, colIndex: null, linkIndex: null, section: "legal" });
  };

  const openEditLegal = (linkIndex: number, link: { label: string; href: string }) => {
    setLinkForm({ label: link.label, href: link.href });
    setLinkDialog({ open: true, colIndex: null, linkIndex, section: "legal" });
  };

  const saveLinkDialog = () => {
    if (!linkForm.label.trim() || !linkForm.href.trim()) {
      toast.error("Label and URL are required");
      return;
    }
    const { colIndex, linkIndex, section } = linkDialog;
    mutate((d) => {
      if (section === "footer" && colIndex !== null) {
        const cols = [...d.footerColumns];
        const links = [...cols[colIndex].links];
        if (linkIndex === null) {
          links.push({ id: uid(), label: linkForm.label, href: linkForm.href });
        } else {
          links[linkIndex] = { ...links[linkIndex], label: linkForm.label, href: linkForm.href };
        }
        cols[colIndex] = { ...cols[colIndex], links };
        return { ...d, footerColumns: cols };
      } else {
        const arr = [...d.footerLegalLinks];
        if (linkIndex === null) {
          arr.push({ id: uid(), label: linkForm.label, href: linkForm.href });
        } else {
          arr[linkIndex] = { ...arr[linkIndex], label: linkForm.label, href: linkForm.href };
        }
        return { ...d, footerLegalLinks: arr };
      }
    });
    setLinkDialog({ open: false, colIndex: null, linkIndex: null, section: "footer" });
    setLinkForm(emptyLinkForm);
  };

  // â”€â”€ Social link mutations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const openAddSocial = () =>
    setSocialDialog({ open: true, editingIndex: null, name: "", url: "" });

  const openEditSocial = (i: number, s: SocialLink) =>
    setSocialDialog({ open: true, editingIndex: i, name: s.name, url: s.url });

  const saveSocialDialog = () => {
    if (!socialDialog.name.trim() || !socialDialog.url.trim()) {
      toast.error("Platform name and URL are required");
      return;
    }
    mutate((d) => {
      const arr = [...d.socialLinks];
      if (socialDialog.editingIndex === null) {
        arr.push({ id: uid(), name: socialDialog.name, url: socialDialog.url });
      } else {
        arr[socialDialog.editingIndex] = { ...arr[socialDialog.editingIndex], name: socialDialog.name, url: socialDialog.url };
      }
      return { ...d, socialLinks: arr };
    });
    setSocialDialog({ open: false, editingIndex: null, name: "", url: "" });
  };

  const deleteSocial = (i: number) =>
    mutate((d) => ({ ...d, socialLinks: d.socialLinks.filter((_, idx) => idx !== i) }));

  const moveSocial = (i: number, dir: -1 | 1) =>
    mutate((d) => {
      const arr = [...d.socialLinks];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
      return { ...d, socialLinks: arr };
    });

  // â”€â”€ Render helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const ReorderButtons = ({
    index,
    total,
    onMove,
  }: {
    index: number;
    total: number;
    onMove: (dir: -1 | 1) => void;
  }) => (
    <div className="flex flex-col gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        disabled={index === 0}
        onClick={() => onMove(-1)}
        title="Move up"
      >
        <ArrowUp className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        disabled={index === total - 1}
        onClick={() => onMove(1)}
        title="Move down"
      >
        <ArrowDown className="h-3 w-3" />
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-muted-foreground">Failed to load navigation data. Refresh to try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <PageHeader
          title="Navigation & Menus"
          description="Manage the header navigation, footer links, and social profiles. Changes are live immediately after saving."
          icon={Navigation}
        />
        <div className="flex items-center gap-3 shrink-0">
          {dirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Unsaved changes
            </span>
          )}
          <Button onClick={save} disabled={saving || !dirty} size="sm" className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? "Savingâ€¦" : "Save changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="primary">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="primary">Primary Navigation</TabsTrigger>
          <TabsTrigger value="footer">Footer Links</TabsTrigger>
          <TabsTrigger value="social">Social & Legal</TabsTrigger>
        </TabsList>

        {/* â”€â”€ Primary Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="primary" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Manage the site header navigation. Top-level <strong>Sections</strong> appear in the mega-menu with their child links.
            Toggle <strong>"In desktop bar"</strong> to show an item in the compact desktop header strip.
          </p>

          <Card>
            <CardContent className="p-0">
              {data.primaryNav.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-10">
                  No navigation items yet. Add one below.
                </p>
              )}

              {data.primaryNav.map((item, i) => {
                const isExpanded = expandedItems.has(item.id);
                return (
                  <div key={item.id} className="border-b last:border-0">
                    {/* Top-level item row */}
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <ReorderButtons index={i} total={data.primaryNav.length} onMove={(dir) => movePrimary(i, dir)} />

                      {/* Type badge */}
                      <Badge
                        variant={item.type === "section" ? "default" : item.type === "live" ? "destructive" : "outline"}
                        className="shrink-0 text-xs"
                      >
                        {item.type === "section" && <Layers className="h-2.5 w-2.5 mr-1" />}
                        {item.type === "link" && <Link2 className="h-2.5 w-2.5 mr-1" />}
                        {item.type === "live" && <Radio className="h-2.5 w-2.5 mr-1" />}
                        {TYPE_LABELS[item.type]}
                      </Badge>

                      {/* Label + href */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.label}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.href}</div>
                      </div>

                      {/* Desktop bar toggle */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Switch
                          id={`desktop-${item.id}`}
                          checked={item.showInDesktopInline}
                          onCheckedChange={(v) => toggleDesktop(i, v)}
                          className="scale-75 origin-right"
                        />
                        <Label htmlFor={`desktop-${item.id}`} className="text-xs text-muted-foreground cursor-pointer">
                          In desktop bar
                        </Label>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {item.type === "section" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setExpandedItems((prev) => {
                                const next = new Set(prev);
                                if (next.has(item.id)) {
                                  next.delete(item.id);
                                } else {
                                  next.add(item.id);
                                }
                                return next;
                              });
                            }}
                            title={isExpanded ? "Collapse children" : "Expand children"}
                          >
                            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit menu item" onClick={() => openEditItem(item, i, null)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label="Delete menu item"
                          onClick={() => deletePrimary(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Children (expanded) */}
                    {item.type === "section" && isExpanded && (
                      <div className="bg-muted/20 pl-12 pr-4 pb-3 space-y-1">
                        <p className="text-xs text-muted-foreground pt-2 pb-1 font-medium uppercase tracking-wide">
                          Sub-links ({item.children?.length ?? 0})
                        </p>
                        {(item.children ?? []).map((child, ci) => (
                          <div
                            key={child.id}
                            className="flex items-center gap-3 bg-background rounded border px-3 py-2"
                          >
                            <ReorderButtons
                              index={ci}
                              total={item.children?.length ?? 0}
                              onMove={(dir) => moveChild(i, ci, dir)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{child.label}</div>
                              <div className="text-xs text-muted-foreground truncate">{child.href}</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Edit sub-item" onClick={() => openEditItem(child, ci, i)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              aria-label="Delete sub-item"
                              onClick={() => deleteChild(i, ci)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-7 text-xs gap-1"
                          onClick={() => {
                            openAddChild(i);
                            setExpandedItems((prev) => new Set([...prev, item.id]));
                          }}
                        >
                          <Plus className="h-3 w-3" />
                          Add sub-link
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddTopLevel}>
            <Plus className="h-3.5 w-3.5" />
            Add top-level item
          </Button>
        </TabsContent>

        {/* â”€â”€ Footer Links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="footer" className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Manage footer navigation columns. Each column appears in the site footer with its own heading and link list.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.footerColumns.map((col, ci) => (
              <Card key={col.id}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ReorderButtons index={ci} total={data.footerColumns.length} onMove={(dir) => moveCol(ci, dir)} />
                      <CardTitle className="text-sm font-semibold">{col.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        aria-label="Edit column title"
                        onClick={() => setColDialog({ open: true, editingIndex: ci, title: col.title })}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        aria-label="Delete column" onClick={() => deleteCol(ci)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1">
                  {col.links.map((link, li) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-muted/40 transition-colors text-sm"
                    >
                      <ReorderButtons index={li} total={col.links.length} onMove={(dir) => moveFooterLink(ci, li, dir)} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{link.label}</span>
                        <span className="text-muted-foreground text-xs ml-2 truncate">{link.href}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-5 w-5" aria-label="Edit footer link" onClick={() => openEditFooterLink(ci, li, link)}>
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-destructive hover:text-destructive"
                        aria-label="Delete footer link" onClick={() => deleteFooterLink(ci, li)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 text-xs gap-1 w-full"
                    onClick={() => openAddFooterLink(ci)}
                  >
                    <Plus className="h-3 w-3" />
                    Add link
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setColDialog({ open: true, editingIndex: null, title: "" })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add footer column
          </Button>
        </TabsContent>

        {/* â”€â”€ Social & Legal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <TabsContent value="social" className="space-y-6 mt-4">
          {/* Social Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Social Media Links</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Shown in the site footer. Recognised platform names: Twitter, Facebook, Instagram, LinkedIn, YouTube.</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddSocial}>
                <Plus className="h-3.5 w-3.5" />
                Add social link
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {data.socialLinks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No social links configured.</p>
                )}
                {data.socialLinks.map((s, i) => {
                  const Icon = SOCIAL_ICONS[s.name];
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <ReorderButtons index={i} total={data.socialLinks.length} onMove={(dir) => moveSocial(i, dir)} />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {Icon ? (
                          <Icon size={15} className="text-muted-foreground shrink-0" />
                        ) : (
                          <Globe size={15} className="text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-sm">{s.name}</span>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-foreground truncate flex items-center gap-1"
                        >
                          {s.url}
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </a>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit social link" onClick={() => openEditSocial(i, s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          aria-label="Delete social link"
                          onClick={() => deleteSocial(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Legal Links */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Legal Links</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Shown in the footer legal bar (Privacy Policy, Terms of Use, etc.)</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddLegal}>
                <Plus className="h-3.5 w-3.5" />
                Add legal link
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {data.footerLegalLinks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No legal links configured.</p>
                )}
                {data.footerLegalLinks.map((link, i) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <ReorderButtons index={i} total={data.footerLegalLinks.length} onMove={(dir) => moveLegal(i, dir)} />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{link.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{link.href}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit legal page link" onClick={() => openEditLegal(i, link)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        aria-label="Delete legal page link" onClick={() => deleteLegal(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* â”€â”€ Dialogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

      {/* Add / Edit nav item */}
      <Dialog open={itemDialog.open} onOpenChange={(open) => !open && setItemDialog((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {itemDialog.editingIndex === null ? "Add navigation item" : "Edit navigation item"}
            </DialogTitle>
            <DialogDescription>
              {itemDialog.parentIndex !== null ? "Child link under a section item." : "Top-level navigation item."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="navigationmenus-label-1" className="text-xs font-semibold">Label *</Label>
              <Input id="navigationmenus-label-1"
                className="mt-1"
                placeholder="e.g. India"
                value={itemForm.label}
                onChange={(e) => setItemForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="navigationmenus-url-path-2" className="text-xs font-semibold">URL / Path *</Label>
              <Input id="navigationmenus-url-path-2"
                className="mt-1"
                placeholder="e.g. /india or https://example.com"
                value={itemForm.href}
                onChange={(e) => setItemForm((p) => ({ ...p, href: e.target.value }))}
              />
            </div>
            {itemDialog.parentIndex === null && (
              <>
                <div>
                  <Label className="text-xs font-semibold">Type</Label>
                  <Select
                    value={itemForm.type}
                    onValueChange={(v) => setItemForm((p) => ({ ...p, type: v as NavItem["type"] }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link â€” plain nav link</SelectItem>
                      <SelectItem value="section">Section â€” has sub-links / mega-menu</SelectItem>
                      <SelectItem value="live">Live â€” shows a "Live" badge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="show-desktop"
                    checked={itemForm.showInDesktopInline}
                    onCheckedChange={(v) => setItemForm((p) => ({ ...p, showInDesktopInline: v }))}
                  />
                  <div>
                    <Label htmlFor="show-desktop" className="text-sm cursor-pointer">Show in desktop header bar</Label>
                    <p className="text-xs text-muted-foreground">Appears in the compact strip above the page content.</p>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button onClick={saveItemDialog}>
              {itemDialog.editingIndex === null ? "Add" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit footer / legal link */}
      <Dialog open={linkDialog.open} onOpenChange={(open) => !open && setLinkDialog((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {linkDialog.linkIndex === null ? "Add link" : "Edit link"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="navigationmenus-label-3" className="text-xs font-semibold">Label *</Label>
              <Input id="navigationmenus-label-3"
                className="mt-1"
                placeholder="e.g. Privacy Policy"
                value={linkForm.label}
                onChange={(e) => setLinkForm((p) => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="navigationmenus-url-path-4" className="text-xs font-semibold">URL / Path *</Label>
              <Input id="navigationmenus-url-path-4"
                className="mt-1"
                placeholder="e.g. /privacy"
                value={linkForm.href}
                onChange={(e) => setLinkForm((p) => ({ ...p, href: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button onClick={saveLinkDialog}>{linkDialog.linkIndex === null ? "Add" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit footer column */}
      <Dialog open={colDialog.open} onOpenChange={(open) => !open && setColDialog((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{colDialog.editingIndex === null ? "Add footer column" : "Rename column"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="navigationmenus-column-title-5" className="text-xs font-semibold">Column title *</Label>
            <Input id="navigationmenus-column-title-5"
              className="mt-1"
              placeholder="e.g. Company"
              value={colDialog.title}
              onChange={(e) => setColDialog((p) => ({ ...p, title: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button onClick={saveColDialog}>{colDialog.editingIndex === null ? "Add" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit social link */}
      <Dialog open={socialDialog.open} onOpenChange={(open) => !open && setSocialDialog((p) => ({ ...p, open: false }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{socialDialog.editingIndex === null ? "Add social link" : "Edit social link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="navigationmenus-platform-name-6" className="text-xs font-semibold">Platform name *</Label>
              <Input id="navigationmenus-platform-name-6"
                className="mt-1"
                placeholder="e.g. Twitter, Facebook, LinkedInâ€¦"
                value={socialDialog.name}
                onChange={(e) => setSocialDialog((p) => ({ ...p, name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use exact names for icons: Twitter, Facebook, Instagram, LinkedIn, YouTube
              </p>
            </div>
            <div>
              <Label htmlFor="navigationmenus-profile-url-7" className="text-xs font-semibold">Profile URL *</Label>
              <Input id="navigationmenus-profile-url-7"
                className="mt-1"
                placeholder="https://twitter.com/yourhandle"
                value={socialDialog.url}
                onChange={(e) => setSocialDialog((p) => ({ ...p, url: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSocialDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button onClick={saveSocialDialog}>{socialDialog.editingIndex === null ? "Add" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NavigationMenus;
