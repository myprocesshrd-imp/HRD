import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { 
  getDepartments, getBusinessUnits, getEngagementByDept, 
  createDepartment, updateDepartment, deleteDepartment 
} from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogFooter, 
  DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { DataTable, type ColumnConfig } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Plus, Building2, Users, Pencil, Trash2, 
  Search, BarChart3, TrendingUp,
  Network, MapPin, Terminal, Database, Layers
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/departments")({
  component: DeptAdmin,
});

interface DeptRow {
  name: string;
  responses: number;
}

function DeptAdmin() {
  const { t, lang } = useI18n();
  const [depts, setDepts] = useState<string[]>([]);
  const [bus, setBus] = useState<string[]>([]);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newDept, setNewDept] = useState("");
  const [newBu, setNewBu] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDepartments(),
      getBusinessUnits(),
      getEngagementByDept(),
    ]).then(([d, b, e]) => {
      setDepts(d);
      setBus(b);
      setResponses(Object.fromEntries(e.map((r) => [r.dept, r.responses])));
    }).finally(() => setLoading(false));
  }, []);

  const data: DeptRow[] = useMemo(() => depts.map((name) => ({
    name,
    responses: responses[name] ?? 0,
  })), [depts, responses]);

  const stats = useMemo(() => {
    const totalDepts = depts.length;
    const totalBus = bus.length;
    const totalResponses = Object.values(responses).reduce((a, b) => a + b, 0);
    const avgResponses = totalDepts > 0 ? Math.round(totalResponses / totalDepts) : 0;
    return { totalDepts, totalBus, totalResponses, avgResponses };
  }, [depts, bus, responses]);

  const handleSave = async () => {
    if (!newDept.trim()) {
      toast.error(lang === "th" ? "กรุณากรอกชื่อหน่วยงาน" : "Please enter department name");
      return;
    }
    const isEditing = editing !== null;
    setSaving(true);
    try {
      if (isEditing) {
        await updateDepartment(editing, newDept.trim());
      } else {
        await createDepartment(newDept.trim());
      }
      const updated = await getDepartments();
      setDepts(updated);
      setDialogOpen(false);
      setNewDept("");
      setEditing(null);
      toast.success(lang === "th" ? "อัปเดตสถาปัตยกรรมองค์กรแล้ว" : "Organizational topology synchronized");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาดในการซิงค์ข้อมูล" : "Topology synchronization failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept: string) => {
    setSaving(true);
    try {
      await deleteDepartment(dept);
      const updated = await getDepartments();
      setDepts(updated);
      setDeleteTarget(null);
      toast.success(lang === "th" ? "ลบหน่วยงานออกจากระบบแล้ว" : "Department decommissioned successfully");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาดในการลบ" : "Decommission failure");
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnConfig<DeptRow>[] = [
    {
      key: "name",
      header: lang === "th" ? "หน่วยงาน" : "Department Node",
      sortable: true,
      className: "min-w-[300px]",
      render: (r: DeptRow) => (
        <div className="flex items-center gap-3 py-1.5 group/item">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-primary group-hover/item:border-primary/20 group-hover/item:bg-white transition-all shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-slate-900 truncate">{r.name}</span>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="h-4 px-2 rounded text-[8px] border-primary/20 text-primary font-bold uppercase bg-primary/5">DIVISION</Badge>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NODE_ID</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "responses",
      header: "Engagement Fidelity",
      sortable: true,
      className: "w-[220px]",
      render: (r: DeptRow) => {
        const percentage = Math.min(100, (r.responses / 100) * 100);
        return (
          <div className="space-y-1.5 w-full pr-4 py-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Users className="w-3 h-3 text-slate-400" />
                 <span className="text-[10px] font-bold uppercase text-slate-400">{r.responses} Packets</span>
              </div>
              <span className={cn(
                "text-[10px] font-bold tabular-nums",
                percentage > 70 ? "text-emerald-600" : percentage > 40 ? "text-amber-600" : "text-rose-600"
              )}>{Math.round(percentage)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
               <div className={cn(
                 "h-full rounded-full transition-all duration-1000",
                 percentage > 70 ? "bg-emerald-500" : percentage > 40 ? "bg-amber-500" : "bg-rose-500"
               )} style={{ width: `${percentage}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (r: DeptRow) => (
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary transition-all"
            onClick={() => { setEditing(r.name); setNewDept(r.name); setDialogOpen(true); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-lg border-slate-200 text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
            onClick={() => setDeleteTarget(r.name)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-indigo-600 animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Mapping Topology...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {/* ── Compact Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Departments
          </h1>
          <p className="text-xs font-medium text-slate-400">
            {lang === "th" ? "จัดการโครงสร้างสถาปัตยกรรมหน่วยงาน" : "Manage organizational structural units and divisions."}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setNewDept(""); setNewBu(""); }} size="sm" className="h-8 px-4 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden bg-white">
              <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white">
                    {editing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">
                       {editing ? "Modify Unit" : "Add Structural Unit"}
                    </DialogTitle>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Topology v2.4</span>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-5 bg-white space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input 
                      className="h-9 pl-9 rounded-lg border-slate-200 font-bold text-xs" 
                      value={newDept} 
                      onChange={(e) => setNewDept(e.target.value)} 
                      placeholder="e.g. Information Technology"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Business Unit</Label>
                  <Select value={newBu} onValueChange={setNewBu}>
                    <SelectTrigger className="h-9 px-3.5 rounded-lg border-slate-200 font-bold text-xs">
                      <SelectValue placeholder="Select parent BU..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {bus.map((b) => <SelectItem key={b} value={b} className="text-xs font-semibold">{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="p-3 px-5 bg-slate-50 border-t flex justify-end gap-2">
                <Button variant="ghost" size="sm" className="h-8 px-4 text-[10px] font-bold text-slate-400 uppercase" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  className="h-8 px-6 rounded-lg bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider"
                  onClick={handleSave} 
                  disabled={saving}
                >
                  {saving ? "Processing..." : "Sync topology"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Nodes", val: stats.totalDepts, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Business Units", val: stats.totalBus, icon: MapPin, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Engagement Mean", val: stats.avgResponses + "%", icon: BarChart3, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Active Registry", val: "Verified", icon: Database, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:shadow-md transition-all">
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

      {/* ── Registry Table ── */}
      <Card className="border-none shadow-sm overflow-hidden rounded-xl bg-white border border-slate-100">
        <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between gap-4 bg-slate-50/40">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                <Network className="w-3 h-3" />
              </div>
              <h3 className="text-xs font-bold tracking-tight text-slate-900">Node Registry</h3>
           </div>
           <div className="relative group max-w-xs w-full">
              <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input placeholder="Filter nodes..." className="h-7 pl-8 rounded-lg border-slate-200 bg-white font-bold text-[10px] shadow-none" />
           </div>
        </div>
        <CardContent className="p-0">
          <DataTable
            data={data}
            columns={columns}
            pageSize={10}
            loading={loading}
            emptyMessage={lang === "th" ? "ไม่พบข้อมูลหน่วยงาน" : "No units found in registry."}
            keyExtractor={(r) => r.name}
          />
        </CardContent>
      </Card>

      {/* ── Visual Footer ── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-100 opacity-40">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          Organizational Topology Mapping v2.4
        </div>
      </div>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px]">
           <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight">Decommission Unit?</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                 Permanently decommission <span className="text-slate-900">"{deleteTarget}"</span>?
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider border-slate-200">Abort</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteTarget && handleDelete(deleteTarget)} 
                className="flex-1 h-8 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-bold text-[9px] uppercase tracking-wider shadow-lg shadow-rose-600/20"
              >
                Confirm
              </AlertDialogAction>
           </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DeptAdmin;
