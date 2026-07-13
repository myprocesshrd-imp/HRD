import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { action, payload, actorId } = await req.json();

    // Basic Authorization Check
    // We check if the 'actorId' (employeeCode) has admin rights
    const { data: actor, error: actorError } = await supabaseClient
      .from("users")
      .select("id, role")
      .eq("employee_code", actorId)
      .single();

    if (actorError || !actor || !["super_admin", "hr_admin"].includes(actor.role)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: any = null;
    let error: any = null;

    const resolveSectionCodes = async (codes: string[]) => {
      if (!codes || codes.length === 0) return [];
      const { data: sections } = await supabaseClient
        .from("sections")
        .select("id, code")
        .in("code", codes);
      if (!sections) return [];
      const map = new Map(sections.map((s: any) => [s.code, s.id]));
      return codes.map((code) => map.get(code)).filter(Boolean) as string[];
    };

    const updateSurveySections = async (surveyId: string, sectionCodes: string[]) => {
      await supabaseClient.from("survey_sections").delete().eq("survey_id", surveyId);
      if (sectionCodes.length > 0) {
        const uuids = await resolveSectionCodes(sectionCodes);
        await supabaseClient.from("survey_sections").insert(
          uuids.map((sid, i) => ({
            survey_id: surveyId,
            section_id: sid,
            sort_order: i,
          }))
        );
      }
    };

    const getSurveySectionCodes = async (surveyId: string) => {
      const { data } = await supabaseClient
        .from("survey_sections")
        .select("sections(code)")
        .eq("survey_id", surveyId);
      return data?.map((s: any) => s.sections?.code).filter(Boolean) ?? [];
    };

    const logSurveyAudit = async (
      surveyId: string,
      auditActorId: string,
      auditAction: string,
      changes: Record<string, unknown> = {},
    ) => {
      await supabaseClient.from("survey_audit_log").insert([{
        survey_id: surveyId,
        actor_id: auditActorId,
        action: auditAction,
        changes,
      }]);
    };

    const computeSurveyChanges = (
      before: Record<string, unknown>,
      after: Record<string, unknown>,
    ) => {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(after)) {
        if (after[key] === undefined) continue;
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          changes[key] = { from: before[key] ?? null, to: after[key] };
        }
      }
      return changes;
    };

    switch (action) {
      case "SURVEY_CREATE": {
        const { section_ids, ...surveyData } = payload;
        ({ data: result, error } = await supabaseClient.from("surveys").insert([{
          ...surveyData,
          created_by: actor.id,
          updated_by: actor.id,
        }]).select().single());
        if (error) {
          console.error("Error creating survey:", error);
          throw new Error(`Database error: ${error.message} (${error.code})`);
        }
        if (result && section_ids) {
          await updateSurveySections(result.id, section_ids);
        }
        if (result) {
          await logSurveyAudit(result.id, actor.id, "create", {
            title_en: result.title_en,
            title_th: result.title_th,
            status: result.status,
            survey_type: result.survey_type,
            section_ids: section_ids ?? [],
          });
        }
        break;
      }
      
      case "SURVEY_UPDATE": {
        const { id, section_ids, ...surveyData } = payload;
        const { data: before } = await supabaseClient.from("surveys").select("*").eq("id", id).single();
        const beforeSections = await getSurveySectionCodes(id);
        const changes: Record<string, { from: unknown; to: unknown }> = {};

        if (before) {
          Object.assign(changes, computeSurveyChanges(before as Record<string, unknown>, surveyData));
        }
        if (section_ids !== undefined && JSON.stringify(beforeSections) !== JSON.stringify(section_ids)) {
          changes.section_ids = { from: beforeSections, to: section_ids };
        }

        if (Object.keys(surveyData).length > 0) {
          ({ data: result, error } = await supabaseClient.from("surveys").update({
            ...surveyData,
            updated_by: actor.id,
          }).eq("id", id).select().single());
          if (error) {
            console.error("Error updating survey:", error);
            throw new Error(`Database error: ${error.message} (${error.code})`);
          }
        } else if (section_ids !== undefined) {
          ({ data: result, error } = await supabaseClient.from("surveys").update({
            updated_by: actor.id,
          }).eq("id", id).select().single());
        }
        if (section_ids !== undefined) {
          await updateSurveySections(id, section_ids);
        }
        if (Object.keys(changes).length > 0) {
          await logSurveyAudit(id, actor.id, "update", changes);
        }
        break;
      }

      case "SURVEY_DELETE": {
        const { data: snapshot } = await supabaseClient
          .from("surveys")
          .select("title_en, title_th, status, survey_type")
          .eq("id", payload.id)
          .single();
        if (snapshot) {
          await logSurveyAudit(payload.id, actor.id, "delete", { snapshot });
        }
        ({ error } = await supabaseClient.from("surveys").delete().eq("id", payload.id));
        break;
      }

      case "SURVEY_CLONE": {
        const { data: source } = await supabaseClient.from("surveys").select("*, survey_sections(sections(code))").eq("id", payload.id).single();
        if (source) {
          const { id: _, created_at: __, survey_sections: ss, ...cloneData } = source;
          const section_ids = ss?.map((s: any) => s.sections?.code).filter(Boolean) || [];
          
          ({ data: result, error } = await supabaseClient.from("surveys").insert([{
            ...cloneData,
            title_en: `${cloneData.title_en} (Copy)`,
            title_th: `${cloneData.title_th} (สำเนา)`,
            status: "Draft",
            created_by: actor.id,
            updated_by: actor.id,
          }]).select().single());

          if (!error && result) {
            await updateSurveySections(result.id, section_ids);
            await logSurveyAudit(payload.id, actor.id, "clone", { cloned_to: result.id });
            await logSurveyAudit(result.id, actor.id, "create", {
              cloned_from: payload.id,
              title_en: result.title_en,
              title_th: result.title_th,
            });
          }
        }
        break;
      }

      case "USER_SET_ACTIVE":
        ({ error } = await supabaseClient.from("users").update({ is_active: payload.active }).eq("id", payload.id));
        break;

      case "USER_UPSERT_BULK":
        ({ data: result, error } = await supabaseClient.from("users").upsert(payload.users, { onConflict: "employee_code" }));
        break;

      case "SECTION_CREATE":
        ({ data: result, error } = await supabaseClient.from("sections").insert([payload]).select().single());
        break;

      case "SECTION_UPDATE":
        ({ data: result, error } = await supabaseClient.from("sections").update(payload.data).eq("code", payload.code).select().single());
        break;

      case "SECTION_DELETE":
        ({ error } = await supabaseClient.from("sections").delete().eq("code", payload.code));
        break;

      case "QUESTION_CREATE": {
        const { choices, rows, columns, sectionCode, ...qData } = payload;
        const { data: section } = await supabaseClient.from("sections").select("id").eq("code", sectionCode).single();
        if (!section) throw new Error("Section not found");
        
        ({ data: result, error } = await supabaseClient.from("questions").insert([{
          ...qData,
          section_id: section.id,
          created_by: actor.id,
          updated_by: actor.id,
        }]).select().single());
        if (!error && result) {
          const qId = result.id;
          if (choices?.length) await supabaseClient.from("question_choices").insert(choices.map((c: any, i: number) => ({ ...c, question_id: qId, sort_order: i })));
          if (rows?.length) await supabaseClient.from("matrix_rows").insert(rows.map((r: any, i: number) => ({ ...r, question_id: qId, sort_order: i })));
          if (columns?.length) await supabaseClient.from("matrix_columns").insert(columns.map((c: any, i: number) => ({ ...c, question_id: qId, sort_order: i })));
        }
        break;
      }

      case "QUESTION_UPDATE": {
        const { id, choices, rows, columns, ...qData } = payload;
        ({ data: result, error } = await supabaseClient.from("questions").update({
          ...qData,
          updated_by: actor.id,
          updated_at: new Date().toISOString(),
        }).eq("id", id).select().single());
        if (!error) {
          await supabaseClient.from("question_choices").delete().eq("question_id", id);
          await supabaseClient.from("matrix_rows").delete().eq("question_id", id);
          await supabaseClient.from("matrix_columns").delete().eq("question_id", id);
          if (choices?.length) await supabaseClient.from("question_choices").insert(choices.map((c: any, i: number) => ({ ...c, question_id: id, sort_order: i })));
          if (rows?.length) await supabaseClient.from("matrix_rows").insert(rows.map((r: any, i: number) => ({ ...r, question_id: id, sort_order: i })));
          if (columns?.length) await supabaseClient.from("matrix_columns").insert(columns.map((c: any, i: number) => ({ ...c, question_id: id, sort_order: i })));
        }
        break;
      }

      case "QUESTION_DELETE":
        ({ error } = await supabaseClient.from("questions").delete().eq("id", payload.id));
        break;

      case "QUESTION_REORDER": {
        const { questionIds } = payload;
        for (let i = 0; i < questionIds.length; i++) {
          await supabaseClient.from("questions").update({ sort_order: i }).eq("id", questionIds[i]);
        }
        break;
      }

      case "QUESTION_MOVE": {
        const { questionId, targetSectionCode } = payload;
        const { data: section } = await supabaseClient.from("sections").select("id").eq("code", targetSectionCode).single();
        if (section) {
          ({ error } = await supabaseClient.from("questions").update({ section_id: section.id }).eq("id", questionId));
        }
        break;
      }

      case "DEPARTMENT_CREATE": {
        const { business_unit_ids: createBuIds, ...deptCreateData } = payload;
        ({ data: result, error } = await supabaseClient.from("departments").insert([deptCreateData]).select().single());
        if (!error && result && createBuIds && createBuIds.length > 0) {
          await supabaseClient.from("department_business_units").insert(
            createBuIds.map((buId: string) => ({ department_id: result.id, business_unit_id: buId }))
          );
        }
        break;
      }

      case "DEPARTMENT_UPDATE": {
        const { business_unit_ids: updateBuIds, ...updatePayloadData } = payload.data;
        ({ data: result, error } = await supabaseClient.from("departments").update(updatePayloadData).eq("id", payload.id).select().single());
        if (!error) {
          // Sync junction table
          await supabaseClient.from("department_business_units").delete().eq("department_id", payload.id);
          if (updateBuIds && updateBuIds.length > 0) {
            await supabaseClient.from("department_business_units").insert(
              updateBuIds.map((buId: string) => ({ department_id: payload.id, business_unit_id: buId }))
            );
          }
        }
        break;
      }

      case "DEPARTMENT_DELETE":
        ({ error } = await supabaseClient.from("departments").delete().eq("id", payload.id));
        break;

      case "BUSINESS_UNIT_CREATE":
        ({ data: result, error } = await supabaseClient.from("business_units").insert([payload]).select().single());
        break;

      case "BUSINESS_UNIT_UPDATE":
        ({ data: result, error } = await supabaseClient.from("business_units").update(payload.data).eq("id", payload.id).select().single());
        break;

      case "BUSINESS_UNIT_DELETE":
        ({ error } = await supabaseClient.from("business_units").delete().eq("id", payload.id));
        break;

      // ── Say–Stay–Strive Mapping Management ──────────────────────────────
      case "SSS_MAPPING_UPSERT": {
        const { questionId, dimension, weight } = payload;
        ({ data: result, error } = await supabaseClient
          .from("sss_question_mappings")
          .upsert(
            {
              question_id:   questionId,
              sss_dimension: dimension,
              weight:        weight ?? 1.0,
              is_active:     true,
              updated_by:    actor.id,
              updated_at:    new Date().toISOString(),
            },
            { onConflict: "question_id,sss_dimension" }
          )
          .select()
          .single());
        break;
      }

      case "SSS_MAPPING_TOGGLE": {
        const { id: mappingId, isActive } = payload;
        ({ data: result, error } = await supabaseClient
          .from("sss_question_mappings")
          .update({ is_active: isActive, updated_by: actor.id, updated_at: new Date().toISOString() })
          .eq("id", mappingId)
          .select()
          .single());
        break;
      }

      case "SSS_MAPPING_DELETE":
        ({ error } = await supabaseClient
          .from("sss_question_mappings")
          .delete()
          .eq("id", payload.id));
        break;

      case "SSS_MAPPING_UPDATE_WEIGHT": {
        const { id: wId, weight: newWeight } = payload;
        ({ data: result, error } = await supabaseClient
          .from("sss_question_mappings")
          .update({ weight: newWeight, updated_by: actor.id, updated_at: new Date().toISOString() })
          .eq("id", wId)
          .select()
          .single());
        break;
      }

      // ── Bulletin Posts ──────────────────────────────────────────────────
      case "BULLETIN_CREATE": {
        ({ data: result, error } = await supabaseClient
          .from("bulletin_posts")
          .insert([{
            title_th:  payload.title_th,
            title_en:  payload.title_en,
            content_th: payload.content_th,
            content_en: payload.content_en,
            category:  payload.category ?? "general",
            image_url: payload.image_url ?? null,
            is_pinned: payload.is_pinned ?? false,
            posted_by: payload.posted_by,
            links:     payload.links ?? [],
          }])
          .select()
          .single());
        break;
      }

      case "BULLETIN_UPDATE": {
        const { id: bId, ...bData } = payload;
        const patch: Record<string, unknown> = {};
        if (bData.title_th  !== undefined) patch.title_th  = bData.title_th;
        if (bData.title_en  !== undefined) patch.title_en  = bData.title_en;
        if (bData.content_th !== undefined) patch.content_th = bData.content_th;
        if (bData.content_en !== undefined) patch.content_en = bData.content_en;
        if (bData.category  !== undefined) patch.category  = bData.category;
        if (bData.image_url !== undefined) patch.image_url = bData.image_url;
        if (bData.is_pinned !== undefined) patch.is_pinned = bData.is_pinned;
        if (bData.posted_by !== undefined) patch.posted_by = bData.posted_by;
        if (bData.links     !== undefined) patch.links     = bData.links;
        ({ data: result, error } = await supabaseClient
          .from("bulletin_posts")
          .update(patch)
          .eq("id", bId)
          .select()
          .single());
        break;
      }

      case "BULLETIN_DELETE":
        ({ error } = await supabaseClient
          .from("bulletin_posts")
          .delete()
          .eq("id", payload.id));
        break;

      case "BULLETIN_TOGGLE_PIN":
        ({ error } = await supabaseClient
          .from("bulletin_posts")
          .update({ is_pinned: payload.is_pinned })
          .eq("id", payload.id));
        break;

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (error) throw error;

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
