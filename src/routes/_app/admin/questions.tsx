import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { useI18n } from "@/lib/i18n";
import { QUESTION_BANK, type Question, type QuestionType, type QuestionChoice } from "@/lib/mock-data";
import type { SurveySection } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Pencil, GripVertical, ListChecks, Search, Trash2, Copy, ChevronDown, ChevronRight, FolderPlus, MoveRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/questions")({
  component: QuestionsAdmin,
});

// ── Constants ──
const QUESTION_TYPES: { value: QuestionType; labelEn: string; labelTh: string; icon: string }[] = [
  { value: "rating", labelEn: "Rating (1-5)", labelTh: "ให้คะแนน (1-5)", icon: "★" },
  { value: "single_select", labelEn: "Single Select", labelTh: "เลือก 1 ตัวเลือก", icon: "◎" },
  { value: "multiple_select", labelEn: "Multiple Select", labelTh: "เลือกหลายตัวเลือก", icon: "☐" },
  { value: "open_text_short", labelEn: "Short Text", labelTh: "ข้อความสั้น", icon: "―" },
  { value: "open_text_long", labelEn: "Long Text", labelTh: "ข้อความยาว", icon: "≡" },
  { value: "binary", labelEn: "Yes/No", labelTh: "ใช่/ไม่ใช่", icon: "⬤" },
  { value: "nps", labelEn: "NPS (0-10)", labelTh: "NPS (0-10)", icon: "⑩" },
  { value: "matrix", labelEn: "Matrix / Grid", labelTh: "ตารางหลายแถว", icon: "⊞" },
];

const TYPE_ICONS: Record<string, string> = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t.icon]));

// ── Question form state ──
interface QuestionForm {
  textEn: string;
  textTh: string;
  descEn: string;
  descTh: string;
  type: QuestionType;
  required: boolean;
  category: string;
  minValue: number;
  maxValue: number;
  choices: { key: string; value: string; labelEn: string; labelTh: string }[];
  rows: { key: string; textEn: string; textTh: string }[];
  columns: { key: string; value: string; labelEn: string; labelTh: string }[];
  minChoices: number;
  maxChoices: number;
}

function emptyForm(type: QuestionType = "rating"): QuestionForm {
  return {
    textEn: "", textTh: "", descEn: "", descTh: "",
    type, required: true, category: "",
    minValue: 1, maxValue: 5,
    choices: [{ key: "c1", value: "1", labelEn: "Option 1", labelTh: "ตัวเลือก 1" }],
    rows: [{ key: "r1", textEn: "Row 1", textTh: "แถว 1" }],
    columns: [{ key: "c1", value: "1", labelEn: "1", labelTh: "1" }],
    minChoices: 0, maxChoices: 0,
  };
}

function formFromQuestion(q: Question): QuestionForm {
  return {
    textEn: q.textEn, textTh: q.textTh,
    descEn: q.descEn ?? "", descTh: q.descTh ?? "",
    type: q.type, required: q.required ?? true,
    category: q.category ?? "",
    minValue: q.minValue ?? 1, maxValue: q.maxValue ?? 5,
    choices: (q.choices ?? []).map((c, i) => ({ key: `c${i}`, ...c })),
    rows: (q.rows ?? []).map((r, i) => ({ key: `r${i}`, textEn: r, textTh: q.rowsTh?.[i] ?? r })),
    columns: (q.columns ?? []).map((c, i) => ({ key: `c${i}`, ...c })),
    minChoices: q.minChoices ?? 0, maxChoices: q.maxChoices ?? 0,
  };
}

