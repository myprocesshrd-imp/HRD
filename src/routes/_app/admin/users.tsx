import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { getUsers, createUser, updateUser, getDepartments, setUserActive } from "@/services/api";
import type { MockUser, Role } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, DialogContent, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { DataTable, type ColumnConfig } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Users as UsersIcon, Pencil, UserCheck, UserX, 
  RefreshCw, Search, Mail, Building2, 
  ShieldCheck, FileSpreadsheet, Download,
  Terminal, Database, Zap, Layers, Briefcase, MapPin, UserCog, Shield, Activity, Fingerprint, Clock, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { LEVELS, LOCATIONS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/users")({
  component: UsersAdmin,
});

const ROLE_CONFIG: Record<Role, { color: string; labelEn: string; labelTh: string; icon: any }> = {
  super_admin: { color: "bg-rose-50 text-rose-600 border-rose-100", labelEn: "Super Admin", labelTh: "ผู้ดูแลระบบสูงสุด", icon: Shield },
  hr_admin: { color: "bg-blue-50 text-blue-600 border-blue-100", labelEn: "HR Admin", labelTh: "ผู้ดูแลฝ่าย HR", icon: Sparkles },
  manager: { color: "bg-amber-50 text-amber-600 border-amber-100", labelEn: "Manager", labelTh: "หัวหน้างาน", icon: Activity },
  employee: { color: "bg-slate-50 text-slate-600 border-slate-100", labelEn: "Employee", labelTh: "พนักงาน", icon: UsersIcon },
};

