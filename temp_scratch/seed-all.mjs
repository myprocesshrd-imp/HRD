// scripts/seed-all.mjs — aligned to actual DB schema
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ── 1. SECTIONS ───────────────────────────────────────────────────────────────
const SECTIONS = [
  { code:"A", title_en:"Organization, Compensation & Benefits", title_th:"องค์กร ค่าตอบแทน สวัสดิการ และเครื่องมือ", desc_en:"Compensation, benefits, tools, and overall trust.", desc_th:"ค่าตอบแทน สวัสดิการ เครื่องมือ และความเชื่อมั่น", sort_order:1 },
  { code:"B", title_en:"Work & Employee Experience", title_th:"ประสบการณ์การทำงานของพนักงาน", desc_en:"Role clarity, growth, and supervisor support.", desc_th:"ความชัดเจนของบทบาท การเติบโต และการสนับสนุนจากหัวหน้า", sort_order:2 },
  { code:"C", title_en:"Work Environment", title_th:"สภาพแวดล้อมการทำงาน", desc_en:"Safety, collaboration, communication, and well-being.", desc_th:"ความปลอดภัย การทำงานร่วมกัน การสื่อสาร และสุขภาวะ", sort_order:3 },
  { code:"D", title_en:"Direction & Organizational Trust", title_th:"ด้านทิศทางและความเชื่อมั่นต่อองค์กร", desc_en:"Trust in management direction and policies.", desc_th:"ความเชื่อมั่นในทิศทาง นโยบาย และความภาคภูมิใจ", sort_order:4 },
  { code:"E", title_en:"Work & Workload", title_th:"ด้านการทำงานและภาระงาน", desc_en:"Satisfaction with role, workload, and work-life balance.", desc_th:"ความพึงพอใจในหน้าที่ ภาระงาน และสมดุลชีวิต", sort_order:5 },
  { code:"F", title_en:"Supervisor Effectiveness", title_th:"ด้านประสิทธิภาพหัวหน้างาน", desc_en:"Supervisor support, communication, and conflict resolution.", desc_th:"การสนับสนุนจากหัวหน้า การสื่อสาร และการแก้ไขปัญหา", sort_order:6 },
  { code:"G", title_en:"Career Growth", title_th:"ด้านการเติบโตในสายอาชีพ", desc_en:"Training, career development, and goal setting.", desc_th:"โอกาสฝึกอบรม การเติบโต และการตั้งเป้าหมาย", sort_order:7 },
  { code:"H", title_en:"Compensation & Benefits", title_th:"ด้านค่าตอบแทนและสวัสดิการ", desc_en:"Salary structure, fairness, and welfare satisfaction.", desc_th:"โครงสร้างเงินเดือน ความเป็นธรรม และความพึงพอใจในสวัสดิการ", sort_order:8 },
  { code:"I", title_en:"Work Environment (Physical)", title_th:"ด้านสภาพแวดล้อมในการทำงาน", desc_en:"Physical workspace, 5S, equipment, and technology.", desc_th:"สถานที่ทำงาน 5ส อุปกรณ์ และเทคโนโลยี", sort_order:9 },
  { code:"J", title_en:"Organizational Culture & Relationships", title_th:"ด้านวัฒนธรรมองค์กรและความสัมพันธ์", desc_en:"Cross-team collaboration, team relationships, and recognition.", desc_th:"การทำงานข้ามแผนก ความสัมพันธ์ในทีม และการยกย่อง", sort_order:10 },
];

