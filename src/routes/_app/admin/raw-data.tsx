import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Database, Search, Filter, Download, 
  ChevronRight, ChevronLeft, ArrowUpDown, Eye, Trash2,
  Calendar, Building2, UserCircle2, Layers,
  CheckCircle2, AlertCircle, Clock, ExternalLink
} from "lucide-react";
import { 
  getSurveyResponses, 
  getSurveys, 
  getSurveySections,
  type MockSurvey,
  type SurveySection 
} from "@/services/api";
import { cn } from "@/lib/utils";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/admin/raw-data")({
  component: RawDataPage,
});

function RawDataPage() {
  const { t, lang } = useI18n();
  const [responses, setResponses] = useState<any[]>([]);
  const [surveys, setSurveys] = useState<MockSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSurvey, setSelectedSurvey] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [viewingResponse, setViewingResponse] = useState<any | null>(null);
  const [allQuestions, setAllQuestions] = useState<any[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "completed_at",
    direction: "desc",
  });

  async function loadData() {
    setLoading(true);
    try {
      console.log("Fetching raw data...");
      const [surveysRes, initialResponses] = await Promise.all([
        getSurveys(),
        getSurveyResponses("all")
      ]);
      
      console.log(`Loaded ${surveysRes.length} surveys and ${initialResponses.length} responses.`);
      setSurveys(surveysRes);
      setResponses(initialResponses);

      if (surveysRes.length > 0) {
        const sectionsPromises = surveysRes.map(s => getSurveySections(s.id));
        const allSecs = await Promise.all(sectionsPromises);
        const questionsMap: any[] = [];
        allSecs.flat().forEach(sec => {
          sec.questions.forEach(q => {
            if (!questionsMap.find(item => item.id === q.id)) {
              questionsMap.push({
                id: q.id,
                textEn: q.textEn,
                textTh: q.textTh,
                choices: q.choices,
                sectionTitleEn: sec.titleEn,
                sectionTitleTh: sec.titleTh
              });
            }
          });
        });
        setAllQuestions(questionsMap);
      }
    } catch (err) {
      console.error("Critical error loading raw data:", err);
      toast.error("Failed to load raw data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const departments = useMemo(() => {
    const depts = new Set<string>();
    responses.forEach(r => {
      const dept = r.demographics?.department || r.demographics?.dept;
      if (dept) depts.add(dept);
    });
    return Array.from(depts).sort();
  }, [responses]);

  const sortedAndFilteredResponses = useMemo(() => {
    let result = responses.filter(r => {
      const matchesSearch = !search || 
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        (r.demographics?.department || "").toLowerCase().includes(search.toLowerCase());
      
      const matchesSurvey = selectedSurvey === "all" || r.survey_id === selectedSurvey;
      
      const dept = r.demographics?.department || r.demographics?.dept;
      const matchesDept = selectedDept === "all" || dept === selectedDept;
      
      return matchesSearch && matchesSurvey && matchesDept;
    });

    result.sort((a, b) => {
      let aVal: any = a[sortConfig.key];
      let bVal: any = b[sortConfig.key];

      if (sortConfig.key === "survey") {
        aVal = surveys.find(s => s.id === a.survey_id)?.titleEn || "";
        bVal = surveys.find(s => s.id === b.survey_id)?.titleEn || "";
      } else if (sortConfig.key === "dept") {
        aVal = a.demographics?.department || a.demographics?.dept || "";
        bVal = b.demographics?.department || b.demographics?.dept || "";
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [responses, search, selectedSurvey, selectedDept, sortConfig, surveys]);

  const paginatedResponses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAndFilteredResponses.slice(start, start + pageSize);
  }, [sortedAndFilteredResponses, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAndFilteredResponses.length / pageSize);

  const toggleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  };

  const exportData = () => {
    const dataToExport = sortedAndFilteredResponses.map(r => {
      const answers: any = {};
      r.response_answers?.forEach((ans: any) => {
        const q = allQuestions.find(q => q.id === ans.question_id);
        const qText = q ? (lang === "th" ? q.textTh : q.textEn) : ans.question_id;
        answers[qText] = ans.numeric_value || ans.text_value;
      });

      return {
        id: r.id,
        survey: surveys.find(s => s.id === r.survey_id)?.titleEn || "Unknown",
        department: r.demographics?.department || "N/A",
        location: r.demographics?.location || "N/A",
        completedAt: r.completed_at,
        ...answers
      };
    });

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `survey-raw-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    toast.success("Export successful");
  };

  // Group answers by category for detail view
  const groupedAnswers = useMemo(() => {
    if (!viewingResponse) return {};
    const groups: Record<string, any[]> = {};
    viewingResponse.response_answers?.forEach((ans: any) => {
      const q = allQuestions.find(q => q.id === ans.question_id);
      const cat = q ? (lang === "th" ? q.sectionTitleTh : q.sectionTitleEn) : "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ ...ans, question: q });
    });
    return groups;
  }, [viewingResponse, allQuestions, lang]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loading Raw Intel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Database className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Raw Data Repository</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Survey Response Data</h1>
          <p className="text-[14px] font-medium text-slate-400">
            {lang === "th" ? "ข้อมุลดิบรายคนเพื่อการตรวจสอบความถูกต้อง" : "Detailed response-level data for cross-verification."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={loadData}
            className="rounded-xl h-11 px-6 border-slate-200 text-xs font-bold uppercase tracking-wider"
          >
            <Clock className="w-4 h-4 mr-2" />
            {lang === "th" ? "รีเฟรช" : "Refresh"}
          </Button>
          <Button 
            onClick={exportData}
            className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 px-6 shadow-lg shadow-slate-900/10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            {t("common.export")} JSON
          </Button>
        </div>
      </div>

      <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardHeader className="border-b border-slate-50 bg-slate-50/30 p-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder={lang === "th" ? "ค้นหา ID หรือ หน่วยงาน..." : "Search ID or Department..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            
            <Select value={selectedSurvey} onValueChange={setSelectedSurvey}>
              <SelectTrigger className="w-[200px] h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="All Surveys" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                <SelectItem value="all">All Surveys</SelectItem>
                {surveys.map(s => (
                  <SelectItem key={s.id} value={s.id}>{lang === "th" ? s.titleTh : s.titleEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[180px] h-11 rounded-xl border-slate-200 bg-white">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 ml-auto bg-white px-4 py-2.5 rounded-xl border border-slate-100 shadow-inner">
               <Layers className="w-3.5 h-3.5" />
               TOTAL: {sortedAndFilteredResponses.length}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 hover:bg-transparent">
                <TableHead 
                  className="w-[120px] font-bold uppercase tracking-widest text-[10px] py-5 cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort("id")}
                >
                  <div className="flex items-center gap-1">
                    ID {sortConfig.key === "id" && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort("survey")}
                >
                  <div className="flex items-center gap-1">
                    Survey {sortConfig.key === "survey" && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort("dept")}
                >
                  <div className="flex items-center gap-1">
                    Department {sortConfig.key === "dept" && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold uppercase tracking-widest text-[10px] cursor-pointer hover:text-primary transition-colors"
                  onClick={() => toggleSort("completed_at")}
                >
                  <div className="flex items-center gap-1">
                    Date {sortConfig.key === "completed_at" && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResponses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                     <div className="flex flex-col items-center gap-2 opacity-30">
                        <Database className="w-10 h-10" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">No matching records found</span>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedResponses.map((r) => (
                  <TableRow key={r.id} className="group border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <TableCell className="font-mono text-[11px] font-medium text-slate-500">
                      {r.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-semibold text-slate-900 text-sm">
                      {surveys.find(s => s.id === r.survey_id)?.titleEn || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50/50 text-blue-600 border-blue-100 rounded-lg px-2.5 py-0.5 text-[11px] font-bold">
                        {r.demographics?.department || r.demographics?.dept || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(r.completed_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                        onClick={() => setViewingResponse(r)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Showing {Math.min(sortedAndFilteredResponses.length, (currentPage - 1) * pageSize + 1)} - {Math.min(sortedAndFilteredResponses.length, currentPage * pageSize)} of {sortedAndFilteredResponses.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="h-8 w-8 p-0 rounded-lg border-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1; // Simplistic pagination for now
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-8 w-8 p-0 rounded-lg text-[10px] font-bold",
                        currentPage === pageNum ? "bg-primary text-white" : "border-slate-200 text-slate-600"
                      )}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && <span className="text-slate-400 px-1">...</span>}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="h-8 w-8 p-0 rounded-lg border-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewingResponse} onOpenChange={() => setViewingResponse(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-6 bg-slate-900 text-white relative shrink-0">
             <div className="absolute top-0 right-0 p-6 opacity-5">
                <Database className="w-24 h-24" />
             </div>
            <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-2 text-primary">
                 <UserCircle2 className="w-3.5 h-3.5" />
                 <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Full Intel Profile</span>
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">Response Details</DialogTitle>
              <DialogDescription className="text-slate-400 font-medium text-[10px]">
                ID: {viewingResponse?.id}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-3 bg-slate-50 border-y border-slate-100 shrink-0">
             <div className="p-3 border-r border-slate-100 flex flex-col gap-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Department</span>
                <span className="text-xs font-bold text-slate-900">{viewingResponse?.demographics?.department || "N/A"}</span>
             </div>
             <div className="p-3 border-r border-slate-100 flex flex-col gap-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Location</span>
                <span className="text-xs font-bold text-slate-900">{viewingResponse?.demographics?.location || "N/A"}</span>
             </div>
             <div className="p-3 flex flex-col gap-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Submission Date</span>
                <span className="text-xs font-bold text-slate-900 truncate">{viewingResponse && new Date(viewingResponse.completed_at).toLocaleString()}</span>
             </div>
          </div>

          <div className="flex-1 flex flex-row min-h-0 bg-white">
            <Tabs 
              defaultValue={Object.keys(groupedAnswers).sort((a, b) => {
                const numA = parseInt(a.match(/^\d+/)?.[0] || "999");
                const numB = parseInt(b.match(/^\d+/)?.[0] || "999");
                return numA - numB;
              })[0]} 
              className="flex-1 flex flex-row"
            >
              {/* Vertical Sidebar Tabs */}
              <div className="w-[280px] border-r border-slate-100 bg-slate-50/50 shrink-0 overflow-y-auto p-4">
                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                  {Object.keys(groupedAnswers)
                    .sort((a, b) => {
                      const numA = parseInt(a.match(/^\d+/)?.[0] || "999");
                      const numB = parseInt(b.match(/^\d+/)?.[0] || "999");
                      return numA - numB;
                    })
                    .map(cat => (
                    <TabsTrigger 
                      key={cat} 
                      value={cat}
                      className="w-full justify-start text-left rounded-xl text-[11px] font-bold px-4 py-3 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-slate-200 transition-all border border-transparent whitespace-normal h-auto items-start"
                    >
                      <div className="flex flex-col gap-0.5">
                         <span className="opacity-50 text-[9px] mb-0.5">SECTION {cat.match(/^\d+/)?.[0] || "—"}</span>
                         <span className="leading-tight">{cat.replace(/^\d+\.\s*/, "")}</span>
                      </div>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 min-h-0 overflow-hidden bg-white">
                <ScrollArea className="h-full px-10 py-8">
                  {Object.entries(groupedAnswers).map(([cat, answers]) => (
                    <TabsContent key={cat} value={cat} className="mt-0 space-y-8 pb-10">
                      <div className="mb-10 space-y-1">
                         <h3 className="text-lg font-bold text-slate-900 tracking-tight">{cat}</h3>
                         <div className="h-1 w-12 bg-primary rounded-full" />
                      </div>
                      
                      {answers
                        .sort((a, b) => (a.question?.sort_order || 0) - (b.question?.sort_order || 0))
                        .map((ans: any, idx: number) => {
                        const isPositive = ans.numeric_value >= 4;
                        const isWarning = ans.numeric_value <= 2;
                        
                        return (
                          <div key={ans.id} className="relative pl-8 border-l-2 border-slate-100 group">
                            <div className={cn(
                              "absolute -left-[5px] top-1 w-2 h-2 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-125",
                              isPositive ? "bg-emerald-500" : isWarning ? "bg-rose-500" : "bg-blue-500"
                            )} />
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-slate-800 leading-tight">
                                {ans.question ? (lang === "th" ? ans.question.textTh : ans.question.textEn) : `Question ID: ${ans.question_id}`}
                              </h4>
                              
                              <div className="flex flex-wrap items-center gap-3">
                                {ans.numeric_value !== null && (
                                  <Badge className={cn(
                                    "h-8 px-4 rounded-lg font-bold text-xs shadow-sm",
                                    ans.numeric_value >= 5 ? "bg-emerald-500 text-white" :
                                    ans.numeric_value >= 4 ? "bg-emerald-400 text-white" :
                                    ans.numeric_value >= 2 ? "bg-rose-400 text-white" : "bg-rose-600 text-white"
                                  )}>
                                    Score: {ans.numeric_value}
                                  </Badge>
                                )}
                                <div className="px-4 py-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-medium text-slate-600 italic max-w-full">
                                   Value: "{ans.text_value || ans.numeric_value || "—"}"
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>
                  ))}
                </ScrollArea>
              </div>
            </Tabs>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
            <Button 
              variant="outline" 
              onClick={() => setViewingResponse(null)}
              className="h-9 px-8 rounded-xl font-bold uppercase tracking-wider text-[10px]"
            >
              Close Intel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