function UsersAdmin() {
  const { lang } = useI18n();
  const [users, setUsers] = useState<MockUser[]>([]);
  const [depts, setDepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editing, setEditing] = useState<MockUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterRole, setFilterRole] = useState<"all" | Role>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([getUsers(), getDepartments()]).then(([u, d]) => {
      setUsers(u);
      setDepts(d);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await updateUser(editing.id, editing);
      } else {
        await createUser(editing);
      }
      const updated = await getUsers();
      setUsers(updated);
      setDialogOpen(false);
      toast.success(lang === "th" ? "บันทึกข้อมูลสำเร็จ" : "Identity synchronized");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาด" : "Registry error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: MockUser) => {
    const next = !(u.isActive !== false);
    setToggling(u.id);
    try {
      await setUserActive(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));
      toast.success(next ? "Account reinstated" : "Access suspended");
    } catch {
      toast.error("Status update failed");
    } finally {
      setToggling(null);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = filterRole === "all" || u.role === filterRole;
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || 
        u.nameEn.toLowerCase().includes(q) || 
        u.nameTh.toLowerCase().includes(q) || 
        u.employeeCode.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, filterRole, searchQuery]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive !== false).length;
    const roles = users.reduce<Record<string, number>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {});
    return { total, active, inactive: total - active, roles };
  }, [users]);

  const columns: ColumnConfig<MockUser>[] = [
    {
      key: "nameEn",
      header: lang === "th" ? "พนักงาน" : "Personnel Identity",
      sortable: true,
      className: "min-w-[280px]",
      render: (u: MockUser) => (
        <div className="flex items-center gap-3 py-1.5 group/item">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border transition-all overflow-hidden",
            u.isActive === false 
              ? "bg-slate-50 text-slate-300 border-slate-100 opacity-50" 
              : "bg-white text-slate-900 border-slate-100 shadow-sm"
          )}>
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              u.nameEn.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex flex-col">
            <span className={cn(
              "text-sm font-bold truncate",
              u.isActive === false ? "text-slate-400 italic" : "text-slate-900"
            )}>
              {lang === "th" ? u.nameTh : u.nameEn}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight text-slate-400">
              <span className="font-mono">{u.employeeCode}</span>
              <span className="opacity-30">|</span>
              <span className="truncate">{u.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Authority",
      sortable: true,
      className: "w-[130px]",
      render: (u: MockUser) => {
        const config = ROLE_CONFIG[u.role];
        return (
          <div className="flex items-center gap-2.5">
            <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center border shadow-sm", config.color)}>
               <config.icon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight text-slate-600">
              {lang === "th" ? config.labelTh : config.labelEn}
            </span>
          </div>
        );
      },
    },
    {
      key: "department",
      header: "Structure",
      sortable: true,
      className: "hidden md:table-cell w-[160px]",
      render: (u: MockUser) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-700">{u.department}</span>
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tight">{u.location}</span>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      className: "w-[110px]",
      render: (u: MockUser) => {
        const active = u.isActive !== false;
        return (
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", active ? "bg-emerald-500 animate-pulse" : "bg-slate-300")} />
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", active ? "text-emerald-600" : "text-slate-400")}>
              {active ? "Active" : "Suspended"}
            </span>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (u: MockUser) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg border-slate-200 transition-all",
              u.isActive !== false ? "text-rose-400 hover:text-rose-600 hover:bg-rose-50" : "text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50"
            )}
            onClick={() => handleToggleActive(u)}
            disabled={toggling === u.id}
          >
            {u.isActive !== false ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary transition-all"
            onClick={() => { setEditing(u); setDialogOpen(true); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Personnel Registry...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Users</h1>
          <p className="text-xs font-medium text-slate-400">
            {lang === "th" ? "จัดการข้อมูลบุคลากรและสิทธิ์การใช้งาน" : "Manage personnel registry and access levels."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-8 px-3 rounded-lg border-slate-200 font-bold text-[10px] uppercase gap-2">
            <RefreshCw className="w-3 h-3 text-slate-400" />
            <span className="hidden sm:inline">Sync Registry</span>
          </Button>
          <Button onClick={() => {
            setEditing({
              id: "", employeeCode: "", email: "", password: "", nameTh: "", nameEn: "",
              role: "employee", department: depts[0] || "", businessUnit: "BU A", 
              level: LEVELS[0] || "", location: LOCATIONS[0] || "", avatarUrl: "", isActive: true,
            });
            setDialogOpen(true);
          }} className="h-8 px-4 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Provision User
          </Button>
        </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Identity", val: stats.total, icon: Fingerprint, color: "text-slate-600", bg: "bg-slate-50" },
          { label: "Active Access", val: stats.active, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Commanders", val: (stats.roles.super_admin ?? 0) + (stats.roles.hr_admin ?? 0), icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Suspended", val: stats.inactive, icon: Clock, color: "text-rose-500", bg: "bg-rose-50" },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", kpi.bg, kpi.color)}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
              <div className="text-lg font-bold text-slate-900 tracking-tight leading-tight">{kpi.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
         <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {(["all", "super_admin", "hr_admin", "manager", "employee"] as const).map((r) => (
              <button key={r} onClick={() => setFilterRole(r)} className={cn(
                "px-2.5 h-7 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap", 
                filterRole === r 
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}>
                {r === "all" ? "All Users" : r.replace("_", " ")}
                <span className={cn(
                  "ml-1.5 px-1 rounded text-[8px]", 
                  filterRole === r ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400"
                )}>
                  {r === "all" ? users.length : (stats.roles[r] ?? 0)}
                </span>
              </button>
            ))}
         </div>
         <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="h-7 px-2 rounded-lg border-slate-200 text-slate-600">
               <FileSpreadsheet className="w-3 h-3" />
            </Button>
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter registry..." 
                className="h-7 pl-8 rounded-lg border-slate-200 bg-white text-[10px] shadow-none" 
              />
            </div>
         </div>
      </div>

      {/* ── Registry Card ── */}
      <Card className="border-none shadow-sm overflow-hidden rounded-xl bg-white border border-slate-100">
        <CardContent className="p-0">
          <DataTable
            data={filteredUsers}
            columns={columns}
            pageSize={10}
            loading={loading}
            emptyMessage={lang === "th" ? "ไม่พบข้อมูลพนักงาน" : "No personnel found in registry."}
            keyExtractor={(u) => u.id}
          />
        </CardContent>
      </Card>

      {/* ── Provisioning Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
         <DialogContent className="sm:max-w-2xl rounded-xl p-0 overflow-hidden">
            <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
               <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
                     <UserCog className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">
                       {editing?.id ? "Modify Identity" : "Provision New Identity"}
                    </DialogTitle>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Registry Protocol v2.4</span>
                  </div>
               </div>
            </DialogHeader>

            {editing && (
              <ScrollArea className="max-h-[65vh]">
                <div className="p-5 space-y-5 bg-white">
                  {/* Basic Matrix */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Employee Code</Label>
                      <Input value={editing.employeeCode} onChange={(e) => setEditing({...editing, employeeCode: e.target.value})} className="h-9 rounded-lg border-slate-200 font-bold text-xs" placeholder="E-XXXXXX" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                      <Input value={editing.email} onChange={(e) => setEditing({...editing, email: e.target.value})} className="h-9 rounded-lg border-slate-200 font-bold text-xs" placeholder="identity@enterprise.com" />
                    </div>
                  </div>

                  {/* Names */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Name (Thai)</Label>
                      <Input value={editing.nameTh} onChange={(e) => setEditing({...editing, nameTh: e.target.value})} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Name (English)</Label>
                      <Input value={editing.nameEn} onChange={(e) => setEditing({...editing, nameEn: e.target.value})} className="h-9 rounded-lg border-slate-200 font-bold text-xs" />
                    </div>
                  </div>

                  {/* Role & Dept */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Authority Role</Label>
                      <Select value={editing.role} onValueChange={(v) => setEditing({...editing, role: v as any})}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-lg">
                          <SelectItem value="employee" className="text-xs font-semibold">Employee (Standard)</SelectItem>
                          <SelectItem value="manager" className="text-xs font-semibold">Manager</SelectItem>
                          <SelectItem value="hr_admin" className="text-xs font-semibold">HR Admin</SelectItem>
                          <SelectItem value="super_admin" className="text-xs font-semibold">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department</Label>
                      <Select value={editing.department} onValueChange={(v) => setEditing({...editing, department: v})}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {depts.map(d => <SelectItem key={d} value={d} className="text-xs font-semibold">{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Level & Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Personnel Level</Label>
                      <Select value={editing.level} onValueChange={(v) => setEditing({...editing, level: v})}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {LEVELS.map(l => <SelectItem key={l} value={l} className="text-xs font-semibold">{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Work Location</Label>
                      <Select value={editing.location} onValueChange={(v) => setEditing({...editing, location: v})}>
                        <SelectTrigger className="h-9 rounded-lg border-slate-200 font-bold text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {LOCATIONS.map(l => <SelectItem key={l} value={l} className="text-xs font-semibold">{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            <DialogFooter className="p-3 px-5 bg-slate-50 border-t flex justify-end gap-2">
               <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="px-4 h-8 rounded-lg font-bold text-[10px] text-slate-400 uppercase">Cancel</Button>
               <Button onClick={handleSave} disabled={saving} className="px-6 h-8 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                  {saving ? "Saving..." : "Finalize Identity"}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* ── Visual Footer ── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-100 opacity-40">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          Registry Integrity v2.4 &bull; SOC3
        </div>
      </div>

    </div>
  );
}

export default UsersAdmin;