// ── 2. QUESTIONS (no 'code' col — use section_id + sort_order as identity) ────
const QUESTIONS_BY_SECTION = {
  A: [
    { type:"rating", text_en:"I receive fair compensation for my work.", text_th:"ฉันได้รับค่าตอบแทนที่เหมาะสมกับงาน", required:true, min_value:1, max_value:5, category:"Compensation", sort_order:1 },
    { type:"rating", text_en:"Company benefits meet my needs.", text_th:"สวัสดิการของบริษัทตอบสนองความต้องการของฉัน", required:true, min_value:1, max_value:5, category:"Benefits", sort_order:2 },
    { type:"rating", text_en:"The organization communicates policies clearly.", text_th:"องค์กรสื่อสารนโยบายอย่างชัดเจน", required:true, min_value:1, max_value:5, category:"Leadership", sort_order:3 },
    { type:"rating", text_en:"I have the tools and equipment needed to perform effectively.", text_th:"ฉันมีเครื่องมืออุปกรณ์เพียงพอต่อการทำงาน", required:true, min_value:1, max_value:5, category:"Tools", sort_order:4 },
    { type:"rating", text_en:"The company provides stable career opportunities.", text_th:"บริษัทมอบโอกาสในการเติบโตในสายอาชีพอย่างมั่นคง", required:true, min_value:1, max_value:5, category:"Growth", sort_order:5 },
    { type:"rating", text_en:"I trust the management direction of the organization.", text_th:"ฉันเชื่อมั่นในทิศทางการบริหารขององค์กร", required:true, min_value:1, max_value:5, category:"Leadership", sort_order:6 },
    { type:"nps",    text_en:"How likely are you to recommend this company as a great place to work?", text_th:"คุณมีแนวโน้มที่จะแนะนำบริษัทนี้เป็นสถานที่ทำงานที่ดีมากน้อยแค่ไหน?", required:true, min_value:0, max_value:10, category:"Advocacy", sort_order:7 },
  ],
  B: [
    { type:"rating", text_en:"My job responsibilities are clearly defined.", text_th:"ความรับผิดชอบในงานของฉันมีความชัดเจน", required:true, min_value:1, max_value:5, category:"Role Clarity", sort_order:1 },
    { type:"rating", text_en:"I feel proud of the work I do.", text_th:"ฉันรู้สึกภูมิใจในงานที่ทำ", required:true, min_value:1, max_value:5, category:"Growth", sort_order:2 },
    { type:"rating", text_en:"My supervisor supports my development.", text_th:"หัวหน้าของฉันสนับสนุนการพัฒนาของฉัน", required:true, min_value:1, max_value:5, category:"Growth", sort_order:3 },
    { type:"rating", text_en:"I receive constructive feedback regularly.", text_th:"ฉันได้รับข้อเสนอแนะที่สร้างสรรค์อย่างสม่ำเสมอ", required:true, min_value:1, max_value:5, category:"Growth", sort_order:4 },
    { type:"rating", text_en:"I have opportunities to learn and grow.", text_th:"ฉันมีโอกาสในการเรียนรู้และเติบโต", required:true, min_value:1, max_value:5, category:"Growth", sort_order:5 },
    { type:"rating", text_en:"My workload is manageable.", text_th:"ปริมาณงานของฉันอยู่ในระดับที่จัดการได้", required:true, min_value:1, max_value:5, category:"Well-being", sort_order:6 },
  ],
  C: [
    { type:"rating", text_en:"My workplace environment is safe.", text_th:"สภาพแวดล้อมในที่ทำงานของฉันมีความปลอดภัย", required:true, min_value:1, max_value:5, category:"Environment", sort_order:1 },
    { type:"rating", text_en:"Team collaboration is effective.", text_th:"การทำงานร่วมกันในทีมมีประสิทธิภาพ", required:true, min_value:1, max_value:5, category:"Collaboration", sort_order:2 },
    { type:"rating", text_en:"Communication within my team is good.", text_th:"การสื่อสารภายในทีมของฉันเป็นไปด้วยดี", required:true, min_value:1, max_value:5, category:"Collaboration", sort_order:3 },
    { type:"rating", text_en:"I feel respected by colleagues.", text_th:"ฉันรู้สึกได้รับความเคารพจากเพื่อนร่วมงาน", required:true, min_value:1, max_value:5, category:"Environment", sort_order:4 },
    { type:"rating", text_en:"The organization promotes work-life balance.", text_th:"องค์กรส่งเสริมความสมดุลระหว่างงานและชีวิตส่วนตัว", required:true, min_value:1, max_value:5, category:"Well-being", sort_order:5 },
    { type:"rating", text_en:"I feel psychologically safe expressing opinions.", text_th:"ฉันรู้สึกปลอดภัยที่จะแสดงความคิดเห็น", required:true, min_value:1, max_value:5, category:"Environment", sort_order:6 },
  ],
};

