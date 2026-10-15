import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { sanitizeArticleHtml } from "@/lib/contentHtml";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onAiAssist?: () => void;
  aiBusy?: boolean;
};

type ActiveState = Record<string, boolean>;

const shortcuts = [
  "Ctrl+B bold",
  "Ctrl+I italic",
  "Ctrl+U underline",
  "Ctrl+K link",
  "Ctrl+Shift+7 numbered list",
  "Ctrl+Shift+8 bullet list",
];

const ArticleWritingTools = ({ value, onChange, disabled = false, onAiAssist, aiBusy = false }: Props) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtml = useRef("");
  const savedRange = useRef<Range | null>(null);
  const [format, setFormat] = useState("p");
  const [active, setActive] = useState<ActiveState>({});
  const [panel, setPanel] = useState<"link" | "image" | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageCaption, setImageCaption] = useState("");
  const [imageSource, setImageSource] = useState("");
  const [imageWidth, setImageWidth] = useState("100%");
  const [imageAlign, setImageAlign] = useState<"left" | "center" | "right">("center");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || value === lastHtml.current) return;
    editor.innerHTML = sanitizeArticleHtml(value);
    lastHtml.current = value;
  }, [value]);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshActiveState);
    return () => document.removeEventListener("selectionchange", refreshActiveState);
  }, []);

  const sync = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = sanitizeArticleHtml(editor.innerHTML);
    lastHtml.current = html;
    onChange(html);
    refreshActiveState();
    setWordCount(computeWordCount(html));
  };

  const focus = () => editorRef.current?.focus();

  const saveSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorRef.current?.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    focus();
    const selection = window.getSelection();
    if (!selection || !savedRange.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRange.current);
  };

  const refreshActiveState = () => {
    if (!editorRef.current || !editorRef.current.contains(document.activeElement)) return;
    const next = {
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
      justifyCenter: document.queryCommandState("justifyCenter"),
      justifyRight: document.queryCommandState("justifyRight"),
    };
    setActive(next);
    const block = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "") || "p";
    setFormat(["h1", "h2", "h3", "blockquote", "pre"].includes(block) ? block : "p");
  };

  const run = (command: string, argument?: string) => {
    if (disabled) return;
    restoreSelection();
    document.execCommand(command, false, argument);
    sync();
  };

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^(https?:|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const insertHtml = (html: string) => {
    if (disabled) return;
    restoreSelection();
    document.execCommand("insertHTML", false, html);
    sync();
  };

  const applyFormat = (value: string) => {
    setFormat(value);
    run("formatBlock", value.toUpperCase());
  };

  const openPanel = (next: "link" | "image") => {
    saveSelection();
    setPanel((current) => current === next ? null : next);
  };

  const applyLink = () => {
    const url = normalizeUrl(linkUrl);
    if (!url) return;
    restoreSelection();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = range.toString();
      range.deleteContents();
      range.insertNode(a);
      selection.removeAllRanges();
      sync();
    } else {
      insertHtml(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    }
    setLinkUrl("");
    setPanel(null);
  };

  const applyImage = () => {
    const url = normalizeUrl(imageUrl);
    if (!url) return;
    const safeAlt = imageAlt.replace(/"/g, "&quot;");
    const caption = imageCaption.trim();
    const source = imageSource.trim();
    const captionText = caption || source ? `${caption}${source ? ` (${source})` : ""}` : "";
    const figureStyle = imageAlign === "center"
      ? "text-align:center"
      : `text-align:${imageAlign}; float:${imageAlign}; max-width:${imageWidth}`;
    const imageStyle = `width:${imageWidth}; height:auto; max-width:100%`;
    insertHtml(
      `<figure style="${figureStyle}"><img src="${url}" alt="${safeAlt}" style="${imageStyle}">` +
      (captionText ? `<figcaption>${captionText}</figcaption>` : "") +
      `</figure><p><br></p>`
    );
    setImageUrl("");
    setImageAlt("");
    setImageCaption("");
    setImageSource("");
    setImageWidth("100%");
    setImageAlign("center");
    setImageUploadError("");
    setPanel(null);
  };

  const handleImageFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please choose an image file");
      return;
    }
    setImageUploading(true);
    setImageUploadError("");
    try {
      const { data } = await hostingerApi.uploadMedia(file, imageAlt);
      setImageUrl(data.url);
    } catch (err: any) {
      setImageUploadError(err?.message ?? "Upload failed — try again or paste a URL instead");
    } finally {
      setImageUploading(false);
    }
  };

  const applyListStyle = (type: string, ordered: boolean) => {
    restoreSelection();
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const start = node instanceof Element ? node : node?.parentElement;
    let list = start?.closest("ul,ol") as HTMLElement | null;
    if (!list) {
      document.execCommand(ordered ? "insertOrderedList" : "insertUnorderedList");
      const nextNode = window.getSelection()?.anchorNode;
      const nextStart = nextNode instanceof Element ? nextNode : nextNode?.parentElement;
      list = nextStart?.closest("ul,ol") as HTMLElement | null;
    }
    if (list) {
      list.style.listStyleType = type;
    }
    sync();
  };

  const addTable = () => {
    insertHtml('<table><tbody><tr><th>Heading</th><th>Heading</th></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>');
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    if (!html && !text) return;
    event.preventDefault();
    const cleaned = html
      ? sanitizeArticleHtml(
          html
            .replace(/<!--[\s\S]*?-->/g, "")
            .replace(/<\/?o:p[^>]*>/gi, "")
            .replace(/\sclass="Mso[^"]*"/gi, "")
            .replace(/\sstyle="[^"]*mso-[^"]*"/gi, "")
        )
      : text.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
    insertHtml(cleaned);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    const key = event.key.toLowerCase();

    if (key === "k") {
      event.preventDefault();
      openPanel("link");
    }
    if (event.shiftKey && key === "7") {
      event.preventDefault();
      run("insertOrderedList");
    }
    if (event.shiftKey && key === "8") {
      event.preventDefault();
      run("insertUnorderedList");
    }
  };

  const toolButton = (label: string, icon: any, action: () => void, activeKey?: string, forceActive = false) => {
    const Icon = icon;
    const isActive = forceActive || Boolean(activeKey && active[activeKey]);
    return (
      <Tooltip key={label}>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isActive ? "default" : "ghost"}
            size="icon"
            disabled={disabled}
            aria-label={label}
            aria-pressed={isActive}
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    );
  };

  // Word count and reading time estimate
  const computeWordCount = (html: string) => {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return 0;
    return text.split(' ').filter(Boolean).length;
  };
  const [wordCount, setWordCount] = useState(0);
  const readingTime = Math.max(1, Math.round((wordCount || 0) / 200));

  const preview = () => {
    const html = lastHtml.current || '';
    const w = window.open('', '_blank', 'noopener');
    if (!w) return;
    const doc = w.document;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Preview</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
    doc.close();
  };

  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 p-2">
        <Select value={format} onValueChange={applyFormat} disabled={disabled}>
          <SelectTrigger className="h-9 w-[150px] bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="p">Paragraph</SelectItem>
            <SelectItem value="h1">Heading 1</SelectItem>
            <SelectItem value="h2">Heading 2</SelectItem>
            <SelectItem value="h3">Heading 3</SelectItem>
            <SelectItem value="blockquote">Quote</SelectItem>
            <SelectItem value="pre">Code block</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" size="sm" variant={format === "h1" ? "default" : "outline"} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("h1")}>H1</Button>
        <Button type="button" size="sm" variant={format === "h2" ? "default" : "outline"} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("h2")}>H2</Button>
        <Button type="button" size="sm" variant={format === "h3" ? "default" : "outline"} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("h3")}>H3</Button>

        {toolButton("Bold (Ctrl+B)", Bold, () => run("bold"), "bold")}
        {toolButton("Italic (Ctrl+I)", Italic, () => run("italic"), "italic")}
        {toolButton("Underline (Ctrl+U)", Underline, () => run("underline"), "underline")}
        {toolButton("Strikethrough", Strikethrough, () => run("strikeThrough"), "strikeThrough")}
        {toolButton("Bullet list (Ctrl+Shift+8)", List, () => run("insertUnorderedList"), "insertUnorderedList")}
        {toolButton("Numbered list (Ctrl+Shift+7)", ListOrdered, () => run("insertOrderedList"), "insertOrderedList")}
        {toolButton("Quote", Quote, () => run("formatBlock", "BLOCKQUOTE"))}
        {toolButton("Align left", AlignLeft, () => run("justifyLeft"))}
        {toolButton("Align center", AlignCenter, () => run("justifyCenter"), "justifyCenter")}
        {toolButton("Align right", AlignRight, () => run("justifyRight"), "justifyRight")}
        {toolButton("Add link (Ctrl+K)", LinkIcon, () => openPanel("link"), undefined, panel === "link")}
        {toolButton("Add image", ImageIcon, () => openPanel("image"), undefined, panel === "image")}
        {toolButton("Highlight", Highlighter, () => run("backColor", "#fff3a3"))}
        {toolButton("Code block", Code, () => run("formatBlock", "PRE"))}
        {toolButton("Table", Table2, addTable)}
        {toolButton("Clear formatting", Eraser, () => run("removeFormat"))}
        {toolButton("Undo", Undo2, () => run("undo"))}
        {toolButton("Redo", Redo2, () => run("redo"))}

        {onAiAssist && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || aiBusy}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onAiAssist}
            className="ml-1"
          >
            <Sparkles className="mr-1 h-4 w-4" />
            {aiBusy ? "AI..." : "AI review"}
          </Button>
        )}

        <Input
          type="color"
          aria-label="Text color"
          disabled={disabled}
          className="h-8 w-10 border bg-background p-1"
          onMouseDown={saveSelection}
          onChange={(event) => run("foreColor", event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">List styles</span>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle("disc", false)}>Disc</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle("circle", false)}>Circle</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle("square", false)}>Square</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle("decimal", true)}>1 2 3</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle("lower-alpha", true)}>a b c</Button>
        <Button type="button" size="sm" variant="outline" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => applyListStyle("upper-roman", true)}>I II III</Button>
      </div>

      {panel === "link" && (
        <div className="grid gap-2 border-b bg-background p-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <Label htmlFor="articlewritingtools-link-url-1" className="text-xs">Link URL</Label>
            <Input id="articlewritingtools-link-url-1" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" autoFocus />
          </div>
          <Button type="button" onClick={applyLink}>Apply link</Button>
        </div>
      )}

      {panel === "image" && (
        <div className="grid gap-3 border-b bg-background p-3 sm:grid-cols-2 lg:grid-cols-4 sm:items-end">
          <div className="sm:col-span-2 lg:col-span-2">
            <Label className="text-xs">Image URL</Label>
            <div className="flex gap-1.5">
              <Input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://... or upload below" autoFocus />
              <Button
                type="button"
                variant="outline"
                disabled={imageUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0"
              >
                {imageUploading ? "Uploading…" : "Upload"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
            </div>
            {imageUploadError && <p className="mt-1 text-xs text-destructive">{imageUploadError}</p>}
            {imageUrl && !imageUploadError && (
              <div className="mt-2 flex items-center gap-2">
                <img src={imageUrl} alt="" className="h-10 w-10 rounded border object-cover" />
                <span className="truncate text-xs text-muted-foreground">Ready to insert</span>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="articlewritingtools-alt-text-2" className="text-xs">Alt text</Label>
            <Input id="articlewritingtools-alt-text-2" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe image" />
          </div>
          <div>
            <Label htmlFor="articlewritingtools-caption-3" className="text-xs">Caption</Label>
            <Input id="articlewritingtools-caption-3" value={imageCaption} onChange={(event) => setImageCaption(event.target.value)} placeholder="Optional caption" />
          </div>
          <div>
            <Label htmlFor="articlewritingtools-source-credit-4" className="text-xs">Source / credit</Label>
            <Input id="articlewritingtools-source-credit-4" value={imageSource} onChange={(event) => setImageSource(event.target.value)} placeholder="Reuters, photographer..." />
          </div>
          <div>
            <Label className="text-xs">Width</Label>
            <Select value={imageWidth} onValueChange={setImageWidth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="100%">Full width</SelectItem>
                <SelectItem value="75%">75%</SelectItem>
                <SelectItem value="50%">50%</SelectItem>
                <SelectItem value="33%">33%</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Align</Label>
            <Select value={imageAlign} onValueChange={(value) => setImageAlign(value as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="center">Center</SelectItem>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="button" className="sm:col-span-2 lg:col-span-4" onClick={applyImage}>Insert image</Button>
        </div>
      )}

      <div
        ref={editorRef}
        className="cms-rich-editor min-h-[460px] w-full overflow-auto bg-background p-5 text-base leading-7 outline-none disabled:cursor-not-allowed"
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={sync}
        onBlur={sync}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
      />

      <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-[13px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" variant="outline" onClick={preview}>Preview</Button>
          <div className="text-xs">{wordCount} words • {readingTime} min read</div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="text-muted-foreground">{shortcuts.map((item) => <span key={item} className="mr-2">{item}</span>)}</div>
        </div>
      </div>
    </div>
  );
};

export default ArticleWritingTools;
