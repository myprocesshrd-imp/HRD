import { supabaseAdmin } from "@/lib/supabase";

export interface EngagementTrend {
  period: string;
  score: number;
}

export interface ResponseDistribution {
  rating: string;
  count: number;
}

export interface EngagementByDept {
  dept: string;
  score: number;
  responses: number;
}

export interface ParticipationByDept {
  dept: string;
  participation: number;
  total: number;
}


export interface CategoryScore {
  category: string;
  score: number;
}

export interface HeatmapData {
  dept: string;
  A: number;
  B: number;
  C: number;
  [key: string]: string | number;
}

export interface WordFreq {
  text: string;
  value: number;
}


export async function getEngagementTrend(): Promise<EngagementTrend[]> {
  try {
    // In a real scenario, this would aggregate by quarter/month
    // For now, we'll try to fetch some real averages if data exists
    const { data, error } = await supabaseAdmin
      .from("response_answers")
      .select("numeric_value, created_at")
      .not("numeric_value", "is", null);

    if (error || !data || data.length === 0) return [];

    // Simple aggregation by month for demonstration
    const months: Record<string, { sum: number; count: number }> = {};
    data.forEach((row) => {
      const date = new Date(row.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { sum: 0, count: 0 };
      months[key].sum += row.numeric_value as number;
      months[key].count += 1;
    });

    return Object.entries(months)
      .map(([period, stats]) => ({
        period,
        score: Number((stats.sum / stats.count).toFixed(2)),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  } catch {
    return [];
  }
}

export async function getResponseDistribution(): Promise<ResponseDistribution[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("response_answers")
      .select("numeric_value")
      .not("numeric_value", "is", null);

    if (error || !data || data.length === 0) return [];

    const counts: Record<number, number> = {};
    data.forEach((row) => {
      const val = row.numeric_value as number;
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([rating, count]) => ({
        rating: `${rating} Stars`,
        count,
      }))
      .sort((a, b) => a.rating.localeCompare(b.rating));
  } catch {
    return [];
  }
}

export async function getCategoryScores(): Promise<CategoryScore[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("response_answers")
      .select(`
        numeric_value,
        questions!inner(category)
      `)
      .not("numeric_value", "is", null);

    if (error || !data || data.length === 0) return [];

    const cats: Record<string, { sum: number; count: number }> = {};
    data.forEach((row) => {
      const cat = (row.questions as unknown as { category: string }).category || "Other";
      if (!cats[cat]) cats[cat] = { sum: 0, count: 0 };
      cats[cat].sum += row.numeric_value as number;
      cats[cat].count += 1;
    });

    return Object.entries(cats).map(([category, stats]) => ({
      category,
      score: Number((stats.sum / stats.count).toFixed(2)),
    }));
  } catch {
    return [];
  }
}

export async function getHeatmapData(): Promise<HeatmapData[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("survey_responses")
      .select(`
        demographics,
        response_answers(
          numeric_value,
          questions!inner(section_id, sections!inner(code))
        )
      `)
      .eq("status", "completed");

    if (error || !data || data.length === 0) return [];

    const deptMap: Record<string, Record<string, { sum: number; count: number }>> = {};

    data.forEach((resp) => {
      const dept = (resp.demographics as Record<string, string>)?.department || "Unknown";
      if (!deptMap[dept]) deptMap[dept] = {};

      (resp.response_answers as any[]).forEach((ans) => {
        if (ans.numeric_value === null) return;
        const sectionCode = ans.questions.sections.code;
        if (!deptMap[dept][sectionCode]) deptMap[dept][sectionCode] = { sum: 0, count: 0 };
        deptMap[dept][sectionCode].sum += ans.numeric_value;
        deptMap[dept][sectionCode].count += 1;
      });
    });

    return Object.entries(deptMap).map(([dept, sections]) => {
      const row: HeatmapData = { dept, A: 0, B: 0, C: 0 };
      Object.entries(sections).forEach(([code, stats]) => {
        row[code] = Number((stats.sum / stats.count).toFixed(1));
      });
      return row;
    });
  } catch {
    return [];
  }
}

export async function getWordFrequency(surveyId?: string): Promise<WordFreq[]> {
  try {
    let query = supabaseAdmin
      .from("response_answers")
      .select(`
        text_value,
        survey_responses!inner(survey_id)
      `)
      .not("text_value", "is", null);

    if (surveyId) {
      query = query.eq("survey_responses.survey_id", surveyId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) return [];

    const words: Record<string, number> = {};
    const stopWords = new Set(["the", "and", "a", "is", "to", "in", "it", "of", "for", "with", "as", "at", "on", "this", "that", "be", "have", "not", "but", "are", "by", "or", "an"]);

    data.forEach((row) => {
      const text = row.text_value as string;
      const tokens = text.toLowerCase().split(/[^a-zA-Z0-9ก-๙]+/).filter(t => t.length > 2);
      tokens.forEach(t => {
        if (!stopWords.has(t)) {
          words[t] = (words[t] || 0) + 1;
        }
      });
    });

    return Object.entries(words)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);
  } catch {
    return [];
  }
}

export async function getEngagementByDept(surveyId?: string): Promise<EngagementByDept[]> {
  try {
    let query = supabaseAdmin
      .from("survey_responses")
      .select(`
        demographics,
        response_answers(numeric_value)
      `)
      .eq("status", "completed");

    if (surveyId) {
      query = query.eq("survey_id", surveyId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return [];

    const depts: Record<string, { sum: number; count: number; responses: number }> = {};
    data.forEach((resp) => {
      const dept = (resp.demographics as Record<string, string>)?.department || "Unknown";
      if (!depts[dept]) depts[dept] = { sum: 0, count: 0, responses: 0 };
      depts[dept].responses += 1;
      (resp.response_answers as any[]).forEach((ans) => {
        if (ans.numeric_value !== null) {
          depts[dept].sum += ans.numeric_value;
          depts[dept].count += 1;
        }
      });
    });

    return Object.entries(depts).map(([dept, stats]) => ({
      dept,
      score: stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : 0,
      responses: stats.responses,
    }));
  } catch {
    return [];
  }
}


