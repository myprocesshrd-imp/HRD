import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';
import { MOCK_USERS, MOCK_SURVEYS, QUESTION_BANK, DEPARTMENTS } from "./src/lib/mock-data";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Seeding started...");

  // Clear existing data to avoid duplicates since we rely on auto-generated UUIDs
  console.log("Clearing old data...");
  await supabase.from("response_answers").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("survey_responses").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("survey_sections").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("surveys").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("matrix_columns").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("matrix_rows").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("question_choices").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("questions").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("sections").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("users").delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from("departments").delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 1. Departments
  console.log("Seeding departments...");
  const depts = DEPARTMENTS.map(d => ({ name_en: d, name_th: d }));
  await supabase.from("departments").insert(depts);

  const { data: dbDepts } = await supabase.from("departments").select("*");
  const deptMap = new Map(dbDepts.map(d => [d.name_en, d.id]));

  // 2. Users
  console.log("Seeding users...");
  const users = MOCK_USERS.map(u => ({
    employee_code: u.employeeCode,
    email: u.email,
    name_en: u.nameEn,
    name_th: u.nameTh,
    role: u.role,
    department_id: deptMap.get(u.department),
    business_unit: u.businessUnit,
    level: u.level,
    location: u.location,
    avatar_url: u.avatarUrl,
    is_active: u.isActive !== false
  }));
  const { error: uErr } = await supabase.from("users").insert(users);
  if (uErr) console.error("Error inserting users", uErr);

  // 3. Sections & Questions
  console.log("Seeding sections & questions...");
  for (const s of QUESTION_BANK) {
    const { data: sectionData, error: sErr } = await supabase.from("sections").insert({
      code: s.id,
      title_en: s.titleEn,
      title_th: s.titleTh,
      desc_en: s.descEn,
      desc_th: s.descTh,
    }).select("id").single();

    if (sErr || !sectionData) {
      console.error("Error inserting section", s.id, sErr);
      continue;
    }

    let sortOrder = 0;
    for (const q of s.questions) {
      const { data: qData, error: qErr } = await supabase.from("questions").insert({
        section_id: sectionData.id,
        type: q.type,
        text_en: q.textEn,
        text_th: q.textTh,
        desc_en: q.descEn,
        desc_th: q.descTh,
        required: q.required,
        category: q.category,
        min_value: q.minValue,
        max_value: q.maxValue,
        min_choices: q.minChoices,
        max_choices: q.maxChoices,
        sort_order: sortOrder++
      }).select("id").single();

      if (qErr || !qData) {
        console.error("Error inserting question", q.id, qErr);
        continue;
      }

      if (q.choices) {
        await supabase.from("question_choices").insert(q.choices.map((c, i) => ({
          question_id: qData.id,
          value: c.value,
          label_en: c.labelEn,
          label_th: c.labelTh,
          sort_order: i
        })));
      }
      if (q.rows) {
        await supabase.from("matrix_rows").insert(q.rows.map((r, i) => ({
          question_id: qData.id,
          label_en: r.textEn,
          label_th: r.textTh,
          sort_order: i
        })));
      }
      if (q.columns) {
        await supabase.from("matrix_columns").insert(q.columns.map((c, i) => ({
          question_id: qData.id,
          value: c.value,
          label_en: c.labelEn,
          label_th: c.labelTh,
          sort_order: i
        })));
      }
    }
  }

  // 4. Surveys
  console.log("Seeding surveys...");
  for (const s of MOCK_SURVEYS) {
    const { data: surveyData, error: sErr } = await supabase.from("surveys").insert({
      title_en: s.titleEn,
      title_th: s.titleTh,
      status: s.status.toLowerCase(),
      survey_type: s.surveyType,
      start_date: s.startDate === "—" ? null : s.startDate,
      end_date: s.endDate === "—" ? null : s.endDate,
      target_responses: s.target
    }).select("id").single();

    if (sErr || !surveyData) {
      console.error("Error inserting survey", s.titleEn, sErr);
      continue;
    }

    if (s.sectionIds) {
      const { data: sections } = await supabase.from("sections").select("id, code").in("code", s.sectionIds);
      if (sections) {
        const surveySections = sections.map((sec, i) => ({
          survey_id: surveyData.id,
          section_id: sec.id,
          sort_order: i
        }));
        await supabase.from("survey_sections").insert(surveySections);
      }
    }
  }

  console.log("Generating dummy responses...");
  const { data: allQuestions } = await supabase.from("questions").select("*");
  const { data: allUsers } = await supabase.from("users").select("id, role, department_id, business_unit, location, level");
  const { data: allSurveys } = await supabase.from("surveys").select("id, status");

  if (!allUsers || !allSurveys || !allQuestions) return;

  for (const u of allUsers) {
    if (u.role === "super_admin") continue;

    for (const s of allSurveys) {
      if (s.status === "closed" || Math.random() > 0.5) {
        const { data: respData, error: rErr } = await supabase.from("survey_responses").insert({
          survey_id: s.id,
          user_id: u.id,
          status: "completed",
          started_at: new Date(Date.now() - Math.random() * 8640000000).toISOString(),
          completed_at: new Date().toISOString(),
          demographics: {
            department: u.department_id,
            businessUnit: u.business_unit,
            location: u.location,
            level: u.level
          },
          time_spent_seconds: Math.floor(Math.random() * 600) + 60
        }).select("id").single();

        if (rErr || !respData) continue;

        const answers = [];
        for (const q of allQuestions) {
          if (q.type === "rating" || q.type === "nps") {
            answers.push({
              response_id: respData.id,
              question_id: q.id,
              numeric_value: Math.floor(Math.random() * 5) + 1
            });
          } else if (q.type === "single_select") {
            const choices = ["a", "b", "c", "d"];
            const choice = choices[Math.floor(Math.random() * choices.length)];
            const scoreMap: Record<string, number> = { a: 5, b: 4, c: 2, d: 1 };
            answers.push({
              response_id: respData.id,
              question_id: q.id,
              text_value: choice,
              numeric_value: scoreMap[choice]
            });
          }
        }
        if (answers.length > 0) {
          await supabase.from("response_answers").insert(answers);
        }
      }
    }
  }

  console.log("Done!");
}

seed().catch(console.error);
