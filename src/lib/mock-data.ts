// Mock data + types for the HR Engagement Survey app (frontend-only v1).
export type Role = "super_admin" | "hr_admin" | "manager" | "employee";

export interface MockUser {
  id: string;
  email: string;
  password: string;
  nameTh: string;
  nameEn: string;
  role: Role;
  department: string;
  businessUnit: string;
  level: string;
  location: string;
}

export const MOCK_USERS: MockUser[] = [
  { id: "u1", email: "admin@company.co.th", password: "admin123", nameTh: "สมชาย ใจดี", nameEn: "Somchai Jaidee", role: "super_admin", department: "IT", businessUnit: "Corporate", level: "Executive", location: "Head Office" },
  { id: "u2", email: "hr@company.co.th", password: "hr123", nameTh: "อารยา ทรัพย์มั่น", nameEn: "Araya Sapman", role: "hr_admin", department: "Human Resources", businessUnit: "Corporate", level: "Manager", location: "Head Office" },
  { id: "u3", email: "manager@company.co.th", password: "manager123", nameTh: "ธนพล ก้าวหน้า", nameEn: "Thanaphol Kaona", role: "manager", department: "Sales", businessUnit: "Commercial", level: "Senior Manager", location: "Head Office" },
  { id: "u4", email: "employee@company.co.th", password: "employee123", nameTh: "พิมพ์ชนก สดใส", nameEn: "Pimchanok Sodsai", role: "employee", department: "Marketing", businessUnit: "Commercial", level: "Operational Level", location: "Head Office" },
];

export const DEPARTMENTS = ["Human Resources", "Information Technology", "Finance", "Sales", "Marketing", "Operations", "Production", "Logistics", "Customer Service"];
export const BUSINESS_UNITS = ["Corporate", "Commercial", "Operations", "Manufacturing"];
export const LOCATIONS = ["Head Office", "Factory", "Warehouse", "Branch Office", "Remote Work"];
export const LEVELS = ["Operational Level", "Supervisor", "Assistant Manager", "Manager", "Senior Manager", "Executive"];
export const GENDERS = ["Male", "Female", "LGBTQ+", "Prefer not to say"];
export const AGE_RANGES = ["Under 20", "21-25", "26-30", "31-35", "36-40", "41-50", "Over 50"];
export const TENURE = ["Less than 1 year", "1-3 years", "4-6 years", "7-10 years", "More than 10 years"];

// ── Question type system (expandable) ──
export type QuestionType =
  | "rating"
  | "single_select"
  | "multiple_select"
  | "open_text_short"
  | "open_text_long"
  | "matrix"
  | "ranking"
  | "nps"
  | "binary"
  | "constant_sum";

export interface QuestionChoice {
  value: string;
  labelEn: string;
  labelTh: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  textEn: string;
  textTh: string;
  descEn?: string;
  descTh?: string;
  required: boolean;
  choices?: QuestionChoice[];
  minValue?: number;
  maxValue?: number;
  minChoices?: number;
  maxChoices?: number;
  visibleIf?: { questionId: string; value: string | number };
  rows?: string[];
  rowsTh?: string[];
  columns?: QuestionChoice[];
  category?: string;
}

export interface SurveySection {
  id: string;
  titleEn: string;
  titleTh: string;
  descEn: string;
  descTh: string;
  questions: Question[];
}

