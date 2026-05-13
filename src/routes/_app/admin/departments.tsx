import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { DEPARTMENTS, BUSINESS_UNITS, ENGAGEMENT_BY_DEPT } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/departments")({
  component: DeptAdmin,
});

function DeptAdmin() {
  const { t, lang } = useI18n();
  const [depts, setDepts] = useState(DEPARTMENTS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [newDept, setNewDept] = useState("");
  const [deptBu, setDeptBu] = useState(BUSINESS_UNITS[0]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const counts = Object.fromEntries(ENGAGEMENT_BY_DEPT.map((d) => [d.dept, d.responses]));

  const handleSave = () => {
    if (!newDept.trim()) return;
    if (editing) {
      setDepts((prev) => prev.map((d) => (d === editing ? newDept.trim() : d)));
      toast.success(lang === "th" ? "อัปเดตหน่วยงานแล้ว" : "Department updated");
    } else {
      setDepts((prev) => [...prev, newDept.trim()]);
      toast.success(lang === "th" ? "เพิ่มหน่วยงานแล้ว" : "Department created");
    }
    setDialogOpen(false);
    setNewDept("");
    setEditing(null);
  };

  const handleDelete = (dept: string) => {
    setDepts((prev) => prev.filter((d) => d !== dept));
    setDeleteTarget(null);
    toast.success(lang === "th" ? "ลบหน่วยงานแล้ว" : "Department deleted");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{t("nav.departments")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "th" ? "จัดการหน่วยธุรกิจและหน่วยงาน" : "Manage business units and departments"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditing(null); setNewDept(""); }}><Plus className="w-4 h-4 mr-1.5" />{t("common.create")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? (lang === "th" ? "แก้ไขหน่วยงาน" : "Edit Department") : (lang === "th" ? "เพิ่มหน่วยงานใหม่" : "Add Department")}</DialogTitle>
              <DialogDescription>{lang === "th" ? "กรอกชื่อหน่วยงานและหน่วยธุรกิจ" : "Enter department name and business unit"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{lang === "th" ? "ชื่อหน่วยงาน" : "Department Name"}</Label>
                <Input value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder={lang === "th" ? "เช่น ฝ่ายทรัพยากรบุคคล" : "e.g. Human Resources"} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("common.businessUnit")}</Label>
                <Select value={deptBu} onValueChange={setDeptBu}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUSINESS_UNITS.map((bu) => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={handleSave}>{t("common.save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {BUSINESS_UNITS.map((bu) => (
          <Card key={bu}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {bu}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {depts.filter((_, i) => i % BUSINESS_UNITS.length === BUSINESS_UNITS.indexOf(bu)).length}
              </div>
              <div className="text-xs text-muted-foreground">{lang === "th" ? "หน่วยงาน" : "departments"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{lang === "th" ? "หน่วยงานทั้งหมด" : "All departments"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {depts.map((d) => (
              <div key={d} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{d}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {counts[d] ?? "—"} {lang === "th" ? "ผู้ตอบ" : "respondents"}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(d); setNewDept(d); setDialogOpen(true); }}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <AlertDialog open={deleteTarget === d} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(d)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{lang === "th" ? "ยืนยันการลบ" : "Confirm delete"}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {lang === "th" ? `แน่ใจว่าต้องการลบ "${d}"?` : `Are you sure you want to delete "${d}"?`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(d)} className="bg-destructive text-destructive-foreground">{t("common.delete")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
