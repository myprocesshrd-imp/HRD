import { supabase } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";
import type { MockSurvey, SurveySection } from "@/lib/mock-data";

export type { MockSurvey, SurveySection };
export type SurveyStatus = "Active" | "Closed" | "Draft";

interface SupabaseSurvey {
  id: string;
  title_en: string;
  title_th: string;
  status: string;
  survey_type: string;
  start_date: string | null;
  end_date: string | null;
  target_responses: number;
  survey_sections?: { section_id: string; sections: { code: string } }[];
  survey_responses?: { status: string }[];
  demographic_fields?: Record<string, string[]> | null;
  created_by?: string | null;
  updated_at?: string | null;
  creator?: {
    id: string;
    name_en: string;
    name_th: string;
    employee_code: string;
  } | null;
}

function mapSupabaseSurvey(s: SupabaseSurvey): MockSurvey {
  return {
    id: s.id,
    titleEn: s.title_en,
    titleTh: s.title_th,
    status: (s.status.charAt(0).toUpperCase() + s.status.slice(1)) as MockSurvey["status"],
    surveyType: s.survey_type as MockSurvey["surveyType"],
    startDate: s.start_date ?? "—",
    endDate: s.end_date ?? "—",
    responses: 0,
    target: s.target_responses,
    sectionIds: [],
    demographicFields: s.demographic_fields ?? undefined,
    createdBy: s.created_by ?? undefined,
    creatorNameEn: s.creator?.name_en ?? undefined,
    creatorNameTh: s.creator?.name_th ?? undefined,
    creatorEmployeeCode: s.creator?.employee_code ?? undefined,
    updatedAt: s.updated_at ?? undefined,
  };
}

export async function getSurveys(): Promise<MockSurvey[]> {
  try {
    const { data, error } = await supabase
      .from("surveys")
      .select(`
        *,
        creator:users!created_by(id, name_en, name_th, employee_code),
        survey_sections!inner(section_id, sections(code)),
        survey_responses(status)
      `)
      .order("created_at", { ascending: false });
    
    if (!error && data && data.length > 0) {
      return data.map((s: SupabaseSurvey) => ({
        ...mapSupabaseSurvey(s),
        responses: s.survey_responses?.filter((r: any) => r.status === "completed").length || 0,
        sectionIds: s.survey_sections?.map((ss: Record<string, unknown>) => (ss.sections as { code?: string } | undefined)?.code ?? (ss.section_id as string)) ?? [],
      }));
    }
  } catch {}
  return [];
}

export async function getSurvey(id: string): Promise<MockSurvey | undefined> {
  try {
    const { data, error } = await supabase
      .from("surveys")
      .select(`
        *,
        creator:users!created_by(id, name_en, name_th, employee_code),
        survey_sections(section_id, sections!inner(code)),
        survey_responses(status)
      `)
      .eq("id", id)
      .single();

    if (!error && data) {
      return {
        ...mapSupabaseSurvey(data),
        responses: data.survey_responses?.filter((r: any) => r.status === "completed").length || 0,
        sectionIds: data.survey_sections?.map((ss: Record<string, unknown>) => (ss.sections as { code?: string } | undefined)?.code ?? ss.section_id as string) ?? [],
      };
    }
  } catch {}
  return undefined;
}


export async function getSections(): Promise<SurveySection[]> {
  try {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .order("sort_order");
    
    if (!error && data) {
      return data.map((s: any) => ({
        id: s.code,
        code: s.code,
        titleEn: s.title_en,
        titleTh: s.title_th,
        descEn: s.desc_en ?? "",
        descTh: s.desc_th ?? "",
        questions: [],
      }));
    }
  } catch {}
  return [];
}


