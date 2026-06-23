/**
 * sss.ts — Service layer for Say–Stay–Strive scoring.
 * ⚠️  ADMIN-ONLY — uses supabaseAdmin (service_role).
 * Must NOT be imported by any employee-facing component or survey flow.
 */
import { supabaseAdmin } from "@/lib/supabase";
import { invokeAdminService } from "./admin-helper";
import type { SssDimension, SssQuestionMapping, SssScoreResult, SssAggregateResult } from "@/lib/sss-config";
import { calculateSssFromAnswers, aggregateSssScores } from "@/lib/sss-config";

export type { SssDimension, SssQuestionMapping, SssScoreResult, SssAggregateResult };

// ── Read ────────────────────────────────────────────────────────────────────

/**
 * Fetch all SSS mappings (admin-only, reads via service_role).
 */
export async function getSssMappings(): Promise<SssQuestionMapping[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("sss_question_mappings")
      .select("*")
      .order("sss_dimension")
      .order("created_at");
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      questionId: r.question_id,
      dimension: r.sss_dimension as SssDimension,
      weight: Number(r.weight),
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch aggregated SSS scores for a survey (admin dashboard).
 */
export async function getSssAggregateForSurvey(surveyId: string): Promise<SssAggregateResult> {
  try {
    const query = surveyId === "all"
      ? supabaseAdmin.from("sss_response_scores").select("say_score,stay_score,strive_score,overall_score")
      : supabaseAdmin.from("sss_response_scores").select("say_score,stay_score,strive_score,overall_score").eq("survey_id", surveyId);

    const { data, error } = await query;
    if (error || !data) return { say: null, stay: null, strive: null, overall: null, respondents: 0 };

    const results: SssScoreResult[] = data.map((r: any) => ({
      say:     r.say_score !== null ? Number(r.say_score) : null,
      stay:    r.stay_score !== null ? Number(r.stay_score) : null,
      strive:  r.strive_score !== null ? Number(r.strive_score) : null,
      overall: r.overall_score !== null ? Number(r.overall_score) : null,
    }));
    return aggregateSssScores(results);
  } catch {
    return { say: null, stay: null, strive: null, overall: null, respondents: 0 };
  }
}

// ── Write (via admin-service Edge Function) ──────────────────────────────────

/**
 * Upsert a mapping: add or update a question → dimension assignment.
 */
export async function upsertSssMapping(
  questionId: string,
  dimension: SssDimension,
  weight = 1.0
): Promise<void> {
  await invokeAdminService("SSS_MAPPING_UPSERT", { questionId, dimension, weight });
}

/**
 * Toggle is_active on an existing mapping.
 */
export async function toggleSssMapping(id: string, isActive: boolean): Promise<void> {
  await invokeAdminService("SSS_MAPPING_TOGGLE", { id, isActive });
}

/**
 * Remove a mapping entirely.
 */
export async function deleteSssMapping(id: string): Promise<void> {
  await invokeAdminService("SSS_MAPPING_DELETE", { id });
}

/**
 * Update weight of an existing mapping.
 */
export async function updateSssMappingWeight(id: string, weight: number): Promise<void> {
  await invokeAdminService("SSS_MAPPING_UPDATE_WEIGHT", { id, weight });
}

// ── Score calculation (called after survey submit) ───────────────────────────

/**
 * Calculate and persist SSS scores for a just-submitted response.
 * Called from responses.ts after submitSurveyResponse succeeds.
 * Runs entirely server-side — employee browser never sees this call's result.
 */
export async function computeAndStoreSssScore(
  responseId: string,
  surveyId: string,
  answers: Record<string, number | string | null>
): Promise<void> {
  try {
    // 1. Fetch active mappings (server-side)
    const mappings = await getSssMappings();
    const activeMappings = mappings.filter(m => m.isActive);
    if (activeMappings.length === 0) return;

    // 2. Calculate
    const scores = calculateSssFromAnswers(answers, activeMappings);

    // 3. Persist (upsert in case of retry)
    await supabaseAdmin.from("sss_response_scores").upsert(
      {
        response_id:   responseId,
        survey_id:     surveyId,
        say_score:     scores.say,
        stay_score:    scores.stay,
        strive_score:  scores.strive,
        overall_score: scores.overall,
        calculated_at: new Date().toISOString(),
      },
      { onConflict: "response_id" }
    );
  } catch (err) {
    // Non-blocking — survey submit must not fail due to SSS errors
    console.error("[SSS] computeAndStoreSssScore error:", err);
  }
}

/**
 * Batch recalculate SSS scores for ALL existing completed responses.
 * Called from admin UI when "Recalculate All Scores" is clicked.
 */
export async function recalculateSssAll(): Promise<void> {
  try {
    const activeMappings = (await getSssMappings()).filter(m => m.isActive);
    if (activeMappings.length === 0) return;

    const { data: responses, error } = await supabaseAdmin
      .from("survey_responses")
      .select(`id, survey_id, response_answers(question_id, numeric_value, text_value)`)
      .eq("status", "completed");

    if (error || !responses) {
      console.error("[SSS] recalculateSssAll fetch error:", error);
      return;
    }

    for (const resp of responses) {
      const answers: Record<string, number | string | null> = {};
      const ra = resp.response_answers as { question_id: string; numeric_value: number | null; text_value: string | null }[] | null;
      if (ra) {
        for (const a of ra) {
          answers[a.question_id] = a.numeric_value ?? a.text_value ?? null;
        }
      }

      const scores = calculateSssFromAnswers(answers, activeMappings);
      await supabaseAdmin.from("sss_response_scores").upsert(
        {
          response_id:   resp.id,
          survey_id:     resp.survey_id,
          say_score:     scores.say,
          stay_score:    scores.stay,
          strive_score:  scores.strive,
          overall_score: scores.overall,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: "response_id" }
      );
    }
  } catch (err) {
    console.error("[SSS] recalculateSssAll error:", err);
  }
}
