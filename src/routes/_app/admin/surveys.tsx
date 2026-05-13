import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { MOCK_SURVEYS, QUESTION_BANK, type MockSurvey } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Download, ClipboardList, ListChecks } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/surveys")({
  component: SurveysAdmin,
});

function SurveysAdmin() {
  const { t, lang } = useI18n();
  const [surveys, setSurveys] = useState(MOCK_SURVEYS);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<MockSurvey | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = surveys.filter((s) =>
    (lang === "th" ? s.titleTh : s.titleEn).toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editing) return;
    if (editing.sectionIds.length === 0) {
      toast.error(lang === "th" ? "กรุณาเลือกชุดคำถามอย่างน้อย 1 ชุด" : "Please select at least 1 section");
      return;
    }
    setSurveys((prev) => {
      const idx = prev.findIndex((s) => s.id === editing.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = editing;
        return next;
      }
      return [...prev, { ...editing, id: `s${Date.now()}` }];
    });
    setDialogOpen(false);
    toast.success(lang === "th" ? "บันทึกแบบสำรวจแล้ว" : "Survey saved");
  };

  const handleDelete = (id: string) => {
    setSurveys((prev) => prev.filter((s) => s.id !== id));
    setDeleteTarget(null);
    toast.success(lang === "th" ? "ลบแบบสำรวจแล้ว" : "Survey deleted");
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("nav.surveys")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "th" ? "จัดการแบบสำรวจและช่วงเวลาเปิดรับคำตอบ" : "Manage surveys and response windows"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><Download className="w-4 h-4 mr-1.5" />{t("common.export")}</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditing({ id: "", titleEn: "", titleTh: "", status: "Draft", surveyType: "identified", startDate: "", endDate: "", responses: 0, target: 0, sectionIds: [] }); }}><Plus className="w-4 h-4 mr-1.5" />{t("common.create")}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing?.id ? (lang === "th" ? "แก้ไขแบบสำรวจ" : "Edit Survey") : (lang === "th" ? "สร้างแบบสำรวจใหม่" : "Create Survey")}</DialogTitle>
                <DialogDescription>{lang === "th" ? "กรอกข้อมูลแบบสำรวจด้านล่าง" : "Fill in the survey details below"}</DialogDescription>
              </DialogHeader>
              {editing && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{lang === "th" ? "ชื่อ (TH)" : "Title (TH)"}</Label>
                    <Input value={editing.titleTh} onChange={(e) => setEditing({ ...editing, titleTh: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{lang === "th" ? "ชื่อ (EN)" : "Title (EN)"}</Label>
                    <Input value={editing.titleEn} onChange={(e) => setEditing({ ...editing, titleEn: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("common.status")}</Label>
                      <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as MockSurvey["status"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">{t("common.draft")}</SelectItem>
                          <SelectItem value="Active">{t("common.active")}</SelectItem>
                          <SelectItem value="Closed">{t("common.closed")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{lang === "th" ? "ประเภท" : "Type"}</Label>
                      <Select value={editing.surveyType} onValueChange={(v) => setEditing({ ...editing, surveyType: v as "anonymous" | "identified" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="identified">{lang === "th" ? "ระบุตัวตน" : "Identified"}</SelectItem>
                          <SelectItem value="anonymous">{lang === "th" ? "ไม่ระบุตัวตน" : "Anonymous"}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{lang === "th" ? "วันที่เริ่ม" : "Start date"}</Label>
                      <Input value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} placeholder="YYYY-MM-DD" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{lang === "th" ? "วันที่สิ้นสุด" : "End date"}</Label>
                      <Input value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} placeholder="YYYY-MM-DD" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{lang === "th" ? "เป้าหมาย" : "Target"}</Label>
                      <Input type="number" value={editing.target} onChange={(e) => setEditing({ ...editing, target: Number(e.target.value) })} />
                    </div>
                  </div>

                  {/* Section picker */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <ListChecks className="w-4 h-4 text-primary" />
                      {lang === "th" ? "ชุดคำถาม (Section)" : "Question Sections"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {lang === "th"
                        ? "เลือกชุดคำถามที่จะใช้ในแบบสำรวจนี้ (เลือกอย่างน้อย 1)"
                        : "Select which sections this survey uses (select at least 1)"}
                    </p>
                    <div className="space-y-2 pt-1">
                      {QUESTION_BANK.map((sec) => {
                        const checked = editing.sectionIds.includes(sec.id);
                        const qCount = sec.questions.length;
                        return (
                          <Label
                            key={sec.id}
                            className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                              checked
                                ? "border-primary bg-primary-soft"
                                : "border-border hover:bg-muted/40"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleSection(sec.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">
                                {lang === "th" ? sec.titleTh : sec.titleEn}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {qCount} {lang === "th" ? "คำถาม" : "questions"} · {sec.id.toUpperCase()}
                              </span>
                            </div>
                          </Label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleSave}>{t("common.save")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              {lang === "th" ? "แบบสำรวจทั้งหมด" : "All surveys"}
            </CardTitle>
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 h-9" placeholder={t("common.search")} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang === "th" ? "ชื่อแบบสำรวจ" : "Survey"}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead>{lang === "th" ? "ประเภท" : "Type"}</TableHead>
                <TableHead>{lang === "th" ? "ชุดคำถาม" : "Sections"}</TableHead>
                <TableHead>{lang === "th" ? "ช่วงเวลา" : "Window"}</TableHead>
                <TableHead>{lang === "th" ? "การตอบกลับ" : "Responses"}</TableHead>
                <TableHead className="text-right">{lang === "th" ? "การจัดการ" : "Actions"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const pct = s.target ? Math.round((s.responses / s.target) * 100) : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium">{lang === "th" ? s.titleTh : s.titleEn}</div>
                      <div className="text-xs text-muted-foreground">{s.id.toUpperCase()}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "Active" ? "default" : s.status === "Closed" ? "secondary" : "outline"}>
                        {s.status === "Active" ? t("common.active") : s.status === "Closed" ? t("common.closed") : t("common.draft")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.surveyType === "anonymous" ? "outline" : "default"} className="text-[10px]">
                        {s.surveyType === "anonymous" ? (lang === "th" ? "ไม่ระบุตัวตน" : "Anonymous") : (lang === "th" ? "ระบุตัวตน" : "Identified")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {s.sectionIds.map((secId) => {
                          const sec = QUESTION_BANK.find((q) => q.id === secId);
                          return (
                            <Badge key={secId} variant="secondary" className="text-[10px]">
                              {lang === "th" ? sec?.titleTh ?? secId : sec?.titleEn ?? secId}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{s.startDate} → {s.endDate}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs tabular-nums text-muted-foreground">{s.responses}/{s.target}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing({ ...s }); setDialogOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                      <AlertDialog open={deleteTarget === s.id} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{lang === "th" ? "ยืนยันการลบ" : "Confirm delete"}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {lang === "th" ? `แน่ใจว่าต้องการลบ "${s.titleTh}"?` : `Are you sure to delete "${s.titleEn}"?`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(s.id)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