export async function getSurveySections(surveyId: string): Promise<SurveySection[]> {
  try {
    const { data: sections, error } = await supabase
      .from("survey_sections")
      .select("section_id, sections:section_id(*)")
      .eq("survey_id", surveyId)
      .order("sort_order");
    if (!error && sections && sections.length > 0) {
      const result: SurveySection[] = [];
      for (const ss of sections) {
        const sec = Array.isArray(ss.sections) ? ss.sections[0] : ss.sections;
        if (!sec) continue;
        const { data: questions, error: qErr } = await supabase
          .from("questions")
          .select("*, question_choices(*), matrix_rows(*), matrix_columns(*)")
          .eq("section_id", (sec as { id: string }).id)
          .order("sort_order");
        if (qErr) continue;
        const s = sec as { code: string; title_en: string; title_th: string; desc_en: string; desc_th: string };
        result.push({
          id: s.code,
          titleEn: s.title_en,
          titleTh: s.title_th,
          descEn: s.desc_en ?? "",
          descTh: s.desc_th ?? "",
          questions: (questions ?? []).map((q: any) => ({
            id: q.id,
            type: q.type,
            textEn: q.text_en,
            textTh: q.text_th,
            descEn: q.desc_en ?? undefined,
            descTh: q.desc_th ?? undefined,
            required: q.required,
            category: q.category ?? undefined,
            minValue: q.min_value ?? undefined,
            maxValue: q.max_value ?? undefined,
            minChoices: q.min_choices ?? undefined,
            maxChoices: q.max_choices ?? undefined,
            choices: q.question_choices?.map((c: any) => ({
              value: c.value,
              labelEn: c.label_en,
              labelTh: c.label_th
            })) ?? undefined,
            rows: q.matrix_rows?.map((r: any) => ({
              textEn: r.label_en,
              textTh: r.label_th
            })) ?? undefined,
            columns: q.matrix_columns?.map((c: any) => ({
              value: c.value,
              labelEn: c.label_en,
              labelTh: c.label_th
            })) ?? undefined,
          })),
        });
      }
      if (result.length > 0) return result;
    }
  } catch {}
  return [];
}

export const OPEN_FEEDBACK = [
  { id: "F1", type: "open_text_long" as const, textEn: "What does the organization do well?", textTh: "องค์กรทำอะไรได้ดี?", required: false },
  { id: "F2", type: "open_text_long" as const, textEn: "What should the organization improve?", textTh: "องค์กรควรปรับปรุงเรื่องใด?", required: false },
  { id: "F3", type: "open_text_long" as const, textEn: "Additional suggestions or comments", textTh: "ข้อเสนอแนะหรือความคิดเห็นเพิ่มเติม", required: false },
];

async function resolveSectionCodes(codes: string[]): Promise<string[]> {
  if (codes.length === 0) return [];
  const { data: sections } = await supabase
    .from("sections")
    .select("id, code")
    .in("code", codes);
  if (!sections) return [];
  const map = new Map(sections.map((s: { id: string; code: string }) => [s.code, s.id]));
  return codes.map((code) => map.get(code)).filter(Boolean) as string[];
}

export async function createSurvey(data: {
  titleEn: string;
  titleTh: string;
  status: SurveyStatus;
  surveyType: "anonymous" | "identified";
  startDate: string;
  endDate: string;
  target: number;
  sectionIds: string[];
  demographicFields?: Record<string, string[]>;
}): Promise<string> {
  const sanitizeDate = (d?: string) => (d === "—" || !d ? null : d);
  const result = await invokeAdminService("SURVEY_CREATE", {
    title_en: data.titleEn,
    title_th: data.titleTh,
    status: data.status.toLowerCase(),
    survey_type: data.surveyType,
    start_date: sanitizeDate(data.startDate),
    end_date: sanitizeDate(data.endDate),
    target_responses: data.target,
    section_ids: data.sectionIds, // Handled inside Edge Function
    demographic_fields: data.demographicFields,
  });
  return result.id;
}

export async function updateSurvey(id: string, data: Partial<{
  titleEn: string;
  titleTh: string;
  status: SurveyStatus;
  surveyType: "anonymous" | "identified";
  startDate: string;
  endDate: string;
  target: number;
  sectionIds: string[];
  demographicFields?: Record<string, string[]>;
}>): Promise<void> {
  const sanitizeDate = (d?: string) => (d === "—" || !d ? null : d);

  await invokeAdminService("SURVEY_UPDATE", {
    id,
    title_en: data.titleEn,
    title_th: data.titleTh,
    status: data.status?.toLowerCase(),
    survey_type: data.surveyType,
    start_date: sanitizeDate(data.startDate),
    end_date: sanitizeDate(data.endDate),
    target_responses: data.target,
    section_ids: data.sectionIds,
    demographic_fields: data.demographicFields,
  });
}


export async function deleteSurvey(id: string): Promise<void> {
  await invokeAdminService("SURVEY_DELETE", { id });
}

export async function cloneSurvey(id: string): Promise<string> {
  const result = await invokeAdminService("SURVEY_CLONE", { id });
  return result.id;
}