// ── 3. DEPARTMENTS (schema: name_en, name_th, business_unit) ──────────────────
const DEPARTMENTS = [
  { name_en:"Human Resources",      name_th:"ฝ่ายทรัพยากรบุคคล",       business_unit:"Corporate" },
  { name_en:"Information Technology",name_th:"ฝ่ายเทคโนโลยีสารสนเทศ",  business_unit:"Corporate" },
  { name_en:"Finance",               name_th:"ฝ่ายการเงิน",              business_unit:"Corporate" },
  { name_en:"Sales",                 name_th:"ฝ่ายขาย",                  business_unit:"Commercial" },
  { name_en:"Marketing",             name_th:"ฝ่ายการตลาด",             business_unit:"Commercial" },
  { name_en:"Operations",            name_th:"ฝ่ายปฏิบัติการ",          business_unit:"Operations" },
  { name_en:"Production",            name_th:"ฝ่ายการผลิต",             business_unit:"Manufacturing" },
  { name_en:"Logistics",             name_th:"ฝ่ายโลจิสติกส์",          business_unit:"Operations" },
];

// ── 4. USERS ──────────────────────────────────────────────────────────────────
const RAW_USERS = [
  { employee_code:"admin",   email:"admin@company.co.th",   name_th:"สมชาย ใจดี",       name_en:"Somchai Jaidee",     role:"super_admin", dept:"Information Technology", bu:"Corporate",     level:"Executive",          location:"Head Office" },
  { employee_code:"hr",      email:"hr@company.co.th",      name_th:"อารยา ทรัพย์มั่น", name_en:"Araya Sapman",       role:"hr_admin",    dept:"Human Resources",      bu:"Corporate",     level:"Manager",            location:"Head Office" },
  { employee_code:"manager", email:"manager@company.co.th", name_th:"ธนพล ก้าวหน้า",    name_en:"Thanaphol Kaona",    role:"manager",     dept:"Sales",                bu:"Commercial",    level:"Senior Manager",     location:"Head Office" },
  { employee_code:"employee",email:"employee@company.co.th",name_th:"พิมพ์ชนก สดใส",    name_en:"Pimchanok Sodsai",   role:"employee",    dept:"Marketing",            bu:"Commercial",    level:"Operational Level",  location:"Head Office" },
  { employee_code:"EMP001",  email:"emp001@company.co.th",  name_th:"วิชัย มานะ",        name_en:"Wichai Mana",        role:"employee",    dept:"Sales",                bu:"Commercial",    level:"Operational Level",  location:"Head Office" },
  { employee_code:"EMP002",  email:"emp002@company.co.th",  name_th:"สุภาพร รักดี",     name_en:"Supaporn Rakdee",    role:"employee",    dept:"Finance",              bu:"Corporate",     level:"Supervisor",         location:"Head Office" },
  { employee_code:"EMP003",  email:"emp003@company.co.th",  name_th:"อนุชา ขยันทำ",     name_en:"Anucha Khayan",      role:"employee",    dept:"Operations",           bu:"Operations",    level:"Operational Level",  location:"Factory" },
  { employee_code:"EMP004",  email:"emp004@company.co.th",  name_th:"ปนัดดา หวังดี",    name_en:"Panadda Wangdee",    role:"employee",    dept:"Human Resources",      bu:"Corporate",     level:"Assistant Manager",  location:"Head Office" },
  { employee_code:"EMP005",  email:"emp005@company.co.th",  name_th:"ณัฐวุฒิ เก่งมาก",  name_en:"Nathawut Kengmak",   role:"manager",     dept:"Production",           bu:"Manufacturing", level:"Manager",            location:"Factory" },
  { employee_code:"EMP006",  email:"emp006@company.co.th",  name_th:"กัลยา พัฒนา",     name_en:"Kanlaya Pattana",    role:"employee",    dept:"Logistics",            bu:"Operations",    level:"Operational Level",  location:"Warehouse" },
  { employee_code:"EMP007",  email:"emp007@company.co.th",  name_th:"ศิริชัย โชติ",      name_en:"Sirichai Chot",      role:"employee",    dept:"Information Technology",bu:"Corporate",   level:"Supervisor",         location:"Head Office" },
  { employee_code:"EMP008",  email:"emp008@company.co.th",  name_th:"นภัสสร เดิน",      name_en:"Naphatson Doen",     role:"employee",    dept:"Marketing",            bu:"Commercial",    level:"Operational Level",  location:"Head Office" },
  { employee_code:"EMP009",  email:"emp009@company.co.th",  name_th:"ประภาส วัฒนา",     name_en:"Prapas Wattana",     role:"employee",    dept:"Production",           bu:"Manufacturing", level:"Operational Level",  location:"Factory" },
  { employee_code:"EMP010",  email:"emp010@company.co.th",  name_th:"สมหญิง ใจดี",      name_en:"Somying Jaidee",     role:"employee",    dept:"Finance",              bu:"Corporate",     level:"Assistant Manager",  location:"Head Office" },
];

