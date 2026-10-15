import { useEffect, useState } from "react";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { Card } from "@/components/ui/card";
import { Award } from "lucide-react";
import { hostingerApi } from "@/lib/hostingerApi";

const MyRewards = () => {
  const { user } = useCmsAuth();
  const [points, setPoints] = useState(0);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const data = await hostingerApi.myPoints();
      setPoints(data.points ?? 0);
      setTotal(data.total_points_earned ?? 0);
      setHistory(data.history ?? []);
    })();
  }, [user]);

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">My points</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-xs text-muted-foreground flex items-center gap-2"><Award className="w-4 h-4" /> Current balance</div>
          <div className="text-4xl font-extrabold mt-2" style={{ color: "hsl(var(--primary))" }}>{points}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground">Lifetime earned</div>
          <div className="text-4xl font-extrabold mt-2">{total}</div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold mb-3">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rewards yet. Submit an article to start earning.</p>
        ) : (
          <ul className="divide-y">
            {history.map(h => (
              <li key={h.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">{h.reason}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                </div>
                <div className="font-semibold" style={{ color: h.points >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))" }}>
                  {h.points >= 0 ? "+" : ""}{h.points}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default MyRewards;
