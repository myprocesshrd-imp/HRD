// Mock data + types for the HR Engagement Survey app (frontend-only v1).
export type Role = "super_admin" | "hr_admin" | "manager" | "employee";

export interface MockUser {
  id: string;
  employeeCode: string;
  email: string;
  password: string;
  nameTh: string;
  nameEn: string;
  role: Role;
  department: string;
  businessUnit: string;
  level: string;
  location: string;
  avatarUrl: string;
  isActive?: boolean;
  lastSyncedAt?: string;
  lastLoginAt?: string;
}

export const MOCK_USERS: MockUser[] = [
  { id: "u1", employeeCode: "admin", email: "admin@company.co.th", password: "admin123", nameTh: "สมชาย ใจดี", nameEn: "Somchai Jaidee", role: "super_admin", department: "IT", businessUnit: "Corporate", level: "Executive", location: "Head Office", avatarUrl: "" },
  { id: "u2", employeeCode: "hr", email: "hr@company.co.th", password: "hr123", nameTh: "อารยา ทรัพย์มั่น", nameEn: "Araya Sapman", role: "hr_admin", department: "Human Resources", businessUnit: "Corporate", level: "Manager", location: "Head Office", avatarUrl: "" },
  { id: "u3", employeeCode: "manager", email: "manager@company.co.th", password: "manager123", nameTh: "ธนพล ก้าวหน้า", nameEn: "Thanaphol Kaona", role: "manager", department: "Sales", businessUnit: "Commercial", level: "Senior Manager", location: "Head Office", avatarUrl: "" },
  { id: "u4", employeeCode: "employee", email: "employee@company.co.th", password: "employee123", nameTh: "พิมพ์ชนก สดใส", nameEn: "Pimchanok Sodsai", role: "employee", department: "Marketing", businessUnit: "Commercial", level: "Operational Level", location: "Head Office", avatarUrl: "" },
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
  rows?: { textEn: string; textTh: string }[];
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
        rows: [
          { textEn: "Work-life balance", textTh: "ความสมดุลระหว่างงานและชีวิตส่วนตัว" },
          { textEn: "Health & safety", textTh: "สุขภาพและความปลอดภัย" },
          { textEn: "Recognition", textTh: "การได้รับการยอมรับ" }
        ],
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

  // ── Section D: Direction & Organizational Trust ──
  {
    id: "D",
    titleEn: "Direction & Organizational Trust",
    titleTh: "ด้านทิศทางและความเชื่อมั่นต่อองค์กร",
    descEn: "Trust in management direction, policies, and pride in the organization.",
    descTh: "ความเชื่อมั่นในทิศทางขององค์กร นโยบาย และความภาคภูมิใจในองค์กร",
    questions: [
      {
        id: "D1", type: "single_select" as const,
        textEn: "When new policies or regulations are announced by management:",
        textTh: "เมื่อมีการประกาศนโยบายหรือกฎระเบียบใหม่จากฝ่ายบริหาร",
        descEn: "Measures trust in organizational direction & policy",
        descTh: "วัดความพึงพอใจทิศทางองค์กร & นโยบาย",
        required: true,
        choices: [
          { value: "a", labelEn: "I trust this policy is designed to develop the organization while taking good care of employees.", labelTh: "ฉันเชื่อมั่นว่านโยบายนี้ถูกออกแบบมาเพื่อพัฒนาองค์กรควบคู่ไปกับการดูแลพนักงานอย่างดี" },
          { value: "b", labelEn: "I am ready to follow the rules, believing they provide a clear and fair framework.", labelTh: "ฉันพร้อมปฏิบัติตามกฎระเบียบ เพราะเชื่อว่าเป็นกรอบการทำงานที่ชัดเจนและเป็นธรรม" },
          { value: "c", labelEn: "I begin to wonder if this policy focuses too much on controlling employees, reducing flexibility.", labelTh: "ฉันเริ่มสงสัยว่านโยบายนี้อาจเน้นการควบคุมพนักงานมากเกินไปจนลดความยืดหยุ่น" },
          { value: "d", labelEn: "I feel the policy lacks clarity and is often issued without considering actual workers.", labelTh: "ฉันรู้สึกว่านโยบายขาดความชัดเจน และมักจะออกมาโดยไม่คำนึงถึงผู้ปฏิบัติงานจริง" },
        ],
      },
      {
        id: "D2", type: "single_select" as const,
        textEn: "If an acquaintance asks you 'How is it working at this company?':",
        textTh: "หากมีคนรู้จักถามคุณว่า \"ทำงานที่บริษัทนี้เป็นอย่างไรบ้าง?\"",
        descEn: "Measures engagement & pride",
        descTh: "วัดความผูกพัน & ความภาคภูมิใจ",
        required: true,
        choices: [
          { value: "a", labelEn: "I always speak with pride and praise the company, because I love being part of it.", labelTh: "ฉันจะเล่าด้วยความภูมิใจและชื่นชมบริษัทให้ฟังเสมอ เพราะฉันรักที่จะเป็นส่วนหนึ่งของที่นี่" },
          { value: "b", labelEn: "I share the good things honestly and feel satisfied with my employee status here.", labelTh: "ฉันจะบอกเล่าสิ่งดีๆ ตามความเป็นจริง และรู้สึกพึงพอใจในสถานะพนักงานของที่นี่" },
          { value: "c", labelEn: "I usually give evasive or neutral answers, because I'm unsure about the stability here.", labelTh: "ฉันมักจะตอบเลี่ยงๆ หรือให้ข้อมูลกลางๆ เพราะเริ่มรู้สึกไม่แน่ใจในความมั่นคงของที่นี่" },
          { value: "d", labelEn: "I often vent my dissatisfaction and would not recommend anyone to work here.", labelTh: "ฉันมักจะระบายความไม่พึงพอใจ และไม่อยากแนะนำให้ใครเข้ามาทำงานที่นี่เลย" },
        ],
      },
      {
        id: "D3", type: "single_select" as const,
        textEn: "If today another opportunity came along offering higher pay and an interesting position:",
        textTh: "หากวันนี้มีโอกาสจากที่อื่นเสนอมา โดยให้รายได้สูงกว่าและมีตำแหน่งงานที่น่าสนใจ",
        descEn: "Measures retention & loyalty",
        descTh: "วัดการคงอยู่ & ความภักดี",
        required: true,
        choices: [
          { value: "a", labelEn: "I would definitely refuse, because I want to grow with this organization long-term.", labelTh: "ฉันจะปฏิเสธแน่นอน เพราะฉันต้องการเติบโตไปพร้อมกับองค์กรแห่งนี้ในระยะยาว" },
          { value: "b", labelEn: "I would consider it carefully, but my commitment here will make me choose to stay.", labelTh: "ฉันจะนำมาพิจารณาอย่างรอบคอบ แต่ความผูกพันที่มีต่อที่นี่จะทำให้ฉันเลือกอยู่ต่อ" },
          { value: "c", labelEn: "I would go for an interview, because I'm starting to want a change of environment.", labelTh: "ฉันจะลองไปสัมภาษณ์ดู เพราะเริ่มรู้สึกอยากลองเปลี่ยนสภาพแวดล้อมใหม่ๆ" },
          { value: "d", labelEn: "I would resign immediately, because I'm ready to leave whenever a good opportunity comes.", labelTh: "ฉันจะลาออกทันที เพราะฉันพร้อมจะไปจากที่นี่ทุกเมื่อที่มีโอกาสดีๆ เข้ามา" },
        ],
      },
    ],
  },
  // ── Section E: Work & Workload ──
  {
    id: "E",
    titleEn: "Work & Workload",
    titleTh: "ด้านการทำงานและภาระงาน",
    descEn: "Satisfaction with role, workload, and work-life balance.",
    descTh: "ความพึงพอใจในหน้าที่ ภาระงาน และสมดุลชีวิต",
    questions: [
      {
        id: "E1", type: "single_select" as const,
        textEn: "When you look back at the role and responsibilities you've been assigned:",
        textTh: "เมื่อคุณมองย้อนดูบทบาทและหน้าที่ที่ได้รับมอบหมายในปัจจุบัน",
        descEn: "Measures workload satisfaction & role fit",
        descTh: "วัดความพึงพอใจภาระงาน & ความพึงพอใจในหน้าที่",
        required: true,
        choices: [
          { value: "a", labelEn: "I am happy and proud of this role because it matches my strengths and lets me show my full potential.", labelTh: "ฉันมีความสุขและภาคภูมิใจในหน้าที่นี้ เพราะตรงกับความถนัดและได้แสดงศักยภาพเต็มที่" },
          { value: "b", labelEn: "I am satisfied with my work and can manage my workload at an appropriate level.", labelTh: "ฉันพึงพอใจกับงานที่ทำ และสามารถจัดการภาระงานให้อยู่ในระดับที่เหมาะสมได้" },
          { value: "c", labelEn: "The workload is getting heavy, I feel exhausted, and it affects my work-life balance.", labelTh: "ภาระงานเริ่มหนักจนฉันรู้สึกเหนื่อยล้า และส่งผลกระทบต่อสมดุลชีวิตส่วนตัว" },
          { value: "d", labelEn: "I feel the assigned work is not suitable for my role and it negatively affects my mental/physical health.", labelTh: "ฉันรู้สึกว่างานที่ได้รับมอบหมายไม่เหมาะสมกับบทบาท และส่งผลเสียต่อสุขภาพกาย/ใจอย่างมาก" },
        ],
      },
    ],
  },
  // ── Section F: Supervisor Effectiveness ──
  {
    id: "F",
    titleEn: "Supervisor Effectiveness",
    titleTh: "ด้านประสิทธิภาพหัวหน้างาน",
    descEn: "Supervisor support, communication, and conflict resolution.",
    descTh: "การสนับสนุนจากหัวหน้า การสื่อสาร และการแก้ไขปัญหา",
    questions: [
      {
        id: "F1", type: "single_select" as const,
        textEn: "When work problems arise or there is conflict in the team:",
        textTh: "ในสถานการณ์ที่งานเกิดปัญหาติดขัดหรือมีความขัดแย้งในทีม",
        descEn: "Measures satisfaction with supervisor management",
        descTh: "วัดความพึงพอใจการบริหารของหัวหน้างาน",
        required: true,
        choices: [
          { value: "a", labelEn: "My supervisor helps plan and resolve issues systematically, making me feel confident and safe.", labelTh: "หัวหน้าเข้ามาช่วยวางแผนและจัดการปัญหาอย่างเป็นระบบ ทำให้ฉันรู้สึกมั่นใจและปลอดภัย" },
          { value: "b", labelEn: "My supervisor tries to listen and find concrete solutions to keep the work moving forward.", labelTh: "หัวหน้าพยายามรับฟังและหาทางออกที่เป็นรูปธรรมเพื่อให้งานเดินหน้าต่อได้" },
          { value: "c", labelEn: "Problems rarely get resolved in time, leaving me to bear the pressure alone.", labelTh: "ปัญหาไม่ค่อยได้รับแก้ไขอย่างทันท่วงที ทำให้ฉันต้องแบกรับความกดดันเพียงลำพัง" },
          { value: "d", labelEn: "Management lacks system and the supervisor often decides without listening to those involved.", labelTh: "การบริหารงานขาดระบบ และหัวหน้ามักตัดสินใจโดยไม่ฟังความเห็นของผู้ที่เกี่ยวข้อง" },
        ],
      },
      {
        id: "F2", type: "single_select" as const,
        textEn: "When you have a different opinion or want to propose new ways of working:",
        textTh: "เมื่อคุณมีความคิดเห็นที่ต่างออกไปหรืออยากเสนอวิธีทำงานใหม่ๆ",
        descEn: "Measures psychological safety & participation",
        descTh: "วัดความปลอดภัยทางจิตใจ & การมีส่วนร่วม",
        required: true,
        choices: [
          { value: "a", labelEn: "I feel very comfortable speaking up because my supervisor respects and always opens space for participation.", labelTh: "ฉันรู้สึกสบายใจมากที่จะพูด เพราะหัวหน้าให้เกียรติและเปิดพื้นที่ให้มีส่วนร่วมเสมอ" },
          { value: "b", labelEn: "I can exchange opinions as needed and am usually listened to well.", labelTh: "ฉันสามารถแลกเปลี่ยนความเห็นได้ตามความจำเป็น และมักจะได้รับการรับฟังเป็นอย่างดี" },
          { value: "c", labelEn: "I am quite cautious when speaking because I'm not sure if my opinions will actually be used.", labelTh: "ฉันค่อนข้างระวังตัวในการพูด เพราะไม่มั่นใจว่าความคิดเห็นจะถูกนำไปใช้จริงหรือไม่" },
          { value: "d", labelEn: "I choose to stay silent because I feel my supervisor is not open to new ideas and only gives orders.", labelTh: "ฉันเลือกที่จะเงียบ เพราะรู้สึกว่าหัวหน้าไม่เปิดรับไอเดียใหม่ๆ และเน้นแต่คำสั่ง" },
        ],
      },
    ],
  },
  // ── Section G: Career Growth ──
  {
    id: "G",
    titleEn: "Career Growth",
    titleTh: "ด้านการเติบโตในสายอาชีพ",
    descEn: "Training opportunities, career development, and goal setting.",
    descTh: "โอกาสฝึกอบรม การเติบโตในสายอาชีพ และการตั้งเป้าหมาย",
    questions: [
      {
        id: "G1", type: "single_select" as const,
        textEn: "When there are new training programs or challenging assignments:",
        textTh: "เมื่อมีโครงการฝึกอบรมหรือการมอบหมายงานที่ท้าทายใหม่ๆ",
        descEn: "Measures satisfaction with growth & skill development",
        descTh: "วัดความพึงพอใจในการเติบโต & การพัฒนาทักษะ",
        required: true,
        choices: [
          { value: "a", labelEn: "I receive full support and clearly see opportunities for career growth.", labelTh: "ฉันได้รับการสนับสนุนอย่างเต็มที่ และมองเห็นโอกาสที่จะเติบโตในสายอาชีพชัดเจน" },
          { value: "b", labelEn: "I get some development opportunities as appropriate to the needs of the job.", labelTh: "ฉันได้รับโอกาสในการพัฒนาทักษะบ้างตามความเหมาะสมและความจำเป็นของงาน" },
          { value: "c", labelEn: "I feel learning opportunities are quite limited and I'm rarely encouraged to advance.", labelTh: "ฉันรู้สึกว่าโอกาสในการเรียนรู้ค่อนข้างจำกัด และไม่ค่อยได้รับการส่งเสริมให้ก้าวหน้า" },
          { value: "d", labelEn: "I see no growth path here at all, and I feel my abilities have stagnated.", labelTh: "ฉันไม่เห็นช่องทางการเติบโตที่นี่เลย และรู้สึกเหมือนความสามารถของฉันหยุดนิ่งอยู่กับที่" },
        ],
      },
      {
        id: "G2", type: "single_select" as const,
        textEn: "In the goal-setting process (KPI/annual targets):",
        textTh: "ในกระบวนการตั้งเป้าหมายการทำงาน (KPI/เป้าหมายประจำปี)",
        descEn: "Measures goal clarity & participation",
        descTh: "วัดความชัดเจนของเป้าหมาย & การมีส่วนร่วม",
        required: true,
        choices: [
          { value: "a", labelEn: "I participate in setting goals together with my supervisor to align with my strengths.", labelTh: "ฉันมีส่วนร่วมในการกำหนดเป้าหมายร่วมกับหัวหน้า เพื่อให้สอดคล้องกับความถนัดของฉัน" },
          { value: "b", labelEn: "The assigned goals are achievable and I understand the organization's expectations.", labelTh: "เป้าหมายที่ได้รับมอบหมายมีความเป็นไปได้ และฉันเข้าใจความคาดหวังขององค์กร" },
          { value: "c", labelEn: "Goals are set from the top down without me having a chance to discuss or propose.", labelTh: "เป้าหมายถูกกำหนดมาจากข้างบนฝ่ายเดียว โดยที่ฉันไม่มีโอกาสได้โต้แย้งหรือเสนอแนะ" },
          { value: "d", labelEn: "Work goals are unclear or unrealistically difficult, making me feel pressured and directionless.", labelTh: "เป้าหมายงานไม่มีความชัดเจน หรือยากจนเกินจริง ทำให้ฉันรู้สึกกดดันและไร้ทิศทาง" },
        ],
      },
    ],
  },
  // ── Section H: Compensation & Benefits ──
  {
    id: "H",
    titleEn: "Compensation & Benefits",
    titleTh: "ด้านค่าตอบแทนและสวัสดิการ",
    descEn: "Salary structure, fairness, and welfare satisfaction.",
    descTh: "โครงสร้างเงินเดือน ความเป็นธรรม และความพึงพอใจในสวัสดิการ",
    questions: [
      {
        id: "H1", type: "single_select" as const,
        textEn: "When it comes to the salary structure and annual compensation adjustment:",
        textTh: "เมื่อพูดถึงโครงสร้างเงินเดือนและการปรับผลตอบแทนประจำปี",
        descEn: "Measures satisfaction with compensation & benefits",
        descTh: "วัดความพึงพอใจในค่าตอบแทน & สวัสดิการ",
        required: true,
        choices: [
          { value: "a", labelEn: "I am very satisfied because the criteria are clear, fair, and truly reflect my dedication.", labelTh: "ฉันพอใจมาก เพราะมีเกณฑ์ที่ชัดเจน ยุติธรรม และสะท้อนความทุ่มเทของฉันอย่างแท้จริง" },
          { value: "b", labelEn: "I can accept it because it's at a standard level and appropriate for my responsibilities.", labelTh: "ฉันยอมรับได้ เพราะอยู่ในระดับมาตรฐานและเหมาะสมกับหน้าที่ความรับผิดชอบ" },
          { value: "c", labelEn: "I'm starting to feel the compensation is not worth it compared to the fatigue and increased workload.", labelTh: "ฉันเริ่มรู้สึกว่าผลตอบแทนไม่คุ้มค่าเมื่อเทียบกับความเหนื่อยล้าและภาระงานที่เพิ่มขึ้น" },
          { value: "d", labelEn: "I am disappointed with the current system because it lacks transparency and doesn't value employees.", labelTh: "ฉันผิดหวังกับระบบที่เป็นอยู่ เพราะขาดความโปร่งใสและไม่เห็นคุณค่าของพนักงาน" },
        ],
      },
      {
        id: "H2", type: "single_select" as const,
        textEn: "If this year's benefits still don't meet your expectations:",
        textTh: "หากสวัสดิการของบริษัทในปีนี้ยังไม่ตอบโจทย์ความคาดหวังของคุณมากนัก",
        descEn: "Measures benefits satisfaction & retention impact",
        descTh: "วัดผลกระทบของสวัสดิการต่อการคงอยู่",
        required: true,
        choices: [
          { value: "a", labelEn: "I am still happy at work because team, work, and organizational culture matter more.", labelTh: "ฉันยังมีความสุขในการทำงาน เพราะปัจจัยด้านทีม งาน และวัฒนธรรมองค์กรมีความสำคัญมากกว่า" },
          { value: "b", labelEn: "I will continue working and hope to see improvement in benefits in the future.", labelTh: "ฉันยังคงทำงานต่อ และหวังว่าจะเห็นการพัฒนาด้านสวัสดิการในอนาคต" },
          { value: "c", labelEn: "This affects my motivation and makes me start comparing with other organizations.", labelTh: "สิ่งนี้ส่งผลต่อแรงจูงใจของฉัน และทำให้เริ่มเปรียบเทียบกับองค์กรอื่น" },
          { value: "d", labelEn: "This significantly impacts my decision to stay with the company.", labelTh: "สิ่งนี้มีผลอย่างมากต่อการตัดสินใจอยู่ต่อกับบริษัทของฉัน" },
        ],
      },
    ],
  },
  // ── Section I: Work Environment ──
  {
    id: "I",
    titleEn: "Work Environment",
    titleTh: "ด้านสภาพแวดล้อมในการทำงาน",
    descEn: "Physical workspace, 5S, equipment, and technology.",
    descTh: "สถานที่ทำงาน 5ส อุปกรณ์ และเทคโนโลยี",
    questions: [
      {
        id: "I1", type: "single_select" as const,
        textEn: "The workplace has 5S characteristics and general atmosphere (light/sound/air):",
        textTh: "สถานที่ทำงานมีคุณลักษณะตามหลัก 5ส และบรรยากาศทั่วไป (แสง/เสียง/อากาศ)",
        descEn: "Measures satisfaction with work environment & tools",
        descTh: "วัดความพึงพอใจในสภาพแวดล้อม & อุปกรณ์และเครื่องมือการทำงาน",
        required: true,
        choices: [
          { value: "a", labelEn: "Excellent atmosphere, clean, tidy, helps me concentrate and work smoothly.", labelTh: "บรรยากาศดีเยี่ยม สะอาด เป็นระเบียบ ช่วยให้ฉันมีสมาธิและทำงานได้อย่างราบรื่น" },
          { value: "b", labelEn: "The environment meets standards and helps me work without obstacles.", labelTh: "สภาพแวดล้อมมีความเหมาะสมตามมาตรฐาน ช่วยให้ทำงานได้โดยไม่เป็นอุปสรรค" },
          { value: "c", labelEn: "Some areas are deteriorating or too busy, disturbing my work.", labelTh: "สภาพแวดล้อมบางจุดเริ่มเสื่อมโทรม หรือมีความพลุกพล่านจนรบกวนการทำงาน" },
          { value: "d", labelEn: "The workplace is very unsuitable, uncomfortable, or lacks proper hygiene care.", labelTh: "สถานที่ทำงานไม่เอื้ออำนวยอย่างมาก อึดอัด หรือขาดการดูแลเรื่องสุขลักษณะที่เหมาะสม" },
        ],
      },
      {
        id: "I2", type: "single_select" as const,
        textEn: "Efficiency of office equipment and work technology:",
        textTh: "ประสิทธิภาพของอุปกรณ์สำนักงานและเทคโนโลยีที่ใช้ทำงาน",
        descEn: "Measures equipment & technology satisfaction",
        descTh: "วัดความพึงพอใจด้านอุปกรณ์และเทคโนโลยี",
        required: true,
        choices: [
          { value: "a", labelEn: "Equipment is modern and highly efficient, helping me work quickly and professionally.", labelTh: "อุปกรณ์ทันสมัยและมีประสิทธิภาพสูงมาก ช่วยให้ฉันทำงานได้รวดเร็วและเป็นมืออาชีพ" },
          { value: "b", labelEn: "Equipment is sufficient and works well for basic job requirements.", labelTh: "อุปกรณ์มีเพียงพอและใช้งานได้ดีตามความจำเป็นพื้นฐานของงาน" },
          { value: "c", labelEn: "Equipment is outdated or frequently malfunctions, causing me to waste time on trivial matters.", labelTh: "อุปกรณ์เริ่มล้าสมัยหรือทำงานติดขัดบ่อยครั้ง ทำให้ฉันต้องเสียเวลาไปกับเรื่องที่ไม่เป็นเรื่อง" },
          { value: "d", labelEn: "There is a shortage of necessary tools or outdated technology is a major obstacle to work.", labelTh: "ขาดแคลนเครื่องมือที่จำเป็น หรือเทคโนโลยีล้าหลังจนเป็นอุปสรรคสำคัญในการทำงาน" },
        ],
      },
    ],
  },
  // ── Section J: Organizational Culture & Relationships ──
  {
    id: "J",
    titleEn: "Organizational Culture & Relationships",
    titleTh: "ด้านวัฒนธรรมองค์กรและความสัมพันธ์",
    descEn: "Cross-team collaboration, team relationships, and recognition.",
    descTh: "การทำงานข้ามแผนก ความสัมพันธ์ในทีม และการยกย่องชมเชย",
    questions: [
      {
        id: "J1", type: "single_select" as const,
        textEn: "When you need to coordinate or ask for help from other departments:",
        textTh: "เมื่อคุณต้องประสานงานหรือขอความช่วยเหลือจากหน่วยงานอื่นภายในบริษัท",
        descEn: "Measures satisfaction with organizational culture & colleagues",
        descTh: "วัดความพึงพอใจในวัฒนธรรมองค์กร & เพื่อนร่วมงาน",
        required: true,
        choices: [
          { value: "a", labelEn: "Everyone cooperates very well, there is unity and focus on company goals.", labelTh: "ทุกคนให้ความร่วมมือดีมาก มีความเป็นน้ำหนึ่งใจเดียวกันและมุ่งสู่เป้าหมายของบริษัท" },
          { value: "b", labelEn: "Coordination is smooth according to the system, and I receive reasonable help.", labelTh: "การประสานงานเป็นไปอย่างราบรื่นตามระบบงาน และได้รับความช่วยเหลือตามสมควร" },
          { value: "c", labelEn: "There is often work-shifting or delays, making cross-department coordination tiring.", labelTh: "มักจะเกิดการเกี่ยงงานหรือความล่าช้า ทำให้ฉันรู้สึกเหนื่อยในการประสานงานข้ามแผนก" },
          { value: "d", labelEn: "The atmosphere is full of fault-finding and conflict, making cross-team collaboration difficult.", labelTh: "บรรยากาศเต็มไปด้วยการจับผิดและความขัดแย้ง ทำให้การร่วมงานข้ามหน่วยงานเป็นเรื่องยาก" },
        ],
      },
      {
        id: "J2", type: "single_select" as const,
        textEn: "How you feel when you wake up to see your teammates every day:",
        textTh: "ความรู้สึกของคุณเมื่อต้องตื่นมาเจอเพื่อนร่วมงานในทีมเดียวกันทุกวัน",
        descEn: "Measures team relationship satisfaction",
        descTh: "วัดความพึงพอใจด้านความสัมพันธ์ในทีม",
        required: true,
        choices: [
          { value: "a", labelEn: "I am very happy because we have strong relationships, trust, and always support each other.", labelTh: "ฉันมีความสุขมาก เพราะเรามีความสัมพันธ์ที่แน่นแฟ้น ไว้ใจกัน และซัพพอร์ตกันเสมอ" },
          { value: "b", labelEn: "Team relationships are good; we work together professionally and respectfully.", labelTh: "ความสัมพันธ์ในทีมอยู่ในเกณฑ์ดี เราทำงานร่วมกันได้อย่างเป็นมืออาชีพและให้เกียรติกัน" },
          { value: "c", labelEn: "Relationships are becoming tense or there is cliques forming, making me uncomfortable.", labelTh: "ความสัมพันธ์เริ่มมีความตึงเครียด หรือมีการแบ่งกลุ่มแบ่งพวกจนทำให้ฉันอึดอัดใจ" },
          { value: "d", labelEn: "The team atmosphere is very bad; I feel isolated or face conflict all the time.", labelTh: "บรรยากาศในทีมแย่มาก ฉันรู้สึกโดดเดี่ยวหรือต้องเผชิญกับความขัดแย้งตลอดเวลา" },
        ],
      },
      {
        id: "J3", type: "single_select" as const,
        textEn: "When you work hard and your results are successful:",
        textTh: "เมื่อคุณทุ่มเททำงานอย่างหนักจนผลงานออกมาประสบความสำเร็จ",
        descEn: "Measures satisfaction with motivation & recognition",
        descTh: "วัดความพึงพอใจในแรงจูงใจ & การยกย่องชมเชย",
        required: true,
        choices: [
          { value: "a", labelEn: "The organization has ways to praise and reward that make me feel valued and motivated to improve.", labelTh: "องค์กรมีวิธีชื่นชมและให้รางวัลที่ทำให้ฉันรู้สึกมีคุณค่าและมีแรงผลักดันที่จะเก่งขึ้น" },
          { value: "b", labelEn: "I receive appropriate praise or recognition, which encourages me to continue working.", labelTh: "ฉันได้รับคำชมหรือการยอมรับตามสมควร ซึ่งช่วยให้มีกำลังใจในการทำงานต่อไป" },
          { value: "c", labelEn: "Recognition is rare; mostly it's seen as just doing my duty.", labelTh: "การยกย่องชมเชยเกิดขึ้นได้ยาก ส่วนใหญ่มักถูกมองว่าเป็นแค่การทำตามหน้าที่เท่านั้น" },
          { value: "d", labelEn: "My dedication is often overlooked, and no importance is given to the achievements.", labelTh: "ความทุ่มเทของฉันมักถูกมองข้าม และไม่มีการให้ความสำคัญกับความสำเร็จที่เกิดขึ้นเลย" },
        ],
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
  { id: "s1", titleEn: "Annual Engagement Survey 2025", titleTh: "แบบสำรวจความผูกพัน ประจำปี 2568", status: "Active", surveyType: "identified", startDate: "2025-04-01", endDate: "2025-05-31", responses: 662, target: 850, sectionIds: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] },
  { id: "s2", titleEn: "Pulse Check — Q1", titleTh: "Pulse Check ไตรมาส 1", status: "Closed", surveyType: "identified", startDate: "2025-01-15", endDate: "2025-02-15", responses: 731, target: 820, sectionIds: ["A", "B", "C"] },
  { id: "s3", titleEn: "Onboarding Feedback", titleTh: "ความคิดเห็นพนักงานใหม่", status: "Draft", surveyType: "identified", startDate: "—", endDate: "—", responses: 0, target: 120, sectionIds: ["A"] },
  { id: "s4", titleEn: "Pulse Survey — Q2 2025 (Anonymous)", titleTh: "Pulse Survey ไตรมาส 2/2568 (ไม่ระบุตัวตน)", status: "Active", surveyType: "anonymous", startDate: "2025-05-01", endDate: "2025-06-15", responses: 234, target: 850, sectionIds: ["A", "C"] },
  { id: "sk1", titleEn: "Employee Engagement Survey SK", titleTh: "แบบสำรวจความผูกพันพนักงาน SK", status: "Active", surveyType: "anonymous", startDate: "2026-05-01", endDate: "2026-07-31", responses: 0, target: 500, sectionIds: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] },
];
