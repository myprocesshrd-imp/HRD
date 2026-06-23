import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { 
  getDepartmentsWithId, getBusinessUnits, getEngagementByDept, 
  createDepartment, updateDepartment, deleteDepartment,
  Department, BusinessUnit
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
import { Separator } from "@/components/ui/separator";

import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/departments")({
  component: () => <Navigate to="/admin/personnel-mapping" replace />,
});

interface DeptRow {
  id: string;
  name: string;
  bu: string;
  responses: number;
}

function DeptAdmin() {
  const { t, lang } = useI18n();
  const [depts, setDepts] = useState<Department[]>([]);
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newDept, setNewDept] = useState("");
  const [newBuId, setNewBuId] = useState("");
  const [filterBu, setFilterBu] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDepartmentsWithId(),
      getBusinessUnits(),
      getEngagementByDept(),
    ]).then(([d, b, e]) => {
      setDepts(d);
      setBus(b);
      setResponses(Object.fromEntries(e.map((r) => [r.dept, r.responses])));
    }).finally(() => setLoading(false));
  }, []);

  const data: DeptRow[] = useMemo(() => {
    return depts
      .filter((d) => {
        const matchesBu = filterBu === "all" || d.business_unit_id === filterBu || d.business_unit === filterBu;
        const matchesSearch = d.name_en.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesBu && matchesSearch;
      })
      .map((d) => {
        const buObj = bus.find(b => b.id === d.business_unit_id);
        const buName = buObj 
          ? (lang === "th" ? (buObj.name_th || buObj.name) : (buObj.name_en || buObj.name))
          : (d.business_unit || "N/A");
        return {
          id: d.id,
          name: lang === "th" ? d.name_th : d.name_en,
          bu: buName,
          responses: responses[d.name_en] ?? 0,
        };
      });
  }, [depts, bus, responses, filterBu, searchTerm]);

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
    const selectedBu = bus.find(b => b.id === newBuId);
    try {
      if (isEditing) {
        await updateDepartment(editing, newDept.trim(), newDept.trim(), newBuId ? [newBuId] : []);
      } else {
        await createDepartment(newDept.trim(), newDept.trim(), newBuId ? [newBuId] : []);
      }
      const updated = await getDepartmentsWithId();
      setDepts(updated);
      setDialogOpen(false);
      setNewDept("");
      setNewBuId("");
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
      const updated = await getDepartmentsWithId();
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
      className: "min-w-[280px]",
      render: (r: DeptRow) => (
        <div className="flex items-center gap-4 py-2 group/item">
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary group-hover/item:border-primary/20 dark:group-hover/item:border-primary/50 group-hover/item:bg-white dark:group-hover/item:bg-slate-800 transition-all shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[15px] text-slate-900 dark:text-white truncate leading-tight">{r.name}</span>
            <div className="flex items-center gap-2 mt-0.5">
               <Badge variant="outline" className="h-5 px-2 rounded-md text-[9px] border-primary/20 text-primary font-bold uppercase bg-primary/5">DIVISION</Badge>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NODE_ID</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "bu",
      header: "Business Unit",
      sortable: true,
      className: "w-[180px]",
      render: (r: DeptRow) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 px-2.5 rounded-lg border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase bg-slate-50 dark:bg-slate-800/50">
            {r.bu}
          </Badge>
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
          <div className="space-y-2 w-full pr-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Users className="w-3.5 h-3.5 text-slate-400" />
                 <span className="text-[11px] font-bold uppercase text-slate-400">{r.responses} Packets</span>
              </div>
              <span className={cn(
                "text-[11px] font-bold tabular-nums",
                percentage > 70 ? "text-emerald-600" : percentage > 40 ? "text-amber-600" : "text-rose-600"
              )}>{Math.round(percentage)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
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
        <div className="flex items-center justify-end gap-2 transition-opacity">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary transition-all shadow-sm"
            onClick={() => { 
              setEditing(r.id); 
              setNewDept(r.name); 
              const currentDept = depts.find(d => d.id === r.id);
              setNewBuId(currentDept?.business_unit_id || "");
              setDialogOpen(true); 
            }}
          >
            <Pencil className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all shadow-sm"
            onClick={() => setDeleteTarget(r.id)}
          >
            <Trash2 className="w-5 h-5" />
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
      <div className="flex items-center justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Departments
          </h1>
          <p className="text-sm font-medium text-slate-400">
            {lang === "th" ? "จัดการโครงสร้างสถาปัตยกรรมหน่วยงาน" : "Manage organizational structural units and divisions."}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing(null); setNewDept(""); setNewBuId(""); }} className="h-10 px-6 rounded-xl bg-slate-900 dark:bg-primary text-white font-bold text-[11px] uppercase tracking-wider shadow-lg shadow-slate-900/10 dark:shadow-primary/10">
                <Plus className="w-4.5 h-4.5 mr-2" /> Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none shadow-2xl">
              <DialogHeader className="p-4 bg-slate-900 dark:bg-slate-950 text-white shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    {editing ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                       {editing ? "Modify Unit" : "Add Structural Unit"}
                    </DialogTitle>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Topology v2.4</span>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-5 bg-white dark:bg-slate-900 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Department Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <Input 
                      className="h-9 pl-9 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs" 
                      value={newDept} 
                      onChange={(e) => setNewDept(e.target.value)} 
                      placeholder="e.g. Information Technology"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Business Unit</Label>
                  <Select value={newBuId} onValueChange={setNewBuId}>
                    <SelectTrigger className="h-9 px-3.5 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs">
                      <SelectValue placeholder="Select parent BU..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                      {bus.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs font-semibold">
                          {lang === "th" ? (b.name_th || b.name) : (b.name_en || b.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="p-4 px-6 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-3">
                <Button variant="ghost" size="sm" className="h-9 px-5 text-[11px] font-bold text-slate-400 uppercase" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="h-9 px-8 rounded-xl bg-slate-900 dark:bg-primary text-white text-[11px] font-bold uppercase tracking-wider"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Nodes", val: stats.totalDepts, icon: Building2, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
          { label: "Business Units", val: stats.totalBus, icon: MapPin, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Engagement Mean", val: stats.avgResponses + "%", icon: BarChart3, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
          { label: "Active Registry", val: "Verified", icon: Database, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
        ].map(kpi => (
          <div key={kpi.label} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm group hover:shadow-md transition-all">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-500", kpi.bg, kpi.color)}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
              <div className="text-[20px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{kpi.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Registry Table ── */}
      <Card className="border-none shadow-sm overflow-hidden rounded-xl bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
        <div className="px-5 py-4 border-b border-slate-50 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-800/20">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                <Network className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Node Registry</h3>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={filterBu} onValueChange={setFilterBu}>
                <SelectTrigger className="h-9 w-full sm:w-[160px] rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs shadow-sm">
                  <SelectValue placeholder="All BUs" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                  <SelectItem value="all" className="text-xs font-bold uppercase tracking-wider">All Units</SelectItem>
                  <Separator className="my-1 opacity-50" />
                  {bus.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-xs font-semibold">{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative group w-full sm:max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search nodes..." 
                  className="h-9 pl-9 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs focus:ring-1 focus:ring-primary/10 transition-all" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
           </div>
        </div>
        <CardContent className="p-0">
          <DataTable
            data={data}
            columns={columns}
            pageSize={10}
            loading={loading}
            emptyMessage={lang === "th" ? "ไม่พบข้อมูลหน่วยงาน" : "No units found in registry."}
            keyExtractor={(r) => r.id}
          />
        </CardContent>
      </Card>

      {/* ── Visual Footer ── */}
      <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-slate-800 opacity-40">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          Organizational Topology Mapping v2.4
        </div>
      </div>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px] bg-white dark:bg-slate-900">
           <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight dark:text-white">Decommission Unit?</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                 Permanently decommission this department unit?
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider border-slate-200 dark:border-slate-700 dark:text-slate-300">Abort</AlertDialogCancel>
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