export const QUESTION_BANK: SurveySection[] = [
  {
    id: "A",
    titleEn: "Organization, Compensation & Benefits",
    titleTh: "องค์กร ค่าตอบแทน สวัสดิการ และเครื่องมือ",
    descEn: "Compensation, benefits, tools, and overall trust in the organization.",
    descTh: "ค่าตอบแทน สวัสดิการ เครื่องมือ และความเชื่อมั่นในองค์กร",
    questions: [
      { id: "A1", type: "rating", textEn: "I receive fair compensation for my work.", textTh: "ฉันได้รับค่าตอบแทนที่เหมาะสมกับงาน", required: true, minValue: 1, maxValue: 5, category: "Compensation" },
      { id: "A2", type: "rating", textEn: "Company benefits meet my needs.", textTh: "สวัสดิการของบริษัทตอบสนองความต้องการของฉัน", required: true, minValue: 1, maxValue: 5, category: "Benefits" },
      { id: "A3", type: "rating", textEn: "The organization communicates policies clearly.", textTh: "องค์กรสื่อสารนโยบายอย่างชัดเจน", required: true, minValue: 1, maxValue: 5, category: "Leadership" },
      { id: "A4", type: "rating", textEn: "I have the tools and equipment needed to perform effectively.", textTh: "ฉันมีเครื่องมืออุปกรณ์เพียงพอต่อการทำงาน", required: true, minValue: 1, maxValue: 5, category: "Tools" },
      { id: "A5", type: "rating", textEn: "The company provides stable career opportunities.", textTh: "บริษัทมอบโอกาสในการเติบโตในสายอาชีพอย่างมั่นคง", required: true, minValue: 1, maxValue: 5, category: "Growth" },
      { id: "A6", type: "rating", textEn: "I trust the management direction of the organization.", textTh: "ฉันเชื่อมั่นในทิศทางการบริหารขององค์กร", required: true, minValue: 1, maxValue: 5, category: "Leadership" },
      {
        id: "A7",
        type: "nps",
        textEn: "How likely are you to recommend this company as a great place to work?",
        textTh: "คุณมีแนวโน้มที่จะแนะนำบริษัทนี้เป็นสถานที่ทำงานที่ดีมากน้อยแค่ไหน?",
        required: true,
        category: "Advocacy",
      },
    ],
  },
  {
    id: "B",
    titleEn: "Work & Employee Experience",
    titleTh: "ประสบการณ์การทำงานของพนักงาน",
    descEn: "Role clarity, growth, and supervisor support.",
    descTh: "ความชัดเจนของบทบาท การเติบโต และการสนับสนุนจากหัวหน้า",
    questions: [
      { id: "B1", type: "rating", textEn: "My job responsibilities are clearly defined.", textTh: "ความรับผิดชอบในงานของฉันมีความชัดเจน", required: true, minValue: 1, maxValue: 5, category: "Role Clarity" },
      { id: "B2", type: "rating", textEn: "I feel proud of the work I do.", textTh: "ฉันรู้สึกภูมิใจในงานที่ทำ", required: true, minValue: 1, maxValue: 5, category: "Growth" },
      { id: "B3", type: "rating", textEn: "My supervisor supports my development.", textTh: "หัวหน้าของฉันสนับสนุนการพัฒนาของฉัน", required: true, minValue: 1, maxValue: 5, category: "Growth" },
      { id: "B4", type: "rating", textEn: "I receive constructive feedback regularly.", textTh: "ฉันได้รับข้อเสนอแนะที่สร้างสรรค์อย่างสม่ำเสมอ", required: true, minValue: 1, maxValue: 5, category: "Growth" },
      { id: "B5", type: "rating", textEn: "I have opportunities to learn and grow.", textTh: "ฉันมีโอกาสในการเรียนรู้และเติบโต", required: true, minValue: 1, maxValue: 5, category: "Growth" },
      { id: "B6", type: "rating", textEn: "My workload is manageable.", textTh: "ปริมาณงานของฉันอยู่ในระดับที่จัดการได้", required: true, minValue: 1, maxValue: 5, category: "Well-being" },
    ],
  },
  {
    id: "C",
    titleEn: "Work Environment",
    titleTh: "สภาพแวดล้อมการทำงาน",
    descEn: "Safety, collaboration, communication, and well-being.",
    descTh: "ความปลอดภัย การทำงานร่วมกัน การสื่อสาร และความเป็นอยู่ที่ดี",
    questions: [
      { id: "C1", type: "rating", textEn: "My workplace environment is safe.", textTh: "สภาพแวดล้อมในที่ทำงานของฉันมีความปลอดภัย", required: true, minValue: 1, maxValue: 5, category: "Environment" },
      { id: "C2", type: "rating", textEn: "Team collaboration is effective.", textTh: "การทำงานร่วมกันในทีมมีประสิทธิภาพ", required: true, minValue: 1, maxValue: 5, category: "Collaboration" },
      { id: "C3", type: "rating", textEn: "Communication within my team is good.", textTh: "การสื่อสารภายในทีมของฉันเป็นไปด้วยดี", required: true, minValue: 1, maxValue: 5, category: "Collaboration" },
      { id: "C4", type: "rating", textEn: "I feel respected by colleagues.", textTh: "ฉันรู้สึกได้รับความเคารพจากเพื่อนร่วมงาน", required: true, minValue: 1, maxValue: 5, category: "Environment" },
      { id: "C5", type: "rating", textEn: "The organization promotes work-life balance.", textTh: "องค์กรส่งเสริมความสมดุลระหว่างงานและชีวิตส่วนตัว", required: true, minValue: 1, maxValue: 5, category: "Well-being" },
      { id: "C6", type: "rating", textEn: "I feel psychologically safe expressing opinions.", textTh: "ฉันรู้สึกปลอดภัยที่จะแสดงความคิดเห็น", required: true, minValue: 1, maxValue: 5, category: "Environment" },
      {
        id: "C7",
        type: "matrix",
        textEn: "Rate your satisfaction across these areas.",
        textTh: "ประเมินความพึงพอใจของคุณในด้านต่างๆ",
        descEn: "Rate each area on a scale of 1-5",
        descTh: "ให้คะแนนแต่ละด้านในระดับ 1-5",
        required: true,
        rows: ["Work-life balance", "Health & safety", "Recognition"],
        columns: [
          { value: "1", labelEn: "1", labelTh: "1" },
          { value: "2", labelEn: "2", labelTh: "2" },
          { value: "3", labelEn: "3", labelTh: "3" },
          { value: "4", labelEn: "4", labelTh: "4" },
          { value: "5", labelEn: "5", labelTh: "5" },
        ],
        category: "Environment",
      },
    ],
  },
];

