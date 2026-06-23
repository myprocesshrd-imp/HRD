import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { 
  getBusinessUnits, 
  createBusinessUnit, 
  updateBusinessUnit, 
  deleteBusinessUnit, 
  type BusinessUnit 
} from "@/services/api/business-units";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Layers, 
  Building2, 
  Hash, 
  FileText,
  MoreVertical,
  Activity,
  Globe
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/admin/business-units")({
  component: () => <Navigate to="/admin/personnel-mapping" replace />,
});

function BusinessUnitsAdmin() {
  const { t, lang } = useI18n();
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog states
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BusinessUnit | null>(null);

  // Form states
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBusinessUnits();
      setBus(data);
    } catch (err) {
      toast.error("Failed to load business units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return bus.filter(b => 
      b.name.toLowerCase().includes(search.toLowerCase()) || 
      b.code?.toLowerCase().includes(search.toLowerCase())
    );
  }, [bus, search]);

  const handleOpenAdd = () => {
    setEditing(null);
    setNameTh("");
    setNameEn("");
    setDescription("");
    setOpen(true);
  };

  const handleOpenEdit = (bu: any) => {
    setEditing(bu);
    setNameTh(bu.name_th || bu.name || "");
    setNameEn(bu.name_en || bu.name || "");
    setDescription(bu.description || "");
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!nameTh.trim() && !nameEn.trim()) return toast.error("Name is required");
    
    try {
      if (editing) {
        await updateBusinessUnit(editing.id, { 
          name: nameEn || nameTh,
          name_en: nameEn || nameTh,
          name_th: nameTh || nameEn,
          description 
        });
        toast.success("Business Unit updated");
      } else {
        await createBusinessUnit({ 
          name: nameEn || nameTh,
          name_en: nameEn || nameTh,
          name_th: nameTh || nameEn,
          description 
        });
        toast.success("Business Unit created");
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBusinessUnit(deleteId);
      toast.success("Business Unit deleted");
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary mb-1">
             <Layers className="w-4 h-4 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Master Data Management</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Business Units</h1>
          <p className="text-[15px] font-medium text-slate-400">
             Central registry for organizational business sectors and divisions.
          </p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-primary text-white font-bold text-[13px] uppercase tracking-wider shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all group"
        >
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Add New BU
        </Button>
      </div>

      {/* ── Registry Dashboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Statistics & Filters */}
        <div className="lg:col-span-12 flex flex-col sm:flex-row gap-4">
           <div className="flex-1 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search by name or code..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-12 pl-11 pr-4 bg-white dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
              />
           </div>
           <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm px-6">
              <div className="text-right">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Units</span>
                 <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{bus.length}</div>
              </div>
              <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2" />
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                 <Globe className="w-5 h-5" />
              </div>
           </div>
        </div>

        {/* Data Table */}
        <Card className="lg:col-span-12 border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900/50">
           <CardHeader className="px-8 py-5 bg-slate-50/30 dark:bg-slate-800/20 border-b dark:border-slate-800">
              <div className="flex items-center gap-4">
                 <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary shadow-sm">
                    <Activity className="w-4.5 h-4.5" />
                 </div>
                 <CardTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase tracking-widest">Business Unit Registry</CardTitle>
              </div>
           </CardHeader>
           <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-800/40 sticky top-0 z-10 border-b dark:border-slate-800">
                       <tr className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                           <th className="px-8 py-4 w-[120px]">Identity</th>
                          <th className="px-8 py-4">Name</th>
                          <th className="px-8 py-4">Description</th>
                          <th className="px-8 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                       {loading ? (
                         Array.from({ length: 5 }).map((_, i) => (
                           <tr key={i} className="animate-pulse">
                             <td className="px-8 py-6"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-12" /></td>
                             <td className="px-8 py-6"><div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-32" /></td>
                             <td className="px-8 py-6"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-48" /></td>
                             <td className="px-8 py-6"><div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg w-20 ml-auto" /></td>
                           </tr>
                         ))
                       ) : filtered.length > 0 ? (
                         filtered.map((bu) => (
                           <tr key={bu.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                             <td className="px-8 py-6">
                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold px-2 py-1 rounded-md text-[10px]">
                                   {bu.code || "---"}
                                </Badge>
                             </td>
                             <td className="px-8 py-6">
                                <div className="flex flex-col">
                                   <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">
                                      {lang === "th" ? (bu.name_th || bu.name) : (bu.name_en || bu.name)}
                                   </span>
                                   {(bu.name_en || bu.name_th) && (
                                      <span className="text-[10px] text-slate-400 font-medium">
                                         {lang === "th" ? (bu.name_en || "") : (bu.name_th || "")}
                                      </span>
                                   )}
                                </div>
                             </td>
                             <td className="px-8 py-6">
                                <span className="text-[13px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                                   {bu.description || "System sector registry entry."}
                                </span>
                             </td>
                             <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2 transition-opacity">
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => handleOpenEdit(bu)}
                                     className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-sm transition-all"
                                   >
                                      <Edit2 className="w-4 h-4 text-slate-400 hover:text-indigo-600" />
                                   </Button>
                                   <Button 
                                     variant="ghost" 
                                     size="icon" 
                                     onClick={() => setDeleteId(bu.id)}
                                     className="h-9 w-9 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 shadow-sm transition-all"
                                   >
                                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                                   </Button>
                                </div>
                             </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                           <td colSpan={4} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-3">
                                 <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                                    <Search className="w-6 h-6" />
                                 </div>
                                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No matching units found</p>
                              </div>
                           </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </ScrollArea>
           </CardContent>
        </Card>
      </div>

      {/* ── Dialogs ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-3xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="px-8 pt-8 pb-6 bg-slate-50/50 dark:bg-slate-800/30 border-b dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/10">
                {editing ? <Edit2 className="w-5.5 h-5.5" /> : <Plus className="w-5.5 h-5.5" />}
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight">{editing ? "Edit Business Unit" : "New Business Unit"}</DialogTitle>
                <DialogDescription className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Configure organizational sector parameters.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="px-8 py-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Title (Thai)</Label>
                <div className="relative group">
                  <Input 
                    placeholder="เช่น ฝ่ายผลิต" 
                    value={nameTh} 
                    onChange={e => setNameTh(e.target.value)}
                    className="h-12 px-4 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 focus:border-primary/30 rounded-2xl font-bold transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Title (English)</Label>
                <div className="relative group">
                  <Input 
                    placeholder="e.g. Manufacturing" 
                    value={nameEn} 
                    onChange={e => setNameEn(e.target.value)}
                    className="h-12 px-4 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 focus:border-primary/30 rounded-2xl font-bold transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Description</Label>
              <div className="relative group">
                <FileText className="absolute left-4 top-4 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Operational scope details..." 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="h-24 pl-11 pt-4 items-start bg-slate-50 dark:bg-slate-950 border-transparent focus:border-primary/30 rounded-2xl font-medium transition-all"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t dark:border-slate-800 flex gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl font-bold text-slate-400 uppercase tracking-widest hover:bg-white dark:hover:bg-slate-800">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1 h-12 rounded-2xl bg-primary text-white font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
              {editing ? "Save Changes" : "Create BU"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-none bg-white dark:bg-slate-900 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black tracking-tight text-rose-600">Decommission Business Unit?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-500">
              This action will remove the BU from the registry. Departments currently assigned to this unit will need to be remapped. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-4">
            <AlertDialogCancel className="h-12 rounded-2xl font-bold border-none bg-slate-50 dark:bg-slate-800 text-slate-400 uppercase tracking-widest">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-widest shadow-lg shadow-rose-600/20">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
