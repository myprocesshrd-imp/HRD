import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { 
  getDepartmentsWithId, createDepartment, updateDepartment, deleteDepartment,
  Department
} from "@/services/api/departments";
import {
  getBusinessUnits, createBusinessUnit, updateBusinessUnit, deleteBusinessUnit,
  BusinessUnit
} from "@/services/api/business-units";
import { 
  getDemographicOptions, createDemographicOption, updateDemographicOption, deleteDemographicOption,
  DemographicOption
} from "@/services/api/demographic-options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Dialog, DialogContent, DialogFooter, 
  DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { DataTable, type ColumnConfig } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Building2, Pencil, Trash2, 
  Search, Database, Layers,
  Compass, Check
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/admin/personnel-mapping")({
  component: PersonnelMappingAdmin,
});

type TabType = "departments" | "business_units" | "locations" | "levels" | "genders" | "ageRanges" | "tenures";

function PersonnelMappingAdmin() {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>("genders");
  
  // Data lists
  const [departments, setDepartments] = useState<Department[]>([]);
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  const [demoOptions, setDemoOptions] = useState<DemographicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Shared dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  
  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameTh, setNameTh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [description, setDescription] = useState("");
  
  // Specific to departments - multi-BU selection
  const [selectedBuIds, setSelectedBuIds] = useState<string[]>([]);
  
  // Specific to demographic options
  const [optionValue, setOptionValue] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(1);
  
  const [searchTerm, setSearchTerm] = useState("");

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [deptsData, busData, demoOptionsData] = await Promise.all([
        getDepartmentsWithId(),
        getBusinessUnits(),
        getDemographicOptions()
      ]);
      setDepartments(deptsData);
      setBus(busData);
      setDemoOptions(demoOptionsData);
    } catch (err) {
      toast.error(lang === "th" ? "โหลดข้อมูลล้มเหลว" : "Failed to load mapping database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter lists based on tab and search term
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      d.name_en.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.name_th.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm]);

  const filteredBus = useMemo(() => {
    return bus.filter(b => 
      b.name_en.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.name_th.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [bus, searchTerm]);

  const getFilteredDemoOptions = (fieldKey: string) => {
    return demoOptions
      .filter(o => o.field_key === fieldKey)
      .filter(o => 
        o.label_en.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.label_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.value.toLowerCase().includes(searchTerm.toLowerCase())
      );
  };

  // Open dialog for Add
  const handleOpenAdd = () => {
    setEditingId(null);
    setNameTh("");
    setNameEn("");
    setDescription("");
    setSelectedBuIds([]);
    setOptionValue("");
    
    // Default sort order for demog options
    const currentTabOptions = demoOptions.filter(o => o.field_key === activeTab);
    const maxSort = currentTabOptions.reduce((max, item) => item.sort_order > max ? item.sort_order : max, 0);
    setSortOrder(maxSort + 1);
    
    setDialogOpen(true);
  };

  // Open dialog for Edit
  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    
    if (activeTab === "departments") {
      setNameTh(item.name_th);
      setNameEn(item.name_en);
      // Load multi-BU ids from junction data
      setSelectedBuIds(item.business_unit_ids || (item.business_unit_id ? [item.business_unit_id] : []));
    } else if (activeTab === "business_units") {
      setNameTh(item.name_th || item.name || "");
      setNameEn(item.name_en || item.name || "");
      setDescription(item.description || "");
    } else {
      // Demographic option
      setNameTh(item.label_th);
      setNameEn(item.label_en);
      setOptionValue(item.value);
      setSortOrder(item.sort_order);
    }
    
    setDialogOpen(true);
  };

  // Toggle BU id in multi-select
  const toggleBuId = (buId: string) => {
    setSelectedBuIds(prev => 
      prev.includes(buId) ? prev.filter(id => id !== buId) : [...prev, buId]
    );
  };

  // Save operation
  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === "departments") {
        if (!nameTh.trim() || !nameEn.trim()) {
          toast.error(lang === "th" ? "กรุณากรอกชื่อทั้งภาษาไทยและอังกฤษ" : "Please enter both Thai and English names");
          setSaving(false);
          return;
        }

        const dup = departments.find(d =>
          d.id !== editingId &&
          (d.name_en.toLowerCase() === nameEn.trim().toLowerCase() || d.name_th.toLowerCase() === nameTh.trim().toLowerCase())
        );
        if (dup) {
          toast.error(lang === "th" ? `ฝ่าย "${dup.name_th}" มีอยู่แล้วในระบบ` : `Division "${dup.name_en}" already exists`);
          setSaving(false);
          return;
        }
        
        if (editingId) {
          await updateDepartment(editingId, nameEn.trim(), nameTh.trim(), selectedBuIds);
          toast.success(lang === "th" ? "แก้ไขฝ่ายสำเร็จ" : "Division updated");
        } else {
          await createDepartment(nameEn.trim(), nameTh.trim(), selectedBuIds);
          toast.success(lang === "th" ? "สร้างฝ่ายสำเร็จ" : "Division created");
        }
      } 
      
      else if (activeTab === "business_units") {
        if (!nameTh.trim() || !nameEn.trim()) {
          toast.error(lang === "th" ? "กรุณากรอกชื่อทั้งภาษาไทยและอังกฤษ" : "Please enter both Thai and English names");
          setSaving(false);
          return;
        }
        if (editingId) {
          await updateBusinessUnit(editingId, {
            name: nameEn.trim(),
            name_en: nameEn.trim(),
            name_th: nameTh.trim(),
            description
          });
          toast.success(lang === "th" ? "แก้ไขหน่วยงานสังกัดสำเร็จ" : "Affiliated Unit updated");
        } else {
          await createBusinessUnit({
            name: nameEn.trim(),
            name_en: nameEn.trim(),
            name_th: nameTh.trim(),
            description
          });
          toast.success(lang === "th" ? "สร้างหน่วยงานสังกัดสำเร็จ" : "Affiliated Unit created");
        }
      } 
      
      else {
        // Demographic options
        if (!nameTh.trim() || !nameEn.trim() || !optionValue.trim()) {
          toast.error(lang === "th" ? "กรุณากรอกข้อมูลให้ครบทุกช่อง" : "Please fill in all fields");
          setSaving(false);
          return;
        }
        
        if (editingId) {
          await updateDemographicOption(editingId, {
            value: optionValue.trim(),
            label_en: nameEn.trim(),
            label_th: nameTh.trim(),
            sort_order: sortOrder
          });
          toast.success(lang === "th" ? "อัปเดตตัวเลือกสำเร็จ" : "Dropdown choice updated");
        } else {
          await createDemographicOption({
            field_key: activeTab,
            value: optionValue.trim(),
            label_en: nameEn.trim(),
            label_th: nameTh.trim(),
            sort_order: sortOrder
          });
          toast.success(lang === "th" ? "เพิ่มตัวเลือกสำเร็จ" : "Dropdown choice created");
        }
      }
      
      setDialogOpen(false);
      await loadAllData();
    } catch (err) {
      toast.error(lang === "th" ? "บันทึกข้อมูลล้มเหลว" : "Save operation failed");
    } finally {
      setSaving(false);
    }
  };

  // Delete operation
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setSaving(true);
    try {
      if (activeTab === "departments") {
        await deleteDepartment(deleteTargetId);
        toast.success(lang === "th" ? "ลบฝ่ายสำเร็จ" : "Division deleted");
      } else if (activeTab === "business_units") {
        await deleteBusinessUnit(deleteTargetId);
        toast.success(lang === "th" ? "ลบหน่วยงานสังกัดสำเร็จ" : "Affiliated Unit deleted");
      } else {
        await deleteDemographicOption(deleteTargetId);
        toast.success(lang === "th" ? "ลบตัวเลือกสำเร็จ" : "Dropdown choice deleted");
      }
      setDeleteTargetId(null);
      await loadAllData();
    } catch (err) {
      toast.error(lang === "th" ? "ลบข้อมูลล้มเหลว" : "Delete operation failed");
    } finally {
      setSaving(false);
    }
  };

  // Columns definition
  const deptColumns: ColumnConfig<Department>[] = [
    {
      key: "name_th",
      header: lang === "th" ? "ฝ่าย (ไทย)" : "Division Name (TH)",
      sortable: true,
      render: (d) => <span className="font-bold">{d.name_th}</span>
    },
    {
      key: "name_en",
      header: lang === "th" ? "ฝ่าย (อังกฤษ)" : "Division Name (EN)",
      sortable: true,
      render: (d) => <span className="text-slate-500 font-medium">{d.name_en}</span>
    },
    {
      key: "business_unit",
      header: lang === "th" ? "หน่วยงานสังกัด" : "Affiliated Unit (BU)",
      render: (d) => {
        const buIds: string[] = d.business_unit_ids || (d.business_unit_id ? [d.business_unit_id] : []);
        let names = buIds
          .map(id => bus.find(b => b.id === id))
          .filter(Boolean)
          .map(b => lang === "th" ? b!.name_th : b!.name_en);
        if (names.length === 0 && d.business_unit) {
          names = [d.business_unit];
        }
        if (names.length === 0) return <span className="text-slate-300">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {names.map((name, i) => (
              <span key={i} className="h-6 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase">
                {name}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (d) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary transition-all" onClick={() => handleOpenEdit(d)}>
            <Pencil className="w-4.5 h-4.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all" onClick={() => setDeleteTargetId(d.id)}>
            <Trash2 className="w-4.5 h-4.5" />
          </Button>
        </div>
      )
    }
  ];

  const buColumns: ColumnConfig<BusinessUnit>[] = [
    {
      key: "name_th",
      header: lang === "th" ? "หน่วยงานสังกัด (ไทย)" : "Affiliated Unit (TH)",
      sortable: true,
      render: (b) => <span className="font-bold">{b.name_th || b.name}</span>
    },
    {
      key: "name_en",
      header: lang === "th" ? "หน่วยงานสังกัด (อังกฤษ)" : "Affiliated Unit (EN)",
      sortable: true,
      render: (b) => <span className="text-slate-500 font-medium">{b.name_en || b.name}</span>
    },
    {
      key: "description",
      header: lang === "th" ? "คำอธิบาย" : "Description",
      render: (b) => <span className="text-slate-500 text-sm line-clamp-1">{b.description || "—"}</span>
    },
    {
      key: "departments",
      header: lang === "th" ? "ฝ่ายในสังกัด" : "Departments Under",
      render: (b) => {
        const underDepts = departments.filter(d => {
          const ids = d.business_unit_ids || (d.business_unit_id ? [d.business_unit_id] : []);
          return ids.includes(b.id);
        });
        if (underDepts.length === 0) return <span className="text-slate-300">—</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[320px]">
            {underDepts.map((d) => (
              <span key={d.id} className="h-6 px-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 dark:bg-indigo-950/30 dark:border-indigo-900 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                {lang === "th" ? d.name_th : d.name_en}
              </span>
            ))}
          </div>
        );
      }
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (b) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary transition-all" onClick={() => handleOpenEdit(b)}>
            <Pencil className="w-4.5 h-4.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all" onClick={() => setDeleteTargetId(b.id)}>
            <Trash2 className="w-4.5 h-4.5" />
          </Button>
        </div>
      )
    }
  ];

  const demoColumns: ColumnConfig<DemographicOption>[] = [
    {
      key: "value",
      header: lang === "th" ? "รหัสระบบ (Value)" : "System ID (Value)",
      sortable: true,
      render: (o) => <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{o.value}</span>
    },
    {
      key: "label_th",
      header: lang === "th" ? "ชื่อภาษาไทย (Label TH)" : "Label TH",
      sortable: true,
      render: (o) => <span className="font-bold">{o.label_th}</span>
    },
    {
      key: "label_en",
      header: lang === "th" ? "ชื่อภาษาอังกฤษ (Label EN)" : "Label EN",
      sortable: true,
      render: (o) => <span className="text-slate-500 font-medium">{o.label_en}</span>
    },
    {
      key: "sort_order",
      header: lang === "th" ? "ลำดับ" : "Sort Order",
      sortable: true,
      render: (o) => <span className="font-semibold tabular-nums">{o.sort_order}</span>
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-[100px]",
      render: (o) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-slate-400 hover:text-primary transition-all" onClick={() => handleOpenEdit(o)}>
            <Pencil className="w-4.5 h-4.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-all" onClick={() => setDeleteTargetId(o.id)}>
            <Trash2 className="w-4.5 h-4.5" />
          </Button>
        </div>
      )
    }
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-slate-100 border-t-primary animate-spin" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Personnel Mapping Registry...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary mb-1">
             <Compass className="w-4 h-4 animate-pulse" />
             <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Master Data Configuration</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {lang === "th" ? "จัดการข้อมูลตัวเลือกผู้ตอบ (Dropdown Mapping)" : "Personnel Mapping"}
          </h1>
          <p className="text-[15px] font-medium text-slate-400">
             {lang === "th" ? "จัดการข้อมูลหน่วยงาน ฝ่าย และตัวเลือกอื่นๆ ที่ใช้ในแบบสำรวจ" : "Configure system divisions, locations, levels and survey demographic options."}
          </p>
        </div>
        
        <Button 
          onClick={handleOpenAdd}
          className="h-12 px-6 rounded-2xl bg-slate-900 dark:bg-primary text-white font-bold text-[13px] uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-all group"
        >
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          {lang === "th" ? "เพิ่มข้อมูล" : "Add Entry"}
        </Button>
      </div>

      {/* Tabs System */}
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val as TabType); setSearchTerm(""); }} className="w-full space-y-6">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex flex-wrap gap-1 h-auto w-full lg:w-auto overflow-x-auto">
            <TabsTrigger value="genders" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "เพศ" : "Genders"}
            </TabsTrigger>
            <TabsTrigger value="ageRanges" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "ช่วงอายุตัว (Generation Gap)" : "Age Ranges"}
            </TabsTrigger>
            <TabsTrigger value="tenures" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "อายุงาน" : "Tenures"}
            </TabsTrigger>
            <TabsTrigger value="locations" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "Site" : "Site (Locations)"}
            </TabsTrigger>
            <TabsTrigger value="business_units" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "หน่วยงานสังกัด" : "Affiliated Units (BU)"}
            </TabsTrigger>
            <TabsTrigger value="departments" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "ฝ่าย" : "Divisions"}
            </TabsTrigger>
            <TabsTrigger value="levels" className="rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all">
              {lang === "th" ? "ระดับปฏิบัติการ" : "Employee Levels"}
            </TabsTrigger>
          </TabsList>
          
          <div className="relative group w-full lg:max-w-xs">
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder={lang === "th" ? "ค้นหา..." : "Search..."} 
              className="h-11 pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Divisions / Departments */}
        <TabsContent value="departments" className="m-0 focus-visible:outline-none">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900/50">
            <CardHeader className="px-8 py-5 border-b dark:border-slate-800 bg-slate-50/20">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Building2 className="w-4.5 h-4.5 text-primary" />
                {lang === "th" ? "รายการฝ่ายทั้งหมด" : "Division Registry"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable 
                data={filteredDepartments} 
                columns={deptColumns} 
                pageSize={10} 
                keyExtractor={(d) => d.id} 
                emptyMessage={lang === "th" ? "ไม่พบฝ่าย" : "No divisions registered"} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Units */}
        <TabsContent value="business_units" className="m-0 focus-visible:outline-none">
          <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900/50">
            <CardHeader className="px-8 py-5 border-b dark:border-slate-800 bg-slate-50/20">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-primary" />
                {lang === "th" ? "รายการหน่วยงานสังกัดทั้งหมด" : "Affiliated Unit Registry"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable 
                data={filteredBus} 
                columns={buColumns} 
                pageSize={10} 
                keyExtractor={(b) => b.id} 
                emptyMessage={lang === "th" ? "ไม่พบหน่วยงานสังกัด" : "No affiliated units registered"} 
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Demographic options (Locations, Levels, etc.) */}
        {(["locations", "levels", "genders", "ageRanges", "tenures"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="m-0 focus-visible:outline-none">
            <Card className="border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl overflow-hidden bg-white dark:bg-slate-900/50">
              <CardHeader className="px-8 py-5 border-b dark:border-slate-800 bg-slate-50/20">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-primary" />
                  {lang === "th" ? `ตัวเลือกสำหรับ${t(
                    tab === "locations" ? "common.location" :
                    tab === "levels" ? "common.level" :
                    tab === "genders" ? "common.gender" :
                    tab === "ageRanges" ? "common.age" :
                    tab === "tenures" ? "common.tenure" : 
                    `common.${(tab as string).replace(/s$/, "")}` as any
                  )}` : `${tab} Options`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable 
                  data={getFilteredDemoOptions(tab)} 
                  columns={demoColumns} 
                  pageSize={10} 
                  keyExtractor={(o) => o.id} 
                  emptyMessage={lang === "th" ? "ไม่พบตัวเลือก" : "No choices registered"} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

      </Tabs>

      {/* dialog for add / edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="px-8 pt-8 pb-6 bg-slate-50/50 dark:bg-slate-800/30 border-b dark:border-slate-800">
            <DialogTitle className="text-xl font-black tracking-tight">
              {editingId ? (lang === "th" ? "แก้ไขข้อมูล" : "Edit Entry") : (lang === "th" ? "เพิ่มข้อมูลใหม่" : "Add Entry")}
            </DialogTitle>
            <DialogDescription className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-1">
              {activeTab === "departments" && (lang === "th" ? "จัดการข้อมูลฝ่าย" : "Configure Division details.")}
              {activeTab === "business_units" && (lang === "th" ? "จัดการข้อมูลหน่วยงานสังกัด" : "Configure Affiliated Unit details.")}
              {activeTab !== "departments" && activeTab !== "business_units" && (lang === "th" ? "จัดการตัวเลือกในแบบสำรวจ" : "Configure demographic choice parameters.")}
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 py-6 space-y-4">
            {/* Division form */}
            {activeTab === "departments" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ชื่อฝ่าย (ภาษาไทย)</Label>
                  <Input value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="เช่น ฝ่ายบุคคล" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ชื่อฝ่าย (ภาษาอังกฤษ)</Label>
                  <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Human Resources" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">
                    หน่วยงานสังกัด (เลือกได้หลายรายการ)
                  </Label>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 space-y-2 max-h-[300px] overflow-y-auto">
                    {bus.length === 0 && (
                      <p className="text-xs text-slate-400 py-2 text-center">ไม่พบหน่วยงานสังกัด</p>
                    )}
                    {bus.map((b) => (
                      <label key={b.id} className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                        <Checkbox
                          checked={selectedBuIds.includes(b.id)}
                          onCheckedChange={() => toggleBuId(b.id)}
                          className="rounded-md"
                        />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {lang === "th" ? b.name_th : b.name_en}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedBuIds.length > 0 && (
                    <p className="text-[10px] text-primary font-bold ml-1">
                      <Check className="w-3 h-3 inline mr-1" />
                      เลือกแล้ว {selectedBuIds.length} รายการ
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Business Unit form */}
            {activeTab === "business_units" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ชื่อหน่วยงานสังกัด (ภาษาไทย)</Label>
                  <Input value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="เช่น กลุ่มงานสนับสนุน" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ชื่อหน่วยงานสังกัด (ภาษาอังกฤษ)</Label>
                  <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Support BU" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">คำอธิบาย</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope details..." className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-medium" />
                </div>
              </>
            )}

            {/* Demographic options form */}
            {activeTab !== "departments" && activeTab !== "business_units" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">รหัสระบบ (System Value)</Label>
                  <Input value={optionValue} readOnly disabled placeholder="Auto-generated from English name..." className="h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border-transparent font-mono text-xs cursor-not-allowed opacity-75" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ชื่อตัวเลือก (ภาษาไทย)</Label>
                  <Input value={nameTh} onChange={(e) => setNameTh(e.target.value)} placeholder="เช่น สำนักงาน" className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ชื่อตัวเลือก (ภาษาอังกฤษ)</Label>
                  <Input 
                    value={nameEn} 
                    onChange={(e) => {
                      const val = e.target.value;
                      setNameEn(val);
                      if (!editingId) {
                        const generated = val
                          .trim()
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/(^-|-$)/g, "");
                        setOptionValue(generated);
                      }
                    }}
                    placeholder="e.g. Office" 
                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">ลำดับการแสดงผล (Sort Order)</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)} className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-transparent font-bold" />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/30 border-t dark:border-slate-800 flex gap-3">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="flex-1 h-11 rounded-xl font-bold text-slate-400 uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800">
              {lang === "th" ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-primary text-white font-bold uppercase tracking-wider shadow-lg">
              {saving ? (lang === "th" ? "กำลังบันทึก..." : "Saving...") : (lang === "th" ? "บันทึก" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-6 text-center flex flex-col items-center gap-4 bg-white dark:bg-slate-900 max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 shadow-inner">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <AlertDialogTitle className="text-lg font-black tracking-tight text-rose-600">
              {lang === "th" ? "ยืนยันการลบ?" : "Confirm Delete"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-slate-400 leading-relaxed">
              {lang === "th" ? "การดำเนินการนี้ไม่สามารถย้อนกลับได้ ข้อมูลจะถูกลบออกจากระบบโดยถาวร" : "This action cannot be undone. This entry will be permanently removed from the registry."}
            </AlertDialogDescription>
          </div>
          <div className="flex gap-3 w-full pt-2">
            <AlertDialogCancel className="flex-1 h-11 rounded-xl font-bold text-xs uppercase tracking-wider border-slate-200 bg-slate-50 dark:bg-slate-800 dark:text-slate-300">
              {lang === "th" ? "ยกเลิก" : "Abort"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg">
              {saving ? (lang === "th" ? "กำลังลบ..." : "Deleting...") : (lang === "th" ? "ยืนยันการลบ" : "Delete")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default PersonnelMappingAdmin;