export const OPEN_FEEDBACK: Question[] = [
  { id: "F1", type: "open_text_long", textEn: "What does the organization do well?", textTh: "องค์กรทำอะไรได้ดี?", required: false },
  { id: "F2", type: "open_text_long", textEn: "What should the organization improve?", textTh: "องค์กรควรปรับปรุงเรื่องใด?", required: false },
  { id: "F3", type: "open_text_long", textEn: "Additional suggestions or comments", textTh: "ข้อเสนอแนะหรือความคิดเห็นเพิ่มเติม", required: false },
];

export function getSurveySections(surveyId: string): SurveySection[] {
  const survey = MOCK_SURVEYS.find((s) => s.id === surveyId);
  if (!survey) return [];
  return survey.sectionIds
    .map((id) => QUESTION_BANK.find((s) => s.id === id))
    .filter((s): s is SurveySection => s !== undefined);
}

// Synthetic analytics data
export const ENGAGEMENT_BY_DEPT = [
  { dept: "Human Resources", score: 4.3, responses: 42 },
  { dept: "Information Technology", score: 4.1, responses: 78 },
  { dept: "Finance", score: 3.9, responses: 35 },
  { dept: "Sales", score: 3.6, responses: 112 },
  { dept: "Marketing", score: 4.0, responses: 48 },
  { dept: "Operations", score: 3.7, responses: 96 },
  { dept: "Production", score: 3.5, responses: 184 },
  { dept: "Logistics", score: 3.8, responses: 67 },
];

export const ENGAGEMENT_TREND = [
  { period: "Q1 2024", score: 3.6 },
  { period: "Q2 2024", score: 3.7 },
  { period: "Q3 2024", score: 3.8 },
  { period: "Q4 2024", score: 3.9 },
  { period: "Q1 2025", score: 4.0 },
  { period: "Q2 2025", score: 4.1 },
];

export const RESPONSE_DISTRIBUTION = [
  { rating: "Strongly Disagree", count: 38 },
  { rating: "Disagree", count: 92 },
  { rating: "Neutral", count: 214 },
  { rating: "Agree", count: 486 },
  { rating: "Strongly Agree", count: 332 },
];

export const CATEGORY_SCORES = [
  { category: "Compensation", score: 3.7 },
  { category: "Benefits", score: 3.9 },
  { category: "Tools", score: 4.0 },
  { category: "Leadership", score: 3.8 },
  { category: "Growth", score: 4.1 },
  { category: "Environment", score: 4.2 },
  { category: "Collaboration", score: 4.3 },
  { category: "Well-being", score: 3.9 },
];

export const HEATMAP_DATA = [
  { dept: "HR", A: 4.3, B: 4.4, C: 4.2 },
  { dept: "IT", A: 4.0, B: 4.2, C: 4.1 },
  { dept: "Finance", A: 3.8, B: 4.0, C: 3.9 },
  { dept: "Sales", A: 3.4, B: 3.7, C: 3.6 },
  { dept: "Marketing", A: 4.0, B: 4.1, C: 3.9 },
  { dept: "Operations", A: 3.6, B: 3.8, C: 3.8 },
  { dept: "Production", A: 3.3, B: 3.5, C: 3.6 },
  { dept: "Logistics", A: 3.7, B: 3.9, C: 3.8 },
];

export interface MockSurvey {
  id: string;
  titleEn: string;
  titleTh: string;
  status: "Active" | "Closed" | "Draft";
  surveyType: "anonymous" | "identified";
  startDate: string;
  endDate: string;
  responses: number;
  target: number;
  sectionIds: string[];
}

export const MOCK_SURVEYS: MockSurvey[] = [
  { id: "s1", titleEn: "Annual Engagement Survey 2025", titleTh: "แบบสำรวจความผูกพัน ประจำปี 2568", status: "Active", surveyType: "identified", startDate: "2025-04-01", endDate: "2025-05-31", responses: 662, target: 850, sectionIds: ["A", "B", "C"] },
  { id: "s2", titleEn: "Pulse Check — Q1", titleTh: "Pulse Check ไตรมาส 1", status: "Closed", surveyType: "identified", startDate: "2025-01-15", endDate: "2025-02-15", responses: 731, target: 820, sectionIds: ["A", "B", "C"] },
  { id: "s3", titleEn: "Onboarding Feedback", titleTh: "ความคิดเห็นพนักงานใหม่", status: "Draft", surveyType: "identified", startDate: "—", endDate: "—", responses: 0, target: 120, sectionIds: ["A"] },
  { id: "s4", titleEn: "Pulse Survey — Q2 2025 (Anonymous)", titleTh: "Pulse Survey ไตรมาส 2/2568 (ไม่ระบุตัวตน)", status: "Active", surveyType: "anonymous", startDate: "2025-05-01", endDate: "2025-06-15", responses: 234, target: 850, sectionIds: ["A", "C"] },
];
