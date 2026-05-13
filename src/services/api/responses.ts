import { supabaseAdmin } from "@/lib/supabase";

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
    const { data: response, error: rErr } = await supabaseAdmin
      .from("survey_responses")
      .insert([{
        survey_id: params.surveyId,
        user_id: params.userId ?? null,
        anonymous_token: params.anonymousToken ?? null,
        status: "completed",
        completed_at: new Date().toISOString(),
        demographics: params.demographics ?? null,
        time_spent_seconds: params.timeSpentSeconds ?? null,
      }])
      .select("id")
      .single();
    if (rErr || !response) return null;
    if (params.answers.length > 0) {
      await supabaseAdmin.from("response_answers").insert(
        params.answers.map((a) => ({
          response_id: response.id,
          question_id: a.questionId,
          numeric_value: a.numericValue ?? null,
          text_value: a.textValue ?? null,
          array_text_value: a.arrayTextValue ?? null,
          jsonb_value: a.jsonbValue ?? null,
        }))
      );
    }
    if (params.feedback && params.feedback.length > 0) {
      await supabaseAdmin.from("response_feedback").insert(
        params.feedback.map((f) => ({
          response_id: response.id,
          question_id: f.questionId,
          text_value: f.textValue,
        }))
      );
    }
    return response.id;
  } catch {}
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

export async function getSurveyResponses(surveyId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from("survey_responses")
      .select("*, response_answers(*)")
      .eq("survey_id", surveyId)
      .eq("status", "completed");
    if (!error && data) return data;
  } catch {}
  return [];
}
