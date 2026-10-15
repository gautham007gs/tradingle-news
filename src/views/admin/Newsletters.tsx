import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Users } from "lucide-react";
import { toast } from "sonner";
import { hostingerApi } from "@/lib/hostingerApi";

const Newsletters = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const formatRelativeDate = (dateString: string) => {
    // MySQL timestamps (e.g. "2024-01-01 12:00:00") must be treated as UTC
    const normalized = dateString.includes("T") ? dateString : dateString.replace(" ", "T") + "Z";
    const date = new Date(normalized);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (hours < 1) return "today";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    hostingerApi.newsletters()
      .then(({ data, total_subscribed }) => {
        setRows(data ?? []);
        setTotal(total_subscribed ?? 0);
      })
      .catch((e: any) => toast.error(e?.message ?? "Could not load newsletter subscribers"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="w-7 h-7 text-primary" /> Newsletters
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage email subscribers and newsletter distribution
          </p>
        </div>
        {total > 0 && (
          <div className="bg-primary/10 px-4 py-3 rounded-lg">
            <div className="text-2xl font-bold text-primary">{total}</div>
            <div className="text-xs text-primary/70">active subscribers</div>
          </div>
        )}
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading subscribers...</Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">No newsletter subscribers yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Subscribers will appear here when users sign up from your site
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <p className="text-sm font-medium">{rows.length} {rows.length === 1 ? "subscriber" : "subscribers"}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-xs">Email</th>
                  <th className="px-4 py-3 font-semibold text-xs">Category</th>
                  <th className="px-4 py-3 font-semibold text-xs">Source</th>
                  <th className="px-4 py-3 font-semibold text-xs">Status</th>
                  <th className="px-4 py-3 font-semibold text-xs text-right">Subscribed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.id} className={idx !== rows.length - 1 ? "border-b" : ""}>
                    <td className="px-4 py-3 font-medium">{row.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.category_slug ? <Badge variant="outline">{row.category_slug}</Badge> : <span>-</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{row.source || "site"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={row.status === "subscribed" ? "default" : "secondary"}>
                        {row.status === "subscribed" ? "✓ Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {formatRelativeDate(row.subscribed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Newsletters;
