import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCmsAuth } from "@/hooks/useCmsAuth";
import { hostingerApi } from "@/lib/hostingerApi";
import { toast } from "sonner";
import { Users as UsersIcon, Shield, Award, Search, X, RefreshCw } from "lucide-react";

const ROLES = ["admin", "editor", "author", "contributor"] as const;

const ROLE_CONFIG = {
  admin: { icon: "👑", label: "Admin", color: "bg-red-500/10 text-red-700", description: "Full access" },
  editor: { icon: "✏️", label: "Editor", color: "bg-blue-500/10 text-blue-700", description: "Edit & publish" },
  author: { icon: "📝", label: "Author", color: "bg-purple-500/10 text-purple-700", description: "Write & submit" },
  contributor: { icon: "👥", label: "Contributor", color: "bg-gray-500/10 text-gray-700", description: "External" },
};

const Users = () => {
  const { isAdmin: currentUserIsAdmin } = useCmsAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { users } = await hostingerApi.users();
      setProfiles(users ?? []);

      const map: Record<string, string[]> = {};
      (users ?? []).forEach((user: any) => {
        map[String(user.id)] = user.roles ?? [];
      });
      setRolesByUser(map);
    } catch (error: any) {
      toast.error(error?.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = async (uid: string | number, role: typeof ROLES[number], has: boolean) => {
    try {
      await hostingerApi.toggleRole(uid, role, !has);
      toast.success(`Role updated`);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Could not update role.");
    }
  };

  const handleRevokeSessions = async (uid: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to revoke all active login sessions for ${name ?? "this user"}? They will be forced to log in again.`)) return;
    try {
      await hostingerApi.revokeSessions(uid);
      toast.success(`Sessions revoked for ${name}`);
    } catch (error: any) {
      toast.error(error?.message || "Could not revoke sessions.");
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.display_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q)
    );
  }, [profiles, searchQuery]);

  if (!currentUserIsAdmin) return (
    <Card className="p-8 text-center">
      <Shield className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
      <p className="text-muted-foreground">Admin access required to manage users.</p>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UsersIcon className="w-7 h-7 text-primary" /> Users & Roles
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user accounts, roles, and permissions for your newsroom</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">Loading users...</Card>
      ) : profiles.length === 0 ? (
        <Card className="p-12 text-center">
          <UsersIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground font-medium">No users found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
            {searchQuery ? ` matching "${searchQuery}"` : ` total`}
          </p>

          <div className="grid gap-3">
            {filtered.map((p) => {
              const has = rolesByUser[String(p.id)] ?? [];
              const profileIsAdmin = has.includes("admin");
              return (
                <Card key={p.id} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold">{p.display_name ?? "Anonymous"}</h3>
                          {profileIsAdmin && (
                            <Badge variant="destructive" className="text-xs px-2">
                              👑 Admin
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-1">ID {String(p.id)}</p>
                        {p.created_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Joined {new Date(p.created_at.replace(" ", "T") + (p.created_at.includes("T") ? "" : "Z")).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary flex items-center gap-1">
                          <Award className="w-4 h-4" />
                          {p.points ?? 0}
                        </div>
                        <p className="text-[10px] text-muted-foreground">current points</p>
                        <p className="text-[10px] text-muted-foreground">earned {p.total_points_earned ?? 0}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">ROLES</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {has.length === 0 ? (
                          <span className="text-xs text-muted-foreground italic">No roles assigned</span>
                        ) : (
                          has.map((role) => {
                            const config = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG];
                            return (
                              <Badge key={role} variant="secondary" className="flex items-center gap-1">
                                <span>{config?.icon}</span>
                                <span>{config?.label}</span>
                              </Badge>
                            );
                          })
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {ROLES.map((r) => {
                          const isActive = has.includes(r);
                          // Prevent removing the last admin role (would lock out the newsroom)
                          const isLastAdmin = isActive && r === "admin" && has.filter((x) => x === "admin").length === 1 && profiles.filter((u) => (rolesByUser[String(u.id)] ?? []).includes("admin")).length === 1;
                          return (
                            <Button
                              key={r}
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              onClick={() => toggleRole(p.id, r, isActive)}
                              className="text-xs"
                              disabled={isLastAdmin}
                              title={isLastAdmin ? "Cannot remove the last admin" : ROLE_CONFIG[r].description}
                            >
                              {isActive ? "✓" : "+"} {r}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t pt-4 flex justify-between items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground">Account Status: <Badge variant="secondary" className="capitalize text-[10px] py-0 px-1">{p.status}</Badge></p>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRevokeSessions(p.id, p.display_name)}
                        className="text-xs h-7"
                      >
                        Revoke sessions
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>⚠️ Tip:</strong> Keep at least one admin active. Your first admin was created during Hostinger setup. Remove roles carefully to avoid locking out the newsroom.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Users;
