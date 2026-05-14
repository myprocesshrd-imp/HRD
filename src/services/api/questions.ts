import { supabase, supabaseAdmin } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";
import { QUESTION_BANK as MOCK_QUESTION_BANK } from "@/lib/mock-data";
import type { SurveySection, Question, QuestionType, QuestionChoice } from "@/lib/mock-data";

export type { SurveySection, Question, QuestionType, QuestionChoice };

export async function getQuestionBank(): Promise<SurveySection[]> {
  try {
    const { data: sections, error } = await supabaseAdmin
      .from("sections")
      .select("*")
      .order("sort_order");
    if (!error && sections && sections.length > 0) {
      const result: SurveySection[] = [];
      for (const sec of sections) {
        const { data: questions, error: qErr } = await supabaseAdmin
          .from("questions")
          .select("*, question_choices(*), matrix_rows(*), matrix_columns(*)")
          .eq("section_id", sec.id)
          .order("sort_order");
        if (qErr) continue;
        result.push({
          id: sec.code,
          titleEn: sec.title_en,
          titleTh: sec.title_th,
          descEn: sec.desc_en ?? "",
          descTh: sec.desc_th ?? "",
          questions: (questions ?? []).map((q: any) => ({
            id: q.id,
            type: q.type as QuestionType,
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

export async function createSection(data: {
  code: string;
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  businessUnitId?: string;
}): Promise<string> {
  const result = await invokeAdminService("SECTION_CREATE", {
    code: data.code,
    title_en: data.titleEn,
    title_th: data.titleTh,
    desc_en: data.descEn,
    desc_th: data.descTh,
    business_unit_id: data.businessUnitId || null,
  });
  return result.code;
}

export async function updateSection(code: string, data: {
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  businessUnitId?: string;
}): Promise<void> {
  await invokeAdminService("SECTION_UPDATE", {
    code,
    data: {
      title_en: data.titleEn,
      title_th: data.titleTh,
      desc_en: data.descEn,
      desc_th: data.descTh,
      business_unit_id: data.businessUnitId || null,
    },
  });
}

export async function deleteSection(code: string): Promise<void> {
  await invokeAdminService("SECTION_DELETE", { code });
}

export async function createQuestion(question: {
  sectionCode: string;
  type: QuestionType;
  textEn: string;
  textTh: string;
  descEn?: string;
  descTh?: string;
  required: boolean;
  category?: string;
  minValue?: number;
  maxValue?: number;
  choices?: { value: string; labelEn: string; labelTh: string }[];
  rows?: { textEn: string; textTh: string }[];
  columns?: { value: string; labelEn: string; labelTh: string }[];
}): Promise<void> {
  await invokeAdminService("QUESTION_CREATE", {
    sectionCode: question.sectionCode,
    type: question.type,
    text_en: question.textEn,
    text_th: question.textTh,
    desc_en: question.descEn ?? null,
    desc_th: question.descTh ?? null,
    required: question.required,
    category: question.category ?? null,
    min_value: question.minValue ?? null,
    max_value: question.maxValue ?? null,
    choices: question.choices?.map((c) => ({
      value: c.value,
      label_en: c.labelEn,
      label_th: c.labelTh,
    })),
    rows: question.rows?.map((r) => ({
      label_en: r.textEn,
      label_th: r.textTh,
    })),
    columns: question.columns?.map((c) => ({
      value: c.value,
      label_en: c.labelEn,
      label_th: c.labelTh,
    })),
  });
}

export async function updateQuestion(id: string, question: {
  type: QuestionType;
  textEn: string;
  textTh: string;
  descEn?: string;
  descTh?: string;
  required: boolean;
  category?: string;
  minValue?: number;
  maxValue?: number;
  choices?: { value: string; labelEn: string; labelTh: string }[];
  rows?: { textEn: string; textTh: string }[];
  columns?: { value: string; labelEn: string; labelTh: string }[];
}): Promise<void> {
  await invokeAdminService("QUESTION_UPDATE", {
    id,
    type: question.type,
    text_en: question.textEn,
    text_th: question.textTh,
    desc_en: question.descEn ?? null,
    desc_th: question.descTh ?? null,
    required: question.required,
    category: question.category ?? null,
    min_value: question.minValue ?? null,
    max_value: question.maxValue ?? null,
    choices: question.choices?.map((c) => ({
      value: c.value,
      label_en: c.labelEn,
      label_th: c.labelTh,
    })),
    rows: question.rows?.map((r) => ({
      label_en: r.textEn,
      label_th: r.textTh,
    })),
    columns: question.columns?.map((c) => ({
      value: c.value,
      label_en: c.labelEn,
      label_th: c.labelTh,
    })),
  });
}

export async function deleteQuestion(id: string): Promise<void> {
  await invokeAdminService("QUESTION_DELETE", { id });
}

export async function reorderQuestions(sectionCode: string, questionIds: string[]): Promise<void> {
  await invokeAdminService("QUESTION_REORDER", { sectionCode, questionIds });
}

export async function moveQuestion(questionId: string, targetSectionCode: string): Promise<void> {
  await invokeAdminService("QUESTION_MOVE", { questionId, targetSectionCode });
}
