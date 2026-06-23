import { supabaseAdmin } from "@/lib/supabase";
import { computeAndStoreSssScore } from "./sss";

export interface AnswerStore {
  questionId: string;
  numericValue?: number | null;
  textValue?: string | null;
  arrayTextValue?: string[] | null;
  jsonbValue?: Record<string, string> | null;
}

export async function submitSurveyResponse(params: {
  surveyId: string;
  userId?: string | null;
  anonymousToken?: string;
  answers: AnswerStore[];
  feedback?: { questionId: string; textValue: string }[];
  demographics?: Record<string, string>;
  timeSpentSeconds?: number;
}): Promise<string | null> {
  try {
    // Resolve employeeCode (string) → real Supabase UUID
    let resolvedUserId: string | null = null;
    if (params.userId) {
      const { data: userRecord } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("employee_code", params.userId)
        .maybeSingle();
      if (userRecord) resolvedUserId = userRecord.id;
    }

    const { data: response, error: rErr } = await supabaseAdmin
      .from("survey_responses")
      .insert([{
        survey_id: params.surveyId,
        user_id: resolvedUserId,
        anonymous_token: params.anonymousToken ?? null,
        status: "completed",
        completed_at: new Date().toISOString(),
        demographics: params.demographics ?? null,
        time_spent_seconds: params.timeSpentSeconds ?? null,
      }])
      .select("id")
      .single();
    if (rErr || !response) {
      console.error("[submitSurveyResponse] Insert error:", rErr);
      return null;
    }
    if (params.answers.length > 0) {
      const { error: aErr } = await supabaseAdmin.from("response_answers").insert(
        params.answers.map((a) => ({
          response_id: response.id,
          question_id: a.questionId,
          numeric_value: a.numericValue ?? null,
          text_value: a.textValue ?? null,
          array_text_value: a.arrayTextValue ?? null,
          jsonb_value: a.jsonbValue ?? null,
        }))
      );
      if (aErr) console.error("[submitSurveyResponse] Answers insert error:", aErr);

      const answersMap: Record<string, number | string | null> = {};
      for (const a of params.answers) {
        answersMap[a.questionId] = a.numericValue ?? a.textValue ?? null;
      }
      computeAndStoreSssScore(response.id, params.surveyId, answersMap);
    }
    if (params.feedback && params.feedback.length > 0) {
      const { error: fErr } = await supabaseAdmin.from("response_feedback").insert(
        params.feedback.map((f) => ({
          response_id: response.id,
          question_id: f.questionId,
          text_value: f.textValue,
        }))
      );
      if (fErr) console.error("[submitSurveyResponse] Feedback insert error:", fErr);
    }
    return response.id;
  } catch (err) {
    console.error("[submitSurveyResponse] Unexpected error:", err);
  }
  return null;
}

export async function getSurveyResponseCount(surveyId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from("survey_responses")
      .select("*", { count: "exact", head: true })
      .eq("survey_id", surveyId)
      .eq("status", "completed");
    if (!error && count !== null) return count;
  } catch {}
  return 0;
}

export async function getSurveyResponses(surveyId?: string) {
  try {
    let query = supabaseAdmin
      .from("survey_responses")
      .select("*, response_answers(*)")
      .eq("status", "completed");
    
    if (surveyId && surveyId !== "all") {
      query = query.eq("survey_id", surveyId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase error fetching responses:", error);
    }
    if (!error && data) return data;
  } catch (err) {
    console.error("Unexpected error in getSurveyResponses:", err);
  }
  return [];
}

export interface DetailAnswer {
  id: string;
  numeric_value: number | null;
  text_value: string | null;
  array_text_value: string[] | null;
  jsonb_value: Record<string, string> | null;
  question: {
    id: string;
    text_en: string;
    text_th: string;
    type: string;
    section: { title_en: string; title_th: string } | null;
  } | null;
}

export interface DetailFeedback {
  id: string;
  question_id: string;
  text_value: string;
  questions: { text_en: string; text_th: string } | null;
}

export async function getResponseDetail(responseId: string): Promise<{
  answers: DetailAnswer[];
  feedback: DetailFeedback[];
}> {
  try {
    const [answersRes, feedbackRes] = await Promise.all([
      supabaseAdmin
        .from("response_answers")
        .select(`
          id,
          numeric_value,
          text_value,
          array_text_value,
          jsonb_value,
          question:questions(
            id, text_en, text_th, type,
            section:sections(title_en, title_th)
          )
        `)
        .eq("response_id", responseId),
      supabaseAdmin
        .from("response_feedback")
        .select("id, question_id, text_value, questions(text_en, text_th)")
        .eq("response_id", responseId),
    ]);
    return {
      answers: (answersRes.data ?? []) as DetailAnswer[],
      feedback: (feedbackRes.data ?? []) as DetailFeedback[],
    };
  } catch (err) {
    console.error("getResponseDetail error:", err);
    return { answers: [], feedback: [] };
  }
}
