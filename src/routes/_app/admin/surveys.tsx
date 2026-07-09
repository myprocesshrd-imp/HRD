import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { getSurveys, getQuestionBank, createSurvey, updateSurvey, deleteSurvey, cloneSurvey, getDemographicsConstants } from "@/services/api";
import { SurveyAuditLogDialog } from "@/components/admin/survey-audit-log-dialog";
import type { MockSurvey } from "@/services/api";
import type { SurveySection } from "@/services/api";
import { getSssMappings } from "@/services/api/sss";
import type { SssQuestionMapping } from "@/services/api/sss";
import { getDepartmentsWithId } from "@/services/api/departments";
import { getBusinessUnits } from "@/services/api/business-units";
import type { Department } from "@/services/api/departments";
import type { BusinessUnit } from "@/services/api/business-units";
import { DEMOGRAPHIC_FIELDS_REGISTRY } from "@/lib/mock-data";
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
  Globe, Activity, Filter, Database, Clock, Target, ArrowRight, ChevronDown, ChevronRight, UserPlus, History
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
  const { t } = useI18n();
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
                 <DialogTitle className="text-lg font-bold">{t("surveys.linkedNodes")}</DialogTitle>
                 <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{resolved.length} {t("surveys.logicalUnits")}</span>
              </div>
           </div>
        </DialogHeader>
        <div className="p-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[70vh]">
            <div className="p-4 space-y-2">
              {resolved.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 px-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary/20 dark:hover:border-primary/50 hover:bg-white dark:hover:bg-slate-800 transition-all group shadow-sm">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn(
                       "h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-primary font-bold border border-slate-100 dark:border-slate-700 shrink-0 shadow-sm px-2",
                       r.id.length > 5 ? "text-[9px] min-w-10 max-w-[90px] break-all leading-tight text-center" : "text-sm w-10"
                    )}>
                      {r.id}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold text-slate-900 dark:text-white leading-snug">{r.title}</div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{t("surveys.registryId")}{r.id}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="h-7 rounded-lg px-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-bold text-[11px] uppercase">
                    {r.qCount} {t("surveys.units")}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-end">
           <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs uppercase tracking-wider" onClick={onClose}>{t("surveys.closeRegistry")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SurveysAdmin() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [sections, setSections] = useState<SurveySection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<MockSurvey | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<MockSurvey | null>(null);
  const [sectionModalSurvey, setSectionModalSurvey] = useState<MockSurvey | null>(null);
  const [auditLogSurvey, setAuditLogSurvey] = useState<MockSurvey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDemo, setExpandedDemo] = useState<Record<string, boolean>>({});
  const [demoConstants, setDemoConstants] = useState<Record<string, string[]>>({});
  const [departmentsWithBu, setDepartmentsWithBu] = useState<Department[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [sssMappings, setSssMappings] = useState<Map<string, SssQuestionMapping[]>>(new Map());

  const buildDefaultDemoFields = () => {
    const fields: Record<string, string[]> = {};
    DEMOGRAPHIC_FIELDS_REGISTRY.forEach(f => {
      const demoKey = f.key === "department" ? "departments" : f.key;
      const source = demoConstants[demoKey] && demoConstants[demoKey].length > 0
        ? demoConstants[demoKey]
        : f.masterOptions;
      fields[f.key] = [...source];
    });
    return fields;
  };

  const buNameToIdMap = useMemo(() => {
    const map = new Map<string, string>();
    businessUnits.forEach(bu => map.set(bu.name_en, bu.id));
    return map;
  }, [businessUnits]);

  const deptNamesByBuId = useMemo(() => {
    const map = new Map<string, string[]>();
    departmentsWithBu.forEach(d => {
      const ids = d.business_unit_ids ?? [];
      ids.forEach(buId => {
        const existing = map.get(buId) ?? [];
        existing.push(d.name_en);
        map.set(buId, existing);
      });
    });
    return map;
  }, [departmentsWithBu]);

  const isAdmin = user?.role === "super_admin" || user?.role === "hr_admin";

  useEffect(() => {
    Promise.all([
      getSurveys(),
      getQuestionBank(),
      getDemographicsConstants(),
      getSssMappings(),
      getDepartmentsWithId(),
      getBusinessUnits()
    ]).then(([s, q, c, sss, deps, bus]) => {
      setSurveys(s);
      setSections(q);
      setDemoConstants({
        departments: c.departments,
        businessUnit: c.businessUnits,
        location: c.locations,
        level: c.levels,
        gender: c.genders,
        ageRange: c.ageRanges,
        tenure: c.tenure,
      });
      setDepartmentsWithBu(deps);
      setBusinessUnits(bus);
      const map = new Map<string, SssQuestionMapping[]>();
      sss.filter((m: SssQuestionMapping) => m.isActive).forEach((m: SssQuestionMapping) => {
        const existing = map.get(m.questionId) || [];
        existing.push(m);
        map.set(m.questionId, existing);
      });
      setSssMappings(map);
    }).finally(() => setLoading(false));
  }, []);

  // Sync department options when BU selection changes
  useEffect(() => {
    if (!editing?.demographicFields?.businessUnit || !editing?.demographicFields?.department) return;
    const selBuNames = editing.demographicFields.businessUnit;
    const selBuIds = selBuNames.map((b: string) => buNameToIdMap.get(b)).filter((id): id is string => !!id);
    const validDepts = new Set<string>();
    selBuIds.forEach(buId => {
      (deptNamesByBuId.get(buId) ?? []).forEach(d => validDepts.add(d));
    });
    const newDepts = Array.from(validDepts);
    if (newDepts.length !== editing.demographicFields.department.length) {
      setEditing(prev => {
        if (!prev) return prev;
        return { ...prev, demographicFields: { ...prev.demographicFields!, department: newDepts } };
      });
    }
  }, [editing?.demographicFields?.businessUnit]);

  const handleSave = async () => {
    if (!editing) return;
    if (editing.sectionIds.length === 0) {
      toast.error(t("surveys.selectMinSection"));
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
      toast.success(t("surveys.saveSuccess"));
    } catch (err) {
      console.error("Failed to save survey:", err);
      toast.error(t("surveys.saveError"));
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
      toast.success(t("surveys.deleteSuccess"));
    } catch {
      toast.error(t("surveys.deleteError"));
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
      toast.success(t("surveys.cloneSuccess"));
    } catch {
      toast.error(t("surveys.cloneError"));
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

  const toggleDemoField = (fieldKey: string, masterOptions: readonly string[]) => {
    if (!editing) return;
    setEditing(prev => {
      if (!prev) return prev;
      const prevDemo = prev.demographicFields;
      // If undefined, it means "all fields all options" by default. If we toggle, we should explicitly construct it.
      let currentDemo = prevDemo;
      if (!currentDemo) {
        currentDemo = {};
        DEMOGRAPHIC_FIELDS_REGISTRY.forEach(f => {
          currentDemo![f.key] = [...f.masterOptions];
        });
      }
      const newDemo = { ...currentDemo };
      if (newDemo[fieldKey]) {
        delete newDemo[fieldKey];
      } else {
        newDemo[fieldKey] = [...masterOptions];
      }
      return { ...prev, demographicFields: newDemo };
    });
  };

  const toggleDemoOption = (fieldKey: string, option: string) => {
    if (!editing) return;
    setEditing(prev => {
      if (!prev) return prev;
      const currentDemo = prev.demographicFields;
      if (!currentDemo || !currentDemo[fieldKey]) return prev;
      const newDemo = { ...currentDemo };
      const opts = newDemo[fieldKey];
      if (opts.includes(option)) {
        newDemo[fieldKey] = opts.filter(o => o !== option);
      } else {
        newDemo[fieldKey] = [...opts, option];
      }
      return { ...prev, demographicFields: newDemo };
    });
  };

  const setAllDemoOptions = (fieldKey: string, masterOptions: readonly string[], selectAll: boolean) => {
    if (!editing) return;
    setEditing(prev => {
      if (!prev) return prev;
      const currentDemo = prev.demographicFields;
      if (!currentDemo || !currentDemo[fieldKey]) return prev;
      const newDemo = { ...currentDemo };
      newDemo[fieldKey] = selectAll ? [...masterOptions] : [];
      return { ...prev, demographicFields: newDemo };
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
          {t("surveys.campaignIdentifier")}
        </span>
      ),
      sortable: true,
      className: "min-w-[250px]",
      render: (s: MockSurvey) => (
        <div className="flex items-center gap-4 py-3 group/item">
          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0 transition-all shadow-sm">
             <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-bold text-slate-900 dark:text-white text-[15px] truncate leading-tight">
              {lang === "th" ? s.titleTh : s.titleEn}
            </div>
            <div className="flex items-center gap-3.5 mt-1.5 flex-wrap">
               <Badge variant="outline" className="h-5.5 px-2.5 rounded-lg text-[10px] border-primary/20 text-primary font-bold uppercase bg-primary/5">
                  {s.surveyType === "anonymous" ? t("surveys.typeAnonymous") : t("surveys.typeIdentified")}
                </Badge>
               <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                 <Users className="w-3.5 h-3.5" />
                 {lang === "th"
                   ? `${t("surveys.createdBy")}: ${s.creatorNameTh || t("surveys.system")}`
                   : `${t("surveys.createdBy")}: ${s.creatorNameEn || t("surveys.system")}`}
               </span>
               {(s.editorNameEn || s.editorNameTh) && (
                 <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                   <Edit3 className="w-3.5 h-3.5" />
                   {lang === "th"
                     ? `${t("surveys.updatedBy")}: ${s.editorNameTh || s.editorNameEn || t("surveys.auditUnknown")}`
                     : `${t("surveys.updatedBy")}: ${s.editorNameEn || s.editorNameTh || t("surveys.auditUnknown")}`}
                 </span>
               )}
               {s.updatedAt && s.updatedAt !== "—" && (
                 <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                   <Clock className="w-3.5 h-3.5 text-slate-450" />
                   {(() => {
                     try {
                       return new Date(s.updatedAt).toLocaleString(lang === "th" ? "th-TH" : "en-GB", {
                         day: "2-digit", month: "short", year: "numeric",
                         hour: "2-digit", minute: "2-digit"
                       });
                     } catch {
                       return s.updatedAt;
                     }
                   })()}
                 </span>
               )}
               <button 
                  onClick={() => setSectionModalSurvey(s)}
                  className="text-[11px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2"
                >
                 <Layers className="w-3.5 h-3.5" /> {s.sectionIds.length} {t("surveys.nodes")}
                 <span className="text-slate-300">/</span>
                 <span className="text-primary/70">{s.sectionIds.reduce((acc, id) => acc + (sections.find(sec => sec.id === id)?.questions.length || 0), 0)} {t("surveys.units")}</span>
               </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: <span className="text-slate-900 dark:text-white">{t("surveys.status")}</span>,
      sortable: true,
      className: "w-[120px]",
      render: (s) => {
        return (
          <Select
            disabled={!isAdmin}
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
              s.status === "Closed" ? "bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:bg-slate-500 border-slate-100 dark:border-slate-700" : 
              "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800/50"
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn("w-2.5 h-2.5 rounded-full", s.status === "Active" ? "bg-emerald-500 animate-pulse" : s.status === "Closed" ? "bg-slate-300 dark:bg-slate-600" : "bg-amber-500")} />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl p-1.5">
              <SelectItem value="Draft" className="h-10 rounded-lg text-xs font-bold uppercase">{t("surveys.statusDraft")}</SelectItem>
              <SelectItem value="Active" className="h-10 rounded-lg text-xs font-bold uppercase">{t("surveys.statusActive")}</SelectItem>
              <SelectItem value="Closed" className="h-10 rounded-lg text-xs font-bold uppercase">{t("surveys.statusClosed")}</SelectItem>
            </SelectContent>
          </Select>
        );
      },
    },
    {
      key: "responses",
      header: <span className="text-slate-900 dark:text-white">{t("surveys.fidelity")}</span>,
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
      className: "text-right w-[200px]",
      render: (s) => {
        return (
          <div className="flex items-center justify-end gap-2.5">
            <Button 
              variant="outline" size="icon" 
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-slate-400 hover:text-primary transition-all shadow-sm bg-white dark:bg-slate-800"
              disabled={!isAdmin}
              onClick={() => { 
                setEditing({ 
                  ...s, 
                  demographicFields: s.demographicFields || buildDefaultDemoFields() 
                }); 
                setDialogOpen(true); 
              }}
            >
              <Pencil className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" size="icon" 
              title={t("surveys.viewAuditLog")}
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all shadow-sm bg-white dark:bg-slate-800" 
              onClick={() => setAuditLogSurvey(s)}
            >
              <History className="w-5 h-5" />
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
              disabled={!isAdmin || saving}
            >
              <Copy className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline" size="icon" 
              className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 text-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all shadow-sm bg-white dark:bg-slate-800"
              disabled={!isAdmin}
              onClick={() => setDeleteTarget(s.id)}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t("surveys.syncing")}</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      
      {sectionModalSurvey && <SectionsModal sections={sections} sectionIds={sectionModalSurvey.sectionIds} lang={lang} onClose={() => setSectionModalSurvey(null)} />}
      {previewTarget && <PreviewSurveyDialog survey={previewTarget} onClose={() => setPreviewTarget(null)} />}
      {auditLogSurvey && <SurveyAuditLogDialog survey={auditLogSurvey} onClose={() => setAuditLogSurvey(null)} />}

      <div className="flex items-start justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-blue-500 to-amber-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{t("surveys.title")}</h1>
          </div>
          <p className="text-[15px] font-medium text-slate-400 ml-13">
            {t("surveys.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            if (!open) setDialogOpen(false);
          }}>
            <Button 
              onClick={() => { 
                setEditing({ id: "", titleEn: "", titleTh: "", status: "Draft", surveyType: "anonymous", startDate: "", endDate: "", responses: 0, target: 0, sectionIds: [], demographicFields: buildDefaultDemoFields() }); 
                setDialogOpen(true);
              }}
              size="lg"
              className="h-12 px-9 rounded-2xl bg-slate-900 text-white font-bold text-[13px] uppercase tracking-wider shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all"
            >
              <Plus className="w-5 h-5 mr-2.5" /> {t("surveys.createBtn")}
            </Button>
            <DialogContent className="sm:max-w-2xl rounded-xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-none">
              <DialogHeader className="p-4 bg-slate-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Binary className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold">
                      {editing?.id ? t("surveys.editTitle") : t("surveys.createTitle")}
                    </DialogTitle>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t("surveys.systemProtocol")}</span>
                  </div>
                </div>
              </DialogHeader>

              {editing && (
                <ScrollArea className="max-h-[65vh]">
                  <div className="p-5 space-y-5">
                    {/* Basic Info */}
                    <div className="space-y-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.titleTh")}</Label>
                         <Input value={editing.titleTh} onChange={(e) => setEditing({...editing, titleTh: e.target.value})} className="h-10 px-3.5 rounded-lg border-slate-200 text-sm font-bold" />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.titleEn")}</Label>
                         <Input value={editing.titleEn} onChange={(e) => setEditing({...editing, titleEn: e.target.value})} className="h-10 px-3.5 rounded-lg border-slate-200 text-sm font-bold" />
                       </div>
                    </div>

                    {/* Operational */}
                    <div className="grid grid-cols-3 gap-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.status")}</Label>
                         <Select value={editing.status} onValueChange={(v) => setEditing({...editing, status: v as any})}>
                            <SelectTrigger className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg">
                               <SelectItem value="Active" className="text-xs font-semibold">{t("surveys.statusActive")}</SelectItem>
                               <SelectItem value="Closed" className="text-xs font-semibold">{t("surveys.statusClosed")}</SelectItem>
                               <SelectItem value="Draft" className="text-xs font-semibold">{t("surveys.statusDraft")}</SelectItem>
                            </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.surveyType")}</Label>
                         <Select value={editing.surveyType} onValueChange={(v) => setEditing({...editing, surveyType: v as any})}>
                            <SelectTrigger className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold"><SelectValue /></SelectTrigger>
                            <SelectContent className="rounded-lg">
                               <SelectItem value="identified" className="text-xs font-semibold">{t("surveys.typeIdentified")}</SelectItem>
                               <SelectItem value="anonymous" className="text-xs font-semibold">{t("surveys.typeAnonymous")}</SelectItem>
                            </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.target")}</Label>
                         <Input type="number" value={editing.target} onChange={(e) => setEditing({...editing, target: Number(e.target.value)})} className="h-9 px-3.5 rounded-lg border-slate-200 text-xs font-bold" />
                       </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.startDate")}</Label>
                         <Input type="date" value={editing.startDate} onChange={(e) => setEditing({...editing, startDate: e.target.value})} className="h-9 px-3.5 rounded-lg border-slate-200 font-bold text-[10px]" />
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-400 ml-1">{t("surveys.endDate")}</Label>
                         <Input type="date" value={editing.endDate} onChange={(e) => setEditing({...editing, endDate: e.target.value})} className="h-9 px-3.5 rounded-lg border-slate-200 font-bold text-[10px]" />
                       </div>
                    </div>

                    {/* Content Nodes */}
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{t("surveys.sections")}</Label>
                        <div className="flex items-center gap-2 px-2.5 h-6 rounded-lg bg-primary/10 border border-primary/20">
                          <span className="text-[10px] font-bold text-primary uppercase">{t("surveys.totalQ")} {totalQuestions} {t("surveys.units")}</span>
                        </div>
                      </div>
                       <div className="grid grid-cols-1 gap-2.5">
                          {sections.map(sec => {
                            const checked = editing.sectionIds.includes(sec.id);
                            const sssCount = sec.questions.filter(q => sssMappings.has(q.id)).length;
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
                                  "h-10 rounded-lg flex items-center justify-center font-bold shrink-0 border transition-all shadow-sm px-2", 
                                  checked ? "bg-primary text-white border-primary/20" : "bg-slate-50 text-slate-400 border-slate-100",
                                  sec.id.length > 5 ? "text-[9px] min-w-10 max-w-[90px] break-all leading-tight text-center" : "text-sm w-10"
                                )}>
                                  {sec.id}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className={cn("text-[13px] font-bold leading-snug", checked ? "text-primary" : "text-slate-900")}>{lang === "th" ? sec.titleTh : sec.titleEn}</div>
                                  <div className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{sec.questions.length} {t("surveys.units")}</div>
                                  {sssCount > 0 && (
                                    <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                                      <Target className="w-3 h-3" />
                                      <span>{sssCount} SSS</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                  <Checkbox checked={checked} onCheckedChange={() => toggleSection(sec.id)} className="h-5 w-5 rounded-md" />
                                </div>
                             </div>
                           )
                         })}
                       </div>
                    </div>

                    {/* Personnel Mapping Configuration (For Anonymous Only) */}
                    {editing.surveyType === "anonymous" && (
                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-center gap-2 px-1">
                          <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <UserPlus className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <Label className="text-[11px] font-bold uppercase tracking-widest text-slate-800">{t("surveys.personnelMapping")}</Label>
                            <p className="text-[10px] text-slate-400">{t("surveys.personnelMappingDesc")}</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {DEMOGRAPHIC_FIELDS_REGISTRY.map(f => {
                            const demoKey = f.key === "department" ? "departments" : f.key;
                            const options = demoConstants[demoKey] && demoConstants[demoKey].length > 0
                              ? demoConstants[demoKey]
                              : f.masterOptions;

                            // Filter department options by selected business units
                            const displayOptions = f.key === "department" && editing.demographicFields?.businessUnit?.length
                              ? options.filter((o: string) => {
                                  const selBuIds = editing.demographicFields!.businessUnit
                                    .map((b: string) => buNameToIdMap.get(b))
                                    .filter((id: string | undefined): id is string => !!id);
                                  return selBuIds.some((buId: string) => (deptNamesByBuId.get(buId) ?? []).includes(o));
                                })
                              : options;

                            const isChecked = !editing.demographicFields || f.key in editing.demographicFields;
                            const isExpanded = !!expandedDemo[f.key];
                            const selectedOpts = editing.demographicFields ? editing.demographicFields[f.key] || [] : [...displayOptions];
                            
                            return (
                              <div key={f.key} className={cn("rounded-xl border transition-all overflow-hidden", isChecked ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100")}>
                                <div className="flex items-center gap-3 p-3 select-none">
                                  <Checkbox 
                                    checked={isChecked} 
                                    onCheckedChange={() => toggleDemoField(f.key, displayOptions)} 
                                    className="h-5 w-5 rounded-md data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600" 
                                  />
                                  <div className={cn("flex-1 text-[13px] font-bold", isChecked ? "text-slate-800" : "text-slate-400")}>
                                    {lang === "th" ? f.labelTh : f.labelEn}
                                  </div>
                                  {isChecked && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700" 
                                      onClick={() => setExpandedDemo(prev => ({ ...prev, [f.key]: !isExpanded }))}
                                    >
                                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </Button>
                                  )}
                                </div>
                                {isChecked && isExpanded && (
                                  <div className="bg-slate-50 border-t border-slate-100 p-3 pt-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("surveys.options")} ({selectedOpts.length}/{displayOptions.length})</span>
                                      <div className="flex items-center gap-2">
                                        <button onClick={() => setAllDemoOptions(f.key, displayOptions, true)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">{t("surveys.selectAll")}</button>
                                        <span className="text-slate-300">|</span>
                                        <button onClick={() => setAllDemoOptions(f.key, displayOptions, false)} className="text-[10px] font-bold text-slate-500 hover:text-slate-700">{t("surveys.deselectAll")}</button>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {displayOptions.map(opt => (
                                        <label key={opt} className="flex items-start gap-2 cursor-pointer group">
                                          <Checkbox 
                                            checked={selectedOpts.includes(opt)}
                                            onCheckedChange={() => toggleDemoOption(f.key, opt)}
                                            className="h-4 w-4 rounded mt-0.5 border-slate-300 group-hover:border-indigo-400 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                          />
                                          <span className="text-[11px] leading-tight text-slate-600">{opt}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}

              <DialogFooter className="p-4 px-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)} className="px-5 h-9 rounded-xl font-bold text-[11px] text-slate-400 uppercase">{t("common.cancel")}</Button>
                <Button onClick={handleSave} disabled={saving} size="sm" className="px-7 h-9 rounded-xl bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                   {saving ? t("surveys.saving") : t("surveys.saveBtn")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Status Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
         {[
           { label: t("surveys.kpiCampaigns"), val: surveys.length, icon: ClipboardList, color: "text-slate-600", bg: "bg-slate-50" },
           { label: t("surveys.kpiActive"), val: surveys.filter(s => s.status === "Active").length, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
           { label: t("surveys.kpiAvgResponse"), val: `${stats.avgResponses}`, icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
           { label: t("surveys.kpiSecurity"), val: t("surveys.kpiVerified"), icon: Database, color: "text-blue-600", bg: "bg-blue-50" },
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
              <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">{t("surveys.campaignRegistry")}</h3>
           </div>
           <div className="relative flex-1 sm:w-96 max-w-md">
              <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("surveys.searchPlaceholder")} 
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
            emptyMessage={t("surveys.noData")}
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
              <AlertDialogTitle className="text-base font-bold tracking-tight">{t("surveys.deleteConfirm")}</AlertDialogTitle>
              <AlertDialogDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
                 {t("surveys.deleteDesc")}
              </AlertDialogDescription>
           </div>
           <div className="flex gap-2 w-full pt-2">
              <AlertDialogCancel className="flex-1 h-8 rounded-lg font-bold text-[9px] uppercase tracking-wider border-slate-200">{t("surveys.deleteAbort")}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteTarget && handleDelete(deleteTarget)} 
                className="flex-1 h-8 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-bold text-[9px] uppercase tracking-wider shadow-lg shadow-rose-600/20"
              >
                {t("surveys.deleteConfirmBtn")}
              </AlertDialogAction>
           </div>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-wrap items-center justify-center gap-6 opacity-20 pt-4">
        <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
          <ShieldCheck className="w-3 h-3" />
          {t("surveys.verifiedProtocol")}
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
