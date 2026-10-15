import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, Copy, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { hostingerApi } from "@/lib/hostingerApi";

const MediaLibrary = () => {
  const { user } = useCmsAuth();
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await hostingerApi.media();
      setItems(data ?? []);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load media");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const upload = useCallback(async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be smaller than 5MB");
      return;
    }
    setBusy(true);
    try {
      await hostingerApi.uploadMedia(file);
      toast.success("Image uploaded successfully");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const del = async (item: any) => {
    if (!confirm(`Delete ${item.file_name}?`)) return;
    try {
      await hostingerApi.deleteMedia(item.id);
      toast.success("Image deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete file");
    }
  };

  return (
    <div className="space-y-5"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-primary" /> Media Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and manage images for articles and homepage</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        {/* Upload is independent of list refresh — only disabled while actively uploading */}
        <Button disabled={busy} onClick={() => fileRef.current?.click()} className="h-10">
          <Upload className="w-4 h-4 mr-2" /> {busy ? "Uploading…" : "Upload image"}
        </Button>
      </div>

      {/* Drag-and-drop hint */}
      {dragging && (
        <Card className="p-10 border-2 border-dashed border-primary text-center bg-primary/5">
          <Upload className="w-10 h-10 mx-auto mb-2 text-primary" />
          <p className="text-sm font-medium text-primary">Drop image to upload</p>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading media library...</Card>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">No images yet</p>
          <p className="text-sm text-muted-foreground mt-1">Upload your first image to get started</p>
          <Button 
            variant="default" 
            className="mt-4"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" /> Upload image
          </Button>
        </Card>
      ) : (
        <div>
          <p className="text-sm text-muted-foreground mb-3">{items.length} {items.length === 1 ? "image" : "images"}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map(m => (
              <Card key={m.id} className="overflow-hidden group relative cursor-pointer hover:shadow-lg transition-shadow">
                <div className="relative aspect-square bg-muted">
                  <img src={m.url} alt={m.alt_text ?? m.file_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(m.url);
                        toast.success("URL copied");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        del(m);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted/30 border-t">
                  <div className="text-xs font-medium truncate text-foreground">{m.file_name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {(m.file_size / 1024).toFixed(0)} KB
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