function formToQuestion(form: QuestionForm, sectionId: string, existingId?: string): Question {
  const base: Question = {
    id: existingId ?? `${sectionId}${Date.now()}`,
    type: form.type,
    textEn: form.textEn, textTh: form.textTh,
    descEn: form.descEn || undefined,
    descTh: form.descTh || undefined,
    required: form.required,
    category: form.category || undefined,
  };
  if (form.type === "rating") {
    base.minValue = form.minValue;
    base.maxValue = form.maxValue;
  }
  if (form.type === "single_select" || form.type === "multiple_select") {
    base.choices = form.choices.map((c) => ({ value: c.value, labelEn: c.labelEn, labelTh: c.labelTh }));
    if (form.minChoices > 0) base.minChoices = form.minChoices;
    if (form.maxChoices > 0) base.maxChoices = form.maxChoices;
  }
  if (form.type === "matrix") {
    base.rows = form.rows.map((r) => r.textEn);
    base.rowsTh = form.rows.map((r) => r.textTh);
    base.columns = form.columns.map((c) => ({ value: c.value, labelEn: c.labelEn, labelTh: c.labelTh }));
  }
  return base;
}

// ── Sortable Drag Handle ──
function DragHandle() {
  return (
    <button className="cursor-grab active:cursor-grabbing touch-none p-0.5 rounded hover:bg-muted transition-colors">
      <GripVertical className="w-4 h-4 text-muted-foreground/60" />
    </button>
  );
}

