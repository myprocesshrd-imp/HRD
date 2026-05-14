import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function seed() {
  console.log("Starting clean seed based on sample-test.md...");

  const sections = [
    { code: "D", titleEn: "Direction & Organizational Trust", titleTh: "ด้านทิศทางและความเชื่อมั่นต่อองค์กร", descEn: "Trust in management direction, policies, and pride in the organization.", descTh: "ความเชื่อมั่นในทิศทางขององค์กร นโยบาย และความภาคภูมิใจในองค์กร" },
    { code: "E", titleEn: "Work & Workload", titleTh: "ด้านการทำงานและภาระงาน", descEn: "Satisfaction with role, workload, and work-life balance.", descTh: "ความพึงพอใจในหน้าที่ ภาระงาน และสมดุลชีวิต" },
    { code: "F", titleEn: "Supervisor Effectiveness", titleTh: "ด้านประสิทธิภาพหัวหน้างาน", descEn: "Supervisor support, communication, and conflict resolution.", descTh: "การสนับสนุนจากหัวหน้า การสื่อสาร และการแก้ไขปัญหา" },
    { code: "G", titleEn: "Career Growth", titleTh: "ด้านการเติบโตในสายอาชีพ", descEn: "Training opportunities, career development, and goal setting.", descTh: "โอกาสฝึกอบรม การเติบโตในสายอาชีพ และการตั้งเป้าหมาย" },
    { code: "H", titleEn: "Compensation & Benefits", titleTh: "ด้านค่าตอบแทนและสวัสดิการ", descEn: "Salary structure, fairness, and welfare satisfaction.", descTh: "โครงสร้างเงินเดือน ความเป็นธรรม และความพึงพอใจในสวัสดิการ" },
    { code: "I", titleEn: "Work Environment", titleTh: "ด้านสภาพแวดล้อมในการทำงาน", descEn: "Physical workspace, 5S, equipment, and technology.", descTh: "สถานที่ทำงาน 5ส อุปกรณ์ และเทคโนโลยี" },
    { code: "J", titleEn: "Organizational Culture & Relationships", titleTh: "ด้านวัฒนธรรมองค์กรและความสัมพันธ์", descEn: "Cross-team collaboration, team relationships, and recognition.", descTh: "การทำงานข้ามแผนก ความสัมพันธ์ในทีม และการยกย่องชมเชย" },
  ];

  const questions = [
    { section: "D", textEn: "When new policies or regulations are announced from management", textTh: "เมื่อมีการประกาศนโยบายหรือกฎระเบียบใหม่จากฝ่ายบริหาร" },
    { section: "D", textEn: "If an acquaintance asks you 'How is it working at this company?'", textTh: "หากมีคนรู้จักถามคุณว่า \"ทำงานที่บริษัทนี้เป็นอย่างไรบ้าง?\"" },
    { section: "D", textEn: "If you receive an offer from elsewhere with higher pay and interesting role", textTh: "หากวันนี้มีโอกาสจากที่อื่นเสนอมา โดยให้รายได้สูงกว่าและมีตำแหน่งงานที่น่าสนใจ" },
    { section: "E", textEn: "When looking back at your current role and assigned duties", textTh: "เมื่อคุณมองย้อนดูบทบาทและหน้าที่ที่ได้รับมอบหมายในปัจจุบัน" },
    { section: "F", textEn: "In situations where work is stuck or there is conflict in the team", textTh: "ในสถานการณ์ที่งานเกิดปัญหาติดขัดหรือมีความขัดแย้งในทีม" },
    { section: "F", textEn: "When you have a different opinion or want to propose new work methods", textTh: "เมื่อคุณมีความคิดเห็นที่ต่างออกไปหรืออยากเสนอวิธีทำงานใหม่ๆ" },
    { section: "G", textEn: "When there are training projects or new challenging assignments", textTh: "เมื่อมีโครงการฝึกอบรมหรือการมอบหมายงานที่ท้าทายใหม่ๆ" },
    { section: "G", textEn: "In the goal-setting process (KPIs/Annual goals)", textTh: "ในกระบวนการตั้งเป้าหมายการทำงาน (KPI/เป้าหมายประจำปี)" },
    { section: "H", textEn: "When talking about salary structure and annual compensation adjustment", textTh: "เมื่อพูดถึงโครงสร้างเงินเดือนและการปรับผลตอบแทนประจำปี" },
    { section: "H", textEn: "If the company cannot pay special compensation (bonus) as targeted this year", textTh: "หากปีนี้บริษัทไม่สามารถจ่าย \"ค่าตอบแทนพิเศษ\" (โบนัส) ได้ตามเป้าหมาย" },
    { section: "I", textEn: "Physical workspace characteristics (5S) and general atmosphere (lighting/sound/air)", textTh: "สถานที่ทำงานมีคุณลักษณะตามหลัก 5ส และบรรยากาศทั่วไป (แสง/เสียง/อากาศ)" },
    { section: "I", textEn: "Efficiency of office equipment and technology used for work", textTh: "ประสิทธิภาพของอุปกรณ์สำนักงานและเทคโนโลยีที่ใช้ทำงาน" },
    { section: "J", textEn: "When you need to coordinate or request help from other departments", textTh: "เมื่อคุณต้องประสานงานหรือขอความช่วยเหลือจากหน่วยงานอื่นภายในบริษัท" },
    { section: "J", textEn: "Your feeling when waking up to meet teammates every day", textTh: "ความรู้สึกของคุณเมื่อต้องตื่นมาเจอเพื่อนร่วมงานในทีมเดียวกันทุกวัน" },
    { section: "J", textEn: "When you work hard until the performance is successful", textTh: "เมื่อคุณทุ่มเททำงานอย่างหนักจนผลงานออกมาประสบความสำเร็จ" },
  ];

  const choices = [
    { value: "5", labelEn: "Very Low Risk - Stable/Proud", labelTh: "ความเสี่ยงต่ำมาก - มั่นคง/ภูมิใจ" },
    { value: "4", labelEn: "Low Risk - Satisfied/Acceptable", labelTh: "ความเสี่ยงต่ำ - พึงพอใจ/ยอมรับได้" },
    { value: "2", labelEn: "High Risk - Hesitant/Dissatisfied", labelTh: "ความเสี่ยงสูง - เริ่มลังเล/ไม่พอใจ" },
    { value: "1", labelEn: "Very High Risk - Crisis/Ready to leave", labelTh: "ความเสี่ยงสูงมาก - วิกฤต/พร้อมลาออก" },
  ];

  // 1. Create Sections
  const sectionIdMap: Record<string, string> = {};
  for (const s of sections) {
    const { data, error } = await supabase.from("sections").insert({
      code: s.code,
      title_en: s.titleEn,
      title_th: s.titleTh,
      desc_en: s.descEn,
      desc_th: s.descTh,
    }).select().single();
    if (error) throw error;
    sectionIdMap[s.code] = data.id;
  }

  // 2. Create Questions and Choices
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: dbQ, error: qErr } = await supabase.from("questions").insert({
      section_id: sectionIdMap[q.section],
      type: "single_select",
      text_en: q.textEn,
      text_th: q.textTh,
      required: true,
      sort_order: i,
    }).select().single();
    if (qErr) throw qErr;

    // Add choices
    await supabase.from("question_choices").insert(
      choices.map((c, idx) => ({
        question_id: dbQ.id,
        value: c.value,
        label_en: c.labelEn,
        label_th: c.labelTh,
        sort_order: idx,
      }))
    );
  }

  // 3. Create Survey
  const { data: survey, error: sErr } = await supabase.from("surveys").insert({
    title_en: "Employee Engagement Pulse Survey (Scenario-based)",
    title_th: "แบบสำรวจความผูกพันพนักงาน (เชิงสถานการณ์)",
    status: "active",
    survey_type: "identified",
    start_date: "2024-05-14",
    end_date: "2024-12-31",
    target_responses: 500,
  }).select().single();
  if (sErr) throw sErr;

  // Link all sections to survey
  await supabase.from("survey_sections").insert(
    sections.map((s, idx) => ({
      survey_id: survey.id,
      section_id: sectionIdMap[s.code],
      sort_order: idx,
    }))
  );

  console.log("Seeding completed successfully!");
}

seed().catch(console.error);
