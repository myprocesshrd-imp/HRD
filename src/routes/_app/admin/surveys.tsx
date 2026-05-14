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
      <DialogContent className="sm:max-w-md rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                 <Layers className="w-4 h-4" />
              </div>
              <div>
                 <DialogTitle className="text-lg font-bold">Linked Nodes</DialogTitle>
                 <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{resolved.length} Logical Units Mapping</span>
              </div>
           </div>
        </DialogHeader>
        <div className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[70vh]">
            <div className="p-4 space-y-2">
              {resolved.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary/20 dark:hover:border-primary/50 hover:bg-white dark:hover:bg-slate-800 transition-all group shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary font-bold text-sm border border-slate-100 dark:border-slate-700 shrink-0 shadow-sm">
                      {r.id}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug">{r.title}</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Registry ID: {r.id}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="h-7 rounded-lg px-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold text-[11px] uppercase">
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

  const totalQuestions = useMemo(() => {
    if (!editing) return 0;
    return editing.sectionIds.reduce((acc, id) => {
      const sec = sections.find(s => s.id === id);
      return acc + (sec?.questions.length || 0);
    }, 0);
  }, [editing, sections]);

  const columns: ColumnConfig<MockSurvey>[] = [
    {
      key: "titleTh",
      header: (
        <span className="text-slate-900 dark:text-white">
          {lang === "th" ? "ชื่อแบบสำรวจ" : "Campaign Identifier"}
        </span>
      ),
      sortable: true,
      className: "min-w-[250px]",
      render: (s: MockSurvey) => (
        <div className="flex items-center gap-4 py-3 group/item">
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center shrink-0 transition-all shadow-sm">
             <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase leading-none tracking-widest">UID</span>
             <span className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{s.id.slice(-4).toUpperCase()}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-bold text-slate-900 dark:text-white text-[15px] truncate leading-tight">
              {lang === "th" ? s.titleTh : s.titleEn}
            </div>
            <div className="flex items-center gap-3.5 mt-1.5">
               <Badge variant="outline" className="h-5.5 px-2.5 rounded-lg text-[10px] border-primary/20 text-primary font-bold uppercase bg-primary/5">
                 {s.surveyType}
               </Badge>
               <button 
                  onClick={() => setSectionModalSurvey(s)}
                  className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2"
                >
                 <Layers className="w-3.5 h-3.5" /> {s.sectionIds.length} Nodes 
                 <span className="text-slate-300">/</span>
                 <span className="text-primary/70">{s.sectionIds.reduce((acc, id) => acc + (sections.find(sec => sec.id === id)?.questions.length || 0), 0)} Units</span>
               </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: <span className="text-slate-900 dark:text-white">Status</span>,
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
            "h-10 w-full rounded-xl text-[11px] font-bold uppercase tracking-wider shadow-sm",
            s.status === "Active" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50" : 
            s.status === "Closed" ? "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-700" : 
            "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50"
          )}>
            <div className="flex items-center gap-2.5">
              <div className={cn("w-2.5 h-2.5 rounded-full", s.status === "Active" ? "bg-emerald-500 animate-pulse" : s.status === "Closed" ? "bg-slate-300 dark:bg-slate-600" : "bg-amber-500")} />
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
      header: <span className="text-slate-900 dark:text-white">Fidelity</span>,
      sortable: true,
      className: "w-[160px]",
      render: (s) => {
        const pct = s.target ? Math.round((s.responses / s.target) * 100) : 0;
        return (
          <div className="space-y-1.5 py-1 pr-4">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s.responses} / {s.target}</span>
               <span className="text-[11px] font-bold tabular-nums text-slate-600 dark:text-slate-300">{pct}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
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
        <div className="flex items-center justify-end gap-2.5">
          <Button 
            variant="outline" size="icon" 
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm bg-white dark:bg-slate-800"
            onClick={() => { setEditing({ ...s }); setDialogOpen(true); }}
          >
            <Pencil className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" size="icon" 
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all shadow-sm bg-white dark:bg-slate-800" 
            onClick={() => setPreviewTarget(s)}
          >
            <Eye className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" size="icon" 
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-slate-300 hover:text-slate-600 transition-all shadow-sm bg-white dark:bg-slate-800"
            onClick={() => handleClone(s.id)} 
            disabled={saving}
          >
            <Copy className="w-5 h-5" />
          </Button>
          <Button 
            variant="outline" size="icon" 
            className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all shadow-sm bg-white dark:bg-slate-800"
            onClick={() => setDeleteTarget(s.id)}
          >
            <Trash2 className="w-5 h-5" />
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

      <div className="flex items-center justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Surveys</h1>
          <p className="text-[15px] font-medium text-slate-400">
            {lang === "th" ? "จัดการแคมเปญแบบสำรวจความผูกพัน" : "Orchestrate engagement campaigns and insights."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => { setEditing({ id: "", titleEn: "", titleTh: "", status: "Draft", surveyType: "identified", startDate: "", endDate: "", responses: 0, target: 0, sectionIds: [] }); }}
                size="lg"
                className="h-12 px-9 rounded-2xl bg-slate-900 text-white font-bold text-[13px] uppercase tracking-wider shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
              >
                <Plus className="w-5 h-5 mr-2.5" /> Create Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none">
              <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Binary className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {editing?.id ? "Modify Campaign" : "New Strategic Campaign"}
                    </DialogTitle>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">System Protocol v2.4</span>
                  </div>
                </div>
              </DialogHeader>

              {editing && (
                <ScrollArea className="max-h-[65vh]">
                  <div className="p-5 space-y-5">
                    {/* Basic Info */}
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title (Thai)</Label>
                         <Input value={editing.titleTh} onChange={(e) => setEditing({...editing, titleTh: e.target.value})} className="h-10 px-3.5 rounded-lg border-slate-200 text-sm font-bold" />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">Title (English)</Label>
                         <Input value={editing.titleEn} onChange={(e) => setEditing({...editing, titleEn: e.target.value})} className="h-10 px-3.5 rounded-lg border-slate-200 text-sm font-bold" />
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
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Linked Content Nodes</Label>
                        <div className="flex items-center gap-2 px-2.5 h-6 rounded-lg bg-primary/10 border border-primary/20">
                          <span className="text-[10px] font-bold text-primary uppercase">Total: {totalQuestions} Units</span>
                        </div>
                      </div>
                       <div className="grid grid-cols-1 gap-2.5">
                         {sections.map(sec => {
                           const checked = editing.sectionIds.includes(sec.id);
                           return (
                             <div 
                                key={sec.id}
                                onClick={() => toggleSection(sec.id)} 
                                className={cn(
                                  "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-4 group", 
                                  checked ? "bg-primary/[0.03] border-primary/30 ring-1 ring-primary/10" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 shadow-sm"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border transition-all shadow-sm", 
                                  checked ? "bg-primary text-white border-primary/20" : "bg-slate-50 text-slate-400 border-slate-100"
                                )}>
                                  {sec.id}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={cn("text-[13px] font-bold leading-snug", checked ? "text-primary" : "text-slate-900")}>{lang === "th" ? sec.titleTh : sec.titleEn}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{sec.questions.length} Units</div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Checkbox checked={checked} onCheckedChange={() => toggleSection(sec.id)} className="h-5 w-5 rounded-md" />
                                </div>
                             </div>
                           )
                         })}
                       </div>
                    </div>
                  </div>
                </ScrollArea>
              )}

              <DialogFooter className="p-4 px-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="px-5 h-9 rounded-xl font-bold text-[11px] text-slate-400 uppercase">Cancel</Button>
                <Button onClick={handleSave} disabled={saving} size="sm" className="px-7 h-9 rounded-xl bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                   {saving ? "Processing..." : "Sync Campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
         {[
           { label: "Campaigns", val: surveys.length, icon: ClipboardList, color: "text-slate-600", bg: "bg-slate-50" },
           { label: "Deployments", val: surveys.filter(s => s.status === "Active").length, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
           { label: "Avg Fidelity", val: `${stats.avgResponses}`, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
           { label: "Security", val: "Verified", icon: Database, color: "text-blue-600", bg: "bg-blue-50" },
         ].map(kpi => (
           <div key={kpi.label} className="flex items-center gap-5 p-5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm group hover:shadow-md transition-all">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm", kpi.bg, kpi.color)}>
                <kpi.icon className="w-5.5 h-5.5" />
              </div>
              <div>
                 <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                 <div className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{kpi.val}</div>
              </div>
           </div>
         ))}
      </div>

      {/* ── Registry Table ── */}
      <Card className="border-none shadow-sm rounded-xl overflow-hidden bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-800/30">
           <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                <Filter className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">Campaign Registry</h3>
           </div>
           <div className="relative flex-1 sm:w-96 max-w-md">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter campaigns by name or UID..." 
                className="h-11 pl-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[14px] shadow-none focus:ring-1 focus:ring-primary/10 transition-all" 
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
        <AlertDialogContent className="rounded-xl border-none shadow-2xl p-5 text-center flex flex-col items-center gap-4 max-w-[320px] bg-white dark:bg-slate-900">
           <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
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