// ── Sortable Question Row ──
function SortableQuestionRow({
  question,
  index,
  sectionId,
  sectionCount,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveToSection,
  lang,
  sections,
}: {
  question: Question;
  index: number;
  sectionId: string;
  sectionCount: number;
  onEdit: (q: Question) => void;
  onDuplicate: (q: Question) => void;
  onDelete: (q: Question) => void;
  onMoveToSection: (q: Question, targetSectionId: string) => void;
  lang: string;
  sections: SurveySection[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const typeInfo = QUESTION_TYPES.find((t) => t.value === question.type);
  const otherSections = sections.filter((s) => s.id !== sectionId);
  const choicesLabel =
    question.choices ? `${question.choices.length} choices` :
    question.rows ? `${question.rows.length} rows` : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-md border transition-colors ${
        isDragging ? "border-primary shadow-lg bg-primary-soft" : "border-border hover:bg-muted/40"
      }`}
    >
      <div {...attributes} {...listeners}>
        <DragHandle />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0 tabular-nums">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm block truncate">{lang === "th" ? question.textTh : question.textEn}</span>
          {question.required && (
            <span className="text-destructive text-xs shrink-0">*</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
            {TYPE_ICONS[question.type] ?? "?"} {question.type.replace(/_/g, " ")}
          </span>
          {question.category && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{question.category}</Badge>
          )}
          {choicesLabel && (
            <span className="text-[10px] text-muted-foreground">· {choicesLabel}</span>
          )}
        </div>
      </div>

      {/* Move to section */}
      {otherSections.length > 0 && (
        <Select
          value=""
          onValueChange={(v) => v && onMoveToSection(question, v)}
        >
          <SelectTrigger className="h-7 w-auto px-2 text-[10px] border-none hover:bg-muted shadow-none gap-1">
            <MoveRight className="w-3 h-3" />
          </SelectTrigger>
          <SelectContent align="end">
            {otherSections.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                → {lang === "th" ? s.titleTh : s.titleEn}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onDuplicate(question)} title={lang === "th" ? "ทำสำเนา" : "Duplicate"}>
        <Copy className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => onEdit(question)} title={lang === "th" ? "แก้ไข" : "Edit"}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive" onClick={() => onDelete(question)} title={lang === "th" ? "ลบ" : "Delete"}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── Main Component ──
function QuestionsAdmin() {
  const { t, lang } = useI18n();
  const [sections, setSections] = useState<SurveySection[]>(QUESTION_BANK);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Section dialog
  const [secDialogOpen, setSecDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SurveySection | null>(null);
  const [secTitleEn, setSecTitleEn] = useState("");
  const [secTitleTh, setSecTitleTh] = useState("");
  const [secDescEn, setSecDescEn] = useState("");
  const [secDescTh, setSecDescTh] = useState("");

  // Question dialog
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [form, setForm] = useState<QuestionForm>(() => emptyForm());

  // Delete confirm
  const [deleteQ, setDeleteQ] = useState<{ sectionId: string; question: Question } | null>(null);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Search filter ──
  const filteredSections = useMemo(() => {
    if (!search.trim()) return sections;
    const q = search.toLowerCase();
    return sections
      .map((sec) => ({
        ...sec,
        questions: sec.questions.filter(
          (qst) =>
            qst.textEn.toLowerCase().includes(q) ||
            qst.textTh.toLowerCase().includes(q) ||
            (qst.category ?? "").toLowerCase().includes(q) ||
            qst.id.toLowerCase().includes(q)
        ),
      }))
      .filter((sec) => sec.questions.length > 0 || sec.id.toLowerCase().includes(q) || sec.titleEn.toLowerCase().includes(q) || sec.titleTh.toLowerCase().includes(q));
  }, [sections, search]);

  // ── Section CRUD ──
  const openNewSection = () => {
    setEditingSection(null);
    setSecTitleEn(""); setSecTitleTh("");
    setSecDescEn(""); setSecDescTh("");
    setSecDialogOpen(true);
  };

  const openEditSection = (sec: SurveySection) => {
    setEditingSection(sec);
    setSecTitleEn(sec.titleEn); setSecTitleTh(sec.titleTh);
    setSecDescEn(sec.descEn); setSecDescTh(sec.descTh);
    setSecDialogOpen(true);
  };

  const saveSection = () => {
    if (!secTitleEn.trim() && !secTitleTh.trim()) {
      toast.error(lang === "th" ? "กรุณากรอกชื่อชุดคำถาม" : "Please enter section title");
      return;
    }
    setSections((prev) => {
      if (editingSection) {
        return prev.map((s) =>
          s.id === editingSection.id
            ? { ...s, titleEn: secTitleEn, titleTh: secTitleTh, descEn: secDescEn, descTh: secDescTh }
            : s
        );
      }
      const newId = `sec_${Date.now()}`;
      return [...prev, { id: newId, titleEn: secTitleEn, titleTh: secTitleTh, descEn: secDescEn, descTh: secDescTh, questions: [] }];
    });
    setSecDialogOpen(false);
    toast.success(lang === "th" ? "บันทึกชุดคำถามแล้ว" : "Section saved");
  };

  const confirmDeleteSection = () => {
    if (!deleteSectionId) return;
    setSections((prev) => prev.filter((s) => s.id !== deleteSectionId));
    setDeleteSectionId(null);
    toast.success(lang === "th" ? "ลบชุดคำถามแล้ว" : "Section deleted");
  };

  // ── Question CRUD ──
  const openNewQuestion = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setEditingQ(null);
    setForm(emptyForm());
    setQDialogOpen(true);
  };

  const openEditQuestion = (q: Question) => {
    setActiveSectionId(
      sections.find((s) => s.questions.some((x) => x.id === q.id))?.id ?? ""
    );
    setEditingQ(q);
    setForm(formFromQuestion(q));
    setQDialogOpen(true);
  };

  const saveQuestion = () => {
    if (!form.textEn.trim() && !form.textTh.trim()) {
      toast.error(lang === "th" ? "กรุณากรอกข้อความคำถาม" : "Please enter question text");
      return;
    }
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== activeSectionId) return sec;
        if (editingQ) {
          return {
            ...sec,
            questions: sec.questions.map((q) => (q.id === editingQ.id ? formToQuestion(form, sec.id, editingQ.id) : q)),
          };
        }
        const newId = `${sec.id}${sec.questions.length + 1}`;
        return { ...sec, questions: [...sec.questions, formToQuestion(form, sec.id, newId)] };
      })
    );
    setQDialogOpen(false);
    toast.success(lang === "th" ? "บันทึกคำถามแล้ว" : "Question saved");
  };

  const confirmDeleteQuestion = () => {
    if (!deleteQ) return;
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === deleteQ.sectionId
          ? { ...sec, questions: sec.questions.filter((q) => q.id !== deleteQ.question.id) }
          : sec
      )
    );
    setDeleteQ(null);
    toast.success(lang === "th" ? "ลบคำถามแล้ว" : "Question deleted");
  };

  const duplicateQuestion = (q: Question) => {
    const secId = sections.find((s) => s.questions.some((x) => x.id === q.id))?.id;
    if (!secId) return;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== secId) return sec;
        const dup = { ...q, id: `${sec.id}${sec.questions.length + 1}` };
        return { ...sec, questions: [...sec.questions, dup] };
      })
    );
    toast.success(lang === "th" ? "ทำสำเนาคำถามแล้ว" : "Question duplicated");
  };

  const moveQuestion = (q: Question, targetSectionId: string) => {
    const sourceId = sections.find((s) => s.questions.some((x) => x.id === q.id))?.id;
    if (!sourceId || sourceId === targetSectionId) return;
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id === sourceId) return { ...sec, questions: sec.questions.filter((x) => x.id !== q.id) };
        if (sec.id === targetSectionId) return { ...sec, questions: [...sec.questions, { ...q, id: `${sec.id}${sec.questions.length + 1}` }] };
        return sec;
      })
    );
    toast.success(lang === "th" ? "ย้ายคำถามแล้ว" : "Question moved");
  };

  // ── Drag & drop ──
  const handleDragEnd = useCallback(
    (sectionId: string, event: DragEndEvent) => {
      const { active, over } = event;
      const activeId = String(active.id);
      const overId = over ? String(over.id) : null;
      if (!overId || activeId === overId) return;
      setSections((prev) =>
        prev.map((sec) => {
          if (sec.id !== sectionId) return sec;
          const oldIdx = sec.questions.findIndex((q) => q.id === activeId);
          const newIdx = sec.questions.findIndex((q) => q.id === overId);
          if (oldIdx === -1 || newIdx === -1) return sec;
          const next = [...sec.questions];
          const [moved] = next.splice(oldIdx, 1);
          next.splice(newIdx, 0, moved);
          return { ...sec, questions: next };
        })
      );
    },
    []
  );

  // ── Form helpers ──
  const updateForm = (patch: Partial<QuestionForm>) => setForm((f) => ({ ...f, ...patch }));

  const addChoice = () => {
    const n = form.choices.length + 1;
    updateForm({
      choices: [...form.choices, { key: `c${Date.now()}`, value: String(n), labelEn: `Option ${n}`, labelTh: `ตัวเลือก ${n}` }],
    });
  };

  const updateChoice = (key: string, patch: Partial<{ value: string; labelEn: string; labelTh: string }>) => {
    updateForm({ choices: form.choices.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  };

  const removeChoice = (key: string) => {
    updateForm({ choices: form.choices.filter((c) => c.key !== key) });
  };

  const addRow = () => {
    const n = form.rows.length + 1;
    updateForm({ rows: [...form.rows, { key: `r${Date.now()}`, textEn: `Row ${n}`, textTh: `แถว ${n}` }] });
  };

  const updateRow = (key: string, patch: Partial<{ textEn: string; textTh: string }>) => {
    updateForm({ rows: form.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });
  };

  const removeRow = (key: string) => {
    updateForm({ rows: form.rows.filter((r) => r.key !== key) });
  };

  const addColumn = () => {
    const n = form.columns.length + 1;
    updateForm({ columns: [...form.columns, { key: `c${Date.now()}`, value: String(n), labelEn: String(n), labelTh: String(n) }] });
  };

  const updateColumn = (key: string, patch: Partial<{ value: string; labelEn: string; labelTh: string }>) => {
    updateForm({ columns: form.columns.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  };

  const removeColumn = (key: string) => {
    updateForm({ columns: form.columns.filter((c) => c.key !== key) });
  };

  const toggleSection = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalQuestions = sections.reduce((s, sec) => s + sec.questions.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("nav.questions")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "th"
              ? `จัดการคำถามและหมวดหมู่ · ${totalQuestions} คำถามใน ${sections.length} หมวด`
              : `Manage questions and categories · ${totalQuestions} questions in ${sections.length} sections`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openNewSection}>
            <FolderPlus className="w-4 h-4 mr-1.5" />
            {lang === "th" ? "เพิ่มหมวด" : "Add Section"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8 h-9 text-sm"
          placeholder={lang === "th" ? "ค้นหาคำถาม..." : "Search questions..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {filteredSections.map((sec) => {
          const isExpanded = expanded[sec.id] !== false;
          return (
            <Card key={sec.id} className="overflow-hidden">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{lang === "th" ? sec.titleTh : sec.titleEn}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 shrink-0">
                          {sec.questions.length}
                        </Badge>
                      </CardTitle>
                      {isExpanded && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {lang === "th" ? sec.descTh : sec.descEn}
                        </p>
                      )}
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEditSection(sec)} title={lang === "th" ? "แก้ไขหมวด" : "Edit section"}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteSectionId(sec.id)}
                      title={lang === "th" ? "ลบหมวด" : "Delete section"}
                      disabled={sec.questions.length > 0}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pb-4 px-4 pt-0 space-y-2">
                  {sec.questions.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(sec.id, e)}
                    >
                      <SortableContext
                        items={sec.questions.map((q) => q.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-1.5">
                          {sec.questions.map((q, i) => (
                            <SortableQuestionRow
                              key={q.id}
                              question={q}
                              index={i}
                              sectionId={sec.id}
                              sectionCount={sections.length}
                              onEdit={openEditQuestion}
                              onDuplicate={duplicateQuestion}
                              onDelete={(qq) => setDeleteQ({ sectionId: sec.id, question: qq })}
                              onMoveToSection={moveQuestion}
                              lang={lang}
                              sections={sections}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-center py-6 text-sm text-muted-foreground">
                      {lang === "th" ? "ยังไม่มีคำถามในหมวดนี้" : "No questions in this section"}
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground hover:text-foreground border border-dashed border-border hover:border-primary/50 mt-1"
                    onClick={() => openNewQuestion(sec.id)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {lang === "th" ? "เพิ่มคำถาม" : "Add Question"}
                  </Button>
                </CardContent>
              )}
            </Card>
          );
        })}
        {filteredSections.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            {lang === "th" ? "ไม่พบชุดคำถามที่ค้นหา" : "No sections match your search"}
          </div>
        )}
      </div>

      {/* ── Section Dialog ── */}
      <Dialog open={secDialogOpen} onOpenChange={setSecDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSection
                ? (lang === "th" ? "แก้ไขชุดคำถาม" : "Edit Section")
                : (lang === "th" ? "สร้างชุดคำถามใหม่" : "New Section")}
            </DialogTitle>
            <DialogDescription>
              {lang === "th" ? "ตั้งชื่อและคำอธิบายสำหรับชุดคำถาม" : "Set a name and description for this section"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{lang === "th" ? "ชื่อ (TH)" : "Title (TH)"}</Label>
              <Input value={secTitleTh} onChange={(e) => setSecTitleTh(e.target.value)} placeholder="เช่น องค์กร ค่าตอบแทน" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "th" ? "ชื่อ (EN)" : "Title (EN)"}</Label>
              <Input value={secTitleEn} onChange={(e) => setSecTitleEn(e.target.value)} placeholder="e.g. Organization & Compensation" />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "th" ? "คำอธิบาย (TH)" : "Description (TH)"}</Label>
              <Textarea value={secDescTh} onChange={(e) => setSecDescTh(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>{lang === "th" ? "คำอธิบาย (EN)" : "Description (EN)"}</Label>
              <Textarea value={secDescEn} onChange={(e) => setSecDescEn(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveSection}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Question Dialog ── */}
      <Dialog open={qDialogOpen} onOpenChange={setQDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQ
                ? (lang === "th" ? "แก้ไขคำถาม" : "Edit Question")
                : (lang === "th" ? "เพิ่มคำถามใหม่" : "New Question")}
            </DialogTitle>
            <DialogDescription>
              {lang === "th" ? "กรอกรายละเอียดคำถามตามประเภทที่เลือก" : "Fill in question details based on the selected type"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Text */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{lang === "th" ? "ข้อความ (TH)" : "Text (TH)"}</Label>
                <Input value={form.textTh} onChange={(e) => updateForm({ textTh: e.target.value })} placeholder="เช่น ฉันได้รับค่าตอบแทนที่เหมาะสม" />
              </div>
              <div className="space-y-1.5">
                <Label>{lang === "th" ? "ข้อความ (EN)" : "Text (EN)"}</Label>
                <Input value={form.textEn} onChange={(e) => updateForm({ textEn: e.target.value })} placeholder="e.g. I receive fair compensation" />
              </div>
            </div>

            {/* Description */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{lang === "th" ? "คำอธิบาย (TH)" : "Description (TH)"}</Label>
                <Input value={form.descTh} onChange={(e) => updateForm({ descTh: e.target.value })} placeholder={lang === "th" ? "optional" : "optional"} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{lang === "th" ? "คำอธิบาย (EN)" : "Description (EN)"}</Label>
                <Input value={form.descEn} onChange={(e) => updateForm({ descEn: e.target.value })} placeholder="optional" />
              </div>
            </div>

            {/* Type + Required + Category */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{lang === "th" ? "ประเภท" : "Type"}</Label>
                <Select value={form.type} onValueChange={(v) => updateForm({ type: v as QuestionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((qt) => (
                      <SelectItem key={qt.value} value={qt.value}>
                        {qt.icon} {lang === "th" ? qt.labelTh : qt.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{lang === "th" ? "หมวดหมู่" : "Category"}</Label>
                <Input value={form.category} onChange={(e) => updateForm({ category: e.target.value })} placeholder="e.g. Compensation" />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center gap-2 h-10">
                  <Checkbox
                    id="required"
                    checked={form.required}
                    onCheckedChange={(v) => updateForm({ required: v === true })}
                  />
                  <Label htmlFor="required" className="text-sm cursor-pointer">{lang === "th" ? "จำเป็น" : "Required"}</Label>
                </div>
              </div>
            </div>

            {/* Type-specific fields */}
            {/* Rating */}
            {form.type === "rating" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/30 border border-border">
                <Label className="col-span-2 text-xs font-medium text-muted-foreground">
                  {lang === "th" ? "ช่วงคะแนน" : "Scale range"}
                </Label>
                <div className="space-y-1">
                  <Label className="text-xs">Min</Label>
                  <Input type="number" value={form.minValue} onChange={(e) => updateForm({ minValue: Number(e.target.value) })} min={0} max={form.maxValue - 1} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max</Label>
                  <Input type="number" value={form.maxValue} onChange={(e) => updateForm({ maxValue: Number(e.target.value) })} min={form.minValue + 1} max={10} />
                </div>
              </div>
            )}

            {/* Single / Multiple Select — Choices */}
            {(form.type === "single_select" || form.type === "multiple_select") && (
              <div className="space-y-2 p-3 rounded-md bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {lang === "th" ? "ตัวเลือก" : "Choices"}
                  </Label>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addChoice}>
                    <Plus className="w-3 h-3 mr-1" />{lang === "th" ? "เพิ่ม" : "Add"}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {form.choices.map((c, i) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
                      <Input
                        className="h-8 text-xs w-[60px]"
                        placeholder="#"
                        value={c.value}
                        onChange={(e) => updateChoice(c.key, { value: e.target.value })}
                      />
                      <Input
                        className="h-8 text-xs flex-1"
                        placeholder="EN label"
                        value={c.labelEn}
                        onChange={(e) => updateChoice(c.key, { labelEn: e.target.value })}
                      />
                      <Input
                        className="h-8 text-xs flex-1"
                        placeholder="TH label"
                        value={c.labelTh}
                        onChange={(e) => updateChoice(c.key, { labelTh: e.target.value })}
                      />
                      <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-destructive" onClick={() => removeChoice(c.key)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {form.type === "multiple_select" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">{lang === "th" ? "เลือกขั้นต่ำ" : "Min select"}</Label>
                      <Input type="number" className="h-7 text-xs" value={form.minChoices} onChange={(e) => updateForm({ minChoices: Number(e.target.value) })} min={0} />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px]">{lang === "th" ? "เลือกสูงสุด" : "Max select"}</Label>
                      <Input type="number" className="h-7 text-xs" value={form.maxChoices} onChange={(e) => updateForm({ maxChoices: Number(e.target.value) })} min={0} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matrix — Rows and Columns */}
            {form.type === "matrix" && (
              <div className="space-y-3 p-3 rounded-md bg-muted/30 border border-border">
                {/* Rows */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {lang === "th" ? "แถว" : "Rows"}
                    </Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addRow}>
                      <Plus className="w-3 h-3 mr-1" />{lang === "th" ? "เพิ่ม" : "Add"}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {form.rows.map((r) => (
                      <div key={r.key} className="flex items-center gap-2">
                        <Input className="h-8 text-xs flex-1" placeholder="EN" value={r.textEn} onChange={(e) => updateRow(r.key, { textEn: e.target.value })} />
                        <Input className="h-8 text-xs flex-1" placeholder="TH" value={r.textTh} onChange={(e) => updateRow(r.key, { textTh: e.target.value })} />
                        <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-destructive" onClick={() => removeRow(r.key)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Columns */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {lang === "th" ? "คอลัมน์" : "Columns"}
                    </Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addColumn}>
                      <Plus className="w-3 h-3 mr-1" />{lang === "th" ? "เพิ่ม" : "Add"}
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {form.columns.map((c) => (
                      <div key={c.key} className="flex items-center gap-2">
                        <Input className="h-8 text-xs w-16" placeholder="#" value={c.value} onChange={(e) => updateColumn(c.key, { value: e.target.value })} />
                        <Input className="h-8 text-xs flex-1" placeholder="EN" value={c.labelEn} onChange={(e) => updateColumn(c.key, { labelEn: e.target.value })} />
                        <Input className="h-8 text-xs flex-1" placeholder="TH" value={c.labelTh} onChange={(e) => updateColumn(c.key, { labelTh: e.target.value })} />
                        <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 text-destructive" onClick={() => removeColumn(c.key)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* NPS / Binary / Open text — no extra config */}
            {["nps", "binary", "open_text_short", "open_text_long"].includes(form.type) && (
              <div className="p-3 rounded-md bg-muted/30 border border-border text-xs text-muted-foreground">
                {lang === "th" ? "ไม่มีการตั้งค่าเพิ่มเติมสำหรับประเภทนี้" : "No additional configuration for this type"}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQDialogOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={saveQuestion}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Question Confirm ── */}
      <AlertDialog open={!!deleteQ} onOpenChange={(o) => !o && setDeleteQ(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "th" ? "ยืนยันการลบคำถาม" : "Delete question?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "th"
                ? `แน่ใจว่าต้องการลบ "${deleteQ?.question.textTh}"?`
                : `Are you sure you want to delete "${deleteQ?.question.textEn}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Section Confirm ── */}
      <AlertDialog open={!!deleteSectionId} onOpenChange={(o) => !o && setDeleteSectionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "th" ? "ยืนยันการลบชุดคำถาม" : "Delete section?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {lang === "th"
                ? `แน่ใจว่าต้องการลบชุดคำถามนี้?`
                : `Are you sure you want to delete this section?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSection} className="bg-destructive text-destructive-foreground">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