// ── 5. SURVEYS ────────────────────────────────────────────────────────────────
const SURVEYS_META = [
  { title_en:"Annual Engagement Survey 2025", title_th:"แบบสำรวจความผูกพัน ประจำปี 2568", status:"Active",  survey_type:"identified", start_date:"2025-04-01", end_date:"2025-05-31", target_responses:850, sections:["A","B","C","D","E","F","G","H","I","J"] },
  { title_en:"Pulse Check — Q1 2025",         title_th:"Pulse Check ไตรมาส 1/2568",        status:"Closed",  survey_type:"identified", start_date:"2025-01-15", end_date:"2025-02-15", target_responses:820, sections:["A","B","C"] },
  { title_en:"Onboarding Feedback",           title_th:"ความคิดเห็นพนักงานใหม่",           status:"Draft",   survey_type:"identified", start_date:null,         end_date:null,         target_responses:120, sections:["A"] },
  { title_en:"Pulse Survey Q2 2025 Anon",     title_th:"Pulse Survey ไตรมาส 2/2568 (ไม่ระบุตัวตน)", status:"Active", survey_type:"anonymous", start_date:"2025-05-01", end_date:"2025-06-15", target_responses:850, sections:["A","C"] },
];

async function run() {
  console.log("🚀 Seeding:", process.env.VITE_SUPABASE_URL, "\n");

  // ── Sections ──
  console.log("1/5 Sections...");
  for (const s of SECTIONS) {
    const { error } = await sb.from("sections").upsert(s, { onConflict: "code" });
    if (error) console.error("  ❌", s.code, error.message);
  }
  const { data: sectionRows } = await sb.from("sections").select("id, code");
  const secMap = Object.fromEntries(sectionRows.map((r) => [r.code, r.id]));
  console.log("  ✅", sectionRows.length, "sections");

  // ── Questions ──
  console.log("2/5 Questions...");
  let qTotal = 0;
  for (const [code, qs] of Object.entries(QUESTIONS_BY_SECTION)) {
    const sectionId = secMap[code];
    if (!sectionId) continue;
    // Delete old then insert fresh (no unique code col)
    await sb.from("questions").delete().eq("section_id", sectionId);
    const rows = qs.map((q) => ({ ...q, section_id: sectionId }));
    const { error } = await sb.from("questions").insert(rows);
    if (error) console.error("  ❌ Q", code, error.message);
    else qTotal += rows.length;
  }
  console.log("  ✅", qTotal, "questions");

  // ── Departments ──
  console.log("3/5 Departments...");
  for (const d of DEPARTMENTS) {
    const { error } = await sb.from("departments").upsert(d, { onConflict: "name_en" });
    if (error) console.error("  ❌", d.name_en, error.message);
  }
  const { data: deptRows } = await sb.from("departments").select("id, name_en");
  const deptMap = Object.fromEntries(deptRows.map((r) => [r.name_en, r.id]));
  console.log("  ✅", deptRows.length, "departments");

  // ── Users ──
  console.log("4/5 Users...");
  let uOk = 0;
  for (const u of RAW_USERS) {
    const row = {
      employee_code: u.employee_code,
      email: u.email,
      name_th: u.name_th,
      name_en: u.name_en,
      role: u.role,
      department_id: deptMap[u.dept] ?? null,
      business_unit: u.bu,
      level: u.level,
      location: u.location,
      is_active: true,
    };
    const { error } = await sb.from("users").upsert(row, { onConflict: "employee_code" });
    if (error) console.error("  ❌", u.employee_code, error.message);
    else uOk++;
  }
  console.log("  ✅", uOk, "users");

  // ── Surveys ──
  console.log("5a/5 Surveys...");
  const { data: userRows } = await sb.from("users").select("id, employee_code").eq("employee_code", "admin");
  const adminId = userRows?.[0]?.id ?? null;
  let surveysCreated = [];

  for (const meta of SURVEYS_META) {
    const row = {
      title_en: meta.title_en,
      title_th: meta.title_th,
      status: meta.status,
      survey_type: meta.survey_type,
      start_date: meta.start_date,
      end_date: meta.end_date,
      target_responses: meta.target_responses,
      created_by: adminId,
    };
    // Check if exists
    const { data: existing } = await sb.from("surveys").select("id").eq("title_en", meta.title_en).single();
    let surveyId;
    if (existing) {
      await sb.from("surveys").update(row).eq("id", existing.id);
      surveyId = existing.id;
    } else {
      const { data: inserted } = await sb.from("surveys").insert(row).select("id").single();
      surveyId = inserted?.id;
    }
    if (surveyId) surveysCreated.push({ id: surveyId, ...meta });
  }
  console.log("  ✅", surveysCreated.length, "surveys");

  // ── Survey-Section links ──
  console.log("5b/5 Survey-Section links...");
  for (const s of surveysCreated) {
    await sb.from("survey_sections").delete().eq("survey_id", s.id);
    const links = s.sections
      .map((code, idx) => ({ survey_id: s.id, section_id: secMap[code], sort_order: idx + 1 }))
      .filter((l) => l.section_id);
    if (links.length) await sb.from("survey_sections").insert(links);
  }
  console.log("  ✅ Links done");

  // ── Responses & Answers ──
  console.log("5c/5 Responses & Answers...");
  const activeSurveys = surveysCreated.filter((s) => s.status !== "Draft");
  const { data: allUsers } = await sb.from("users").select("id, employee_code, business_unit, level, location, department_id");
  const { data: allQuestions } = await sb.from("questions").select("id, type");

  const DEPTS_LIST = ["Human Resources","Information Technology","Finance","Sales","Marketing","Operations","Production","Logistics"];
  const AGE_RANGES = ["21-25","26-30","31-35","36-40","41-50"];
  const TENURES = ["1-3 years","4-6 years","7-10 years"];

  let rTotal = 0, aTotal = 0;
  for (const survey of activeSurveys) {
    const isAnon = survey.survey_type === "anonymous";
    for (const u of allUsers) {
      if (Math.random() > 0.75) continue; // ~75% response rate
      const demographics = isAnon ? {
        department: DEPTS_LIST[rand(0, DEPTS_LIST.length-1)],
        business_unit: ["Corporate","Commercial","Operations","Manufacturing"][rand(0,3)],
        level: ["Operational Level","Supervisor","Manager"][rand(0,2)],
        location: ["Head Office","Factory","Warehouse"][rand(0,2)],
        age_range: AGE_RANGES[rand(0, AGE_RANGES.length-1)],
        gender: ["Male","Female","LGBTQ+"][rand(0,2)],
        tenure: TENURES[rand(0, TENURES.length-1)],
      } : null;

      const completedAt = new Date(Date.now() - rand(1, 30) * 24 * 60 * 60 * 1000).toISOString();
      const { data: resp, error: re } = await sb.from("survey_responses").insert({
        survey_id: survey.id,
        user_id: isAnon ? null : u.id,
        anonymous_token: isAnon ? crypto.randomUUID() : null,
        status: "completed",
        started_at: completedAt,
        completed_at: completedAt,
        demographics,
        time_spent_seconds: rand(180, 900),
      }).select("id").single();
      if (re || !resp) continue;
      rTotal++;

      const answers = allQuestions.map((q) => ({
        response_id: resp.id,
        question_id: q.id,
        numeric_value: q.type === "nps" ? rand(6, 10) : rand(3, 5),
      }));
      const { error: ae } = await sb.from("response_answers").insert(answers);
      if (!ae) aTotal += answers.length;
    }
  }
  console.log("  ✅", rTotal, "responses,", aTotal, "answers");

  // ── Final count ──
  const counts = {};
  for (const t of ["surveys","sections","questions","users","departments","survey_responses","response_answers"]) {
    const { count } = await sb.from(t).select("*", { count:"exact", head:true });
    counts[t] = count;
  }
  console.log("\n🎉 Done! Final counts:");
  for (const [t, c] of Object.entries(counts)) console.log(`   ${t}: ${c}`);
}

run().catch((e) => { console.error(e); process.exit(1); });
