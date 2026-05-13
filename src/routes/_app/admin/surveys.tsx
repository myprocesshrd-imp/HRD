import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { getSurveys, getQuestionBank, createSurvey, updateSurvey, deleteSurvey, cloneSurvey } from "@/services/api";
import type { MockSurvey } from "@/services/api";
import type { SurveySection } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, type ColumnConfig } from "@/components/ui/data-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, Pencil, Trash2, Eye, 
  Copy, ClipboardList, Send, Search, Settings2, ShieldCheck, Terminal, Users, Zap, Edit3, Binary, Layers, Info, CheckCircle2,
  Globe, Activity, Filter, Database, Clock, Target, ArrowRight
} from "lucide-react";
import { PreviewSurveyDialog } from "@/components/admin/preview-survey-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/surveys")({
  component: SurveysAdmin,
});

function SectionsModal({ sections, sectionIds, lang, onClose }: {
  sections: SurveySection[];
  sectionIds: string[];
  lang: string;
  onClose: () => void;
}) {
  const resolved = sectionIds.map((id) => {
    const sec = sections.find((s) => s.id === id);
    return { id, title: lang === "th" ? sec?.titleTh ?? id : sec?.titleEn ?? id, qCount: sec?.questions.length ?? 0 };
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden">
        <DialogHeader className="p-4 bg-slate-900 text-white">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                 <Layers className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Linked Nodes</DialogTitle>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{resolved.length} Logical Units Mapping</span>
              </div>
           </div>
        </DialogHeader>
        <div className="p-4 bg-white">
          <ScrollArea className="max-h-[50vh] pr-2">
            <div className="space-y-2">
              {resolved.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 px-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-primary/20 hover:bg-white transition-all group shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-primary font-bold text-xs border border-slate-100 shrink-0 shadow-sm">
                      {r.id}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{r.title}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Registry ID: {r.id}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="h-6 rounded-lg px-3 bg-white text-slate-600 border-slate-200 font-bold text-[10px] uppercase">
                    {r.qCount} Units
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-end">
           <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={onClose}>Close Registry</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SurveysAdmin() {
  const { t, lang } = useI18n();
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MockSurvey | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<MockSurvey | null>(null);
  const [sectionModalSurvey, setSectionModalSurvey] = useState<MockSurvey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    Promise.all([getSurveys(), getQuestionBank()]).then(([s, q]) => {
      setSurveys(s);
      setSections(q);
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    if (editing.sectionIds.length === 0) {
      toast.error(lang === "th" ? "กรุณาเลือกชุดคำถามอย่างน้อย 1 ชุด" : "Please select at least 1 section");
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await updateSurvey(editing.id, editing);
      } else {
        await createSurvey(editing);
      }
      const updated = await getSurveys();
      setSurveys(updated);
      setDialogOpen(false);
      toast.success(lang === "th" ? "บันทึกแบบสำรวจแล้ว" : "Campaign synchronized");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาด" : "System exception");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      await deleteSurvey(id);
      const updated = await getSurveys();
      setSurveys(updated);
      setDeleteTarget(null);
      toast.success(lang === "th" ? "ลบแบบสำรวจแล้ว" : "Campaign decommissioned");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาด" : "Deletion failed");
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async (id: string) => {
    setSaving(true);
    try {
      await cloneSurvey(id);
      const updated = await getSurveys();
      setSurveys(updated);
      toast.success(lang === "th" ? "คัดลอกแบบสำรวจแล้ว" : "Campaign replicated");
    } catch {
      toast.error(lang === "th" ? "เกิดข้อผิดพลาด" : "Replication failure");
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    if (!editing) return;
    setEditing((prev) => {
      if (!prev) return prev;
      const ids = prev.sectionIds.includes(sectionId)
        ? prev.sectionIds.filter((id) => id !== sectionId)
        : [...prev.sectionIds, sectionId];
      return { ...prev, sectionIds: ids };
    });
  };

  const filteredSurveys = useMemo(() => {
    return surveys.filter(s => {
      const q = searchQuery.toLowerCase();
      return !q || s.titleEn.toLowerCase().includes(q) || s.titleTh.toLowerCase().includes(q);
    });
  }, [surveys, searchQuery]);

  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter(s => s.status === "Active").length;
    const avgResponses = total > 0 ? Math.round(surveys.reduce((acc, s) => acc + (s.responses || 0), 0) / total) : 0;
    return { total, active, avgResponses };
  }, [surveys]);

  const columns: ColumnConfig<MockSurvey>[] = [
    {
      key: "titleTh",
      header: lang === "th" ? "ชื่อแบบสำรวจ" : "Campaign Identifier",
      sortable: true,
      className: "min-w-[250px]",
      render: (s: MockSurvey) => (
        <div className="flex items-center gap-4 py-2 group/item">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center shrink-0 transition-all shadow-sm">
             <span className="text-[8px] font-bold text-slate-400 uppercase leading-none tracking-widest">UID</span>
             <span className="text-xs font-bold text-slate-900 mt-1">{s.id.slice(-4).toUpperCase()}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-bold text-slate-900 text-sm truncate">
              {lang === "th" ? s.titleTh : s.titleEn}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
               <Badge variant="outline" className="h-5 px-2 rounded-lg text-[9px] border-primary/20 text-primary font-bold uppercase bg-primary/5">
                 {s.surveyType}
               </Badge>
               <button 
                  onClick={() => setSectionModalSurvey(s)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-1.5"
                >
                 <Layers className="w-3 h-3" /> {s.sectionIds.length} Nodes
               </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      className: "w-[120px]",
      render: (s) => (
        <Select
          value={s.status}
          onValueChange={async (val) => {
            try {
              await updateSurvey(s.id, { ...s, status: val as MockSurvey["status"] });
              const updated = await getSurveys();
              setSurveys(updated);
              toast.success(`Operational Status: ${val}`);
            } catch {
              toast.error("Status sync failed");
            }
          }}
        >
          <SelectTrigger className={cn(
            "h-9 w-full rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm",
            s.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
            s.status === "Closed" ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-amber-50 text-amber-600 border-amber-100"
          )}>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", s.status === "Active" ? "bg-emerald-500 animate-pulse" : s.status === "Closed" ? "bg-slate-300" : "bg-amber-500")} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl p-1.5">
            <SelectItem value="Draft" className="h-10 rounded-lg text-xs font-bold uppercase">Draft</SelectItem>
            <SelectItem value="Active" className="h-10 rounded-lg text-xs font-bold uppercase">Active</SelectItem>
            <SelectItem value="Closed" className="h-10 rounded-lg text-xs font-bold uppercase">Closed</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      key: "responses",
      header: "Fidelity",
      sortable: true,
      className: "w-[160px]",
      render: (s) => {
        const pct = s.target ? Math.round((s.responses / s.target) * 100) : 0;
        return (
          <div className="space-y-1 py-1 pr-4">
            <div className="flex items-center justify-between">
               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{s.responses} / {s.target}</span>
               <span className="text-[9px] font-bold tabular-nums text-slate-600">{pct}%</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
               <div className={cn("h-full rounded-full transition-all duration-1000", pct >= 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[140px]",
      render: (s) => (
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="outline" size="icon" 
            className="h-9 w-9 rounded-xl border-slate-200 text-slate-400 hover:text-primary transition-all shadow-sm bg-white"
            onClick={() => { setEditing({ ...s }); setDialogOpen(true); }}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" size="icon" 
            className="h-9 w-9 rounded-xl border-slate-200 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm bg-white" 
            onClick={() => setPreviewTarget(s)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" size="icon" 
            className="h-9 w-9 rounded-xl border-slate-200 text-slate-300 hover:text-slate-600 transition-all shadow-sm bg-white"
            onClick={() => handleClone(s.id)} 
            disabled={saving}
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" size="icon" 
            className="h-9 w-9 rounded-xl border-slate-200 text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm bg-white"
            onClick={() => setDeleteTarget(s.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing Campaigns...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {sectionModalSurvey && <SectionsModal sections={sections} sectionIds={sectionModalSurvey.sectionIds} lang={lang} onClose={() => setSectionModalSurvey(null)} />}
      {previewTarget && <PreviewSurveyDialog survey={previewTarget} onClose={() => setPreviewTarget(null)} />}

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Surveys</h1>
          <p className="text-xs font-medium text-slate-400">
            {lang === "th" ? "จัดการแคมเปญแบบสำรวจความผูกพัน" : "Orchestrate engagement campaigns and insights."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => { setEditing({ id: "", titleEn: "", titleTh: "", status: "Draft", surveyType: "identified", startDate: "", endDate: "", responses: 0, target: 0, sectionIds: [] }); }}
                size="sm"
                className="h-10 px-6 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> Create Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-xl p-0 overflow-hidden bg-white">
              <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Binary className="w-4 h-4" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold">
                      {editing?.id ? "Modify Campaign" : "New Strategic Campaign"}
                    </DialogTitle>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">System Protocol v2.4</span>
                  </div>
                </div>
              </DialogHeader>

              {editing && (
                <ScrollArea className="max-h-[65vh]">
                  <div className="p-5 space-y-5">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title (Thai)</Label>
                         <Input value={editing.titleTh} onChange={(e) => setEditing({...editing, titleTh: e.target.value})} className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold" />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title (English)</Label>
                         <Input value={editing.titleEn} onChange={(e) => setEditing({...editing, titleEn: e.target.value})} className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold" />
                       </div>
                    </div>

                    {/* Operational */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Status</Label>
                         <Select value={editing.status} onValueChange={(v) => setEditing({...editing, status: v as any})}>
                            <SelectTrigger className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg">
                               <SelectItem value="Active" className="text-xs font-semibold">Active Deployment</SelectItem>
                               <SelectItem value="Closed" className="text-xs font-semibold">Closed</SelectItem>
                               <SelectItem value="Draft" className="text-xs font-semibold">Draft</SelectItem>
                            </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Anonymity</Label>
                         <Select value={editing.surveyType} onValueChange={(v) => setEditing({...editing, surveyType: v as any})}>
                            <SelectTrigger className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg">
                               <SelectItem value="identified" className="text-xs font-semibold">Identified</SelectItem>
                               <SelectItem value="anonymous" className="text-xs font-semibold">Anonymous</SelectItem>
                            </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Target</Label>
                         <Input type="number" value={editing.target} onChange={(e) => setEditing({...editing, target: Number(e.target.value)})} className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold" />
                       </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Start Date</Label>
                         <Input type="date" value={editing.startDate} onChange={(e) => setEditing({...editing, startDate: e.target.value})} className="h-9 px-3.5 rounded-lg border-slate-200 font-bold text-[10px]" />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">End Date</Label>
                         <Input type="date" value={editing.endDate} onChange={(e) => setEditing({...editing, endDate: e.target.value})} className="h-9 px-3.5 rounded-lg border-slate-200 font-bold text-[10px]" />
                       </div>
                    </div>

                    {/* Content Nodes */}
                    <div className="space-y-2.5 pt-4 border-t">
                       <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Linked Content Nodes</Label>
                       <div className="grid grid-cols-2 gap-2.5">
                         {sections.map(sec => {
                           const checked = editing.sectionIds.includes(sec.id);
                           return (
                             <div 
                                key={sec.id}
                                onClick={() => toggleSection(sec.id)} 
                                className={cn(
                                  "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group", 
                                  checked ? "bg-primary/[0.03] border-primary/30 ring-1 ring-primary/10" : "bg-white border-slate-100 hover:border-slate-200 shadow-sm"
                                )}
                              >
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[9px] shrink-0 border transition-all shadow-sm", 
                                  checked ? "bg-primary text-white border-primary/20" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                  {sec.id}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={cn("text-[11px] font-bold truncate", checked ? "text-primary" : "text-slate-900")}>{lang === "th" ? sec.titleTh : sec.titleEn}</div>
                                  <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{sec.questions.length} Units</div>
                                </div>
                                <Checkbox checked={checked} onCheckedChange={() => toggleSection(sec.id)} className="h-4.5 w-4.5 rounded-md" />
                             </div>
                           )
                         })}
                       </div>
                    </div>
                  </div>
                </ScrollArea>
              )}

              <DialogFooter className="p-3 px-5 bg-slate-50 border-t flex justify-end gap-2 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="px-4 h-8 rounded-lg font-bold text-[10px] text-slate-400 uppercase">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} size="sm" className="px-6 h-8 rounded-lg bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                   {saving ? "Processing..." : "Sync Campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
         {[
           { label: "Campaigns", val: surveys.length, icon: ClipboardList, color: "text-slate-600", bg: "bg-slate-50" },
           { label: "Deployments", val: surveys.filter(s => s.status === "Active").length, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
           { label: "Avg Fidelity", val: `${stats.avgResponses}`, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
           { label: "Security", val: "Verified", icon: Database, color: "text-blue-600", bg: "bg-blue-50" },
         ].map(kpi => (
           <div key={kpi.label} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl shadow-sm group hover:shadow-md transition-all">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", kpi.bg, kpi.color)}>
                <kpi.icon className="w-4 h-4" />
              </div>
              <div>
                 <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                 <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight">{kpi.val}</div>
              </div>
           </div>
         ))}
      </div>

      {/* ── Registry Table ── */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white border border-slate-100">
        <div className="px-4 py-2.5 border-b border-slate-50 flex items-center justify-between gap-4 bg-slate-50/40">
           <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 border border-slate-200">
                <Filter className="w-3 h-3" />
              </div>
              <h3 className="text-xs font-bold tracking-tight text-slate-900">Campaign Registry</h3>
           </div>
           <div className="relative flex-1 sm:w-80 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter campaigns by name or UID..." 
                className="h-9 pl-10 rounded-xl border-slate-200 bg-white text-xs shadow-none focus:ring-1 focus:ring-primary/10 transition-all" 
              />
           </div>
        </div>
        <CardContent className="p-0">
          <DataTable
            data={filteredSurveys}
            columns={columns}
            pageSize={10}
            loading={loading}
            emptyMessage={lang === "th" ? "ไม่พบแคมเปญ" : "Registry is empty."}
            keyExtractor={(s) => s.id}
          />
        </CardContent>
      </Card>

      {/* ── Decommission Alert ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px]">
           <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
              <Trash2 className="w-6 h-6" />
           </div>
           <div className="space-y-1">
              <AlertDialogTitle className="text-base font-bold tracking-tight">Confirm Purge?</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                 Permanent decommissioning protocol will be initiated.
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

      <div className="flex flex-wrap items-center justify-center gap-6 opacity-20 pt-4">
        <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
          <ShieldCheck className="w-3 h-3" />
          Verified Protocol
        </div>
        <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
          <Terminal className="w-3 h-3" />
          Node 2.4-STABLE
        </div>
      </div>
    </div>
  );
}

export default SurveysAdmin;
