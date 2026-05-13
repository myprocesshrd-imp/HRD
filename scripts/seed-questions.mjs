import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(url, key);

const SECTIONS = [
  {
    code: "D",
    sort_order: 4,
    titleEn: "Direction & Organizational Trust",
    titleTh: "ด้านทิศทางและความเชื่อมั่นต่อองค์กร",
    descEn: "Trust in management direction, policies, and pride in the organization.",
    descTh: "ความเชื่อมั่นในทิศทางขององค์กร นโยบาย และความภาคภูมิใจในองค์กร",
  },
  {
    code: "E",
    sort_order: 5,
    titleEn: "Work & Workload",
    titleTh: "ด้านการทำงานและภาระงาน",
    descEn: "Satisfaction with role, workload, and work-life balance.",
    descTh: "ความพึงพอใจในหน้าที่ ภาระงาน และสมดุลชีวิต",
  },
  {
    code: "F",
    sort_order: 6,
    titleEn: "Supervisor Effectiveness",
    titleTh: "ด้านประสิทธิภาพหัวหน้างาน",
    descEn: "Supervisor support, communication, and conflict resolution.",
    descTh: "การสนับสนุนจากหัวหน้า การสื่อสาร และการแก้ไขปัญหา",
  },
  {
    code: "G",
    sort_order: 7,
    titleEn: "Career Growth",
    titleTh: "ด้านการเติบโตในสายอาชีพ",
    descEn: "Training opportunities, career development, and goal setting.",
    descTh: "โอกาสฝึกอบรม การเติบโตในสายอาชีพ และการตั้งเป้าหมาย",
  },
  {
    code: "H",
    sort_order: 8,
    titleEn: "Compensation & Benefits",
    titleTh: "ด้านค่าตอบแทนและสวัสดิการ",
    descEn: "Salary structure, fairness, and welfare satisfaction.",
    descTh: "โครงสร้างเงินเดือน ความเป็นธรรม และความพึงพอใจในสวัสดิการ",
  },
  {
    code: "I",
    sort_order: 9,
    titleEn: "Work Environment",
    titleTh: "ด้านสภาพแวดล้อมในการทำงาน",
    descEn: "Physical workspace, 5S, equipment, and technology.",
    descTh: "สถานที่ทำงาน 5ส อุปกรณ์ และเทคโนโลยี",
  },
  {
    code: "J",
    sort_order: 10,
    titleEn: "Organizational Culture & Relationships",
    titleTh: "ด้านวัฒนธรรมองค์กรและความสัมพันธ์",
    descEn: "Cross-team collaboration, team relationships, and recognition.",
    descTh: "การทำงานข้ามแผนก ความสัมพันธ์ในทีม และการยกย่องชมเชย",
  },
];

const QUESTIONS = [
  {
    sectionCode: "D",
    sort_order: 0,
    type: "single_select",
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
    sectionCode: "D",
    sort_order: 1,
    type: "single_select",
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
    sectionCode: "D",
    sort_order: 2,
    type: "single_select",
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
  {
    sectionCode: "E",
    sort_order: 0,
    type: "single_select",
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
  {
    sectionCode: "F",
    sort_order: 0,
    type: "single_select",
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
    sectionCode: "F",
    sort_order: 1,
    type: "single_select",
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
  {
    sectionCode: "G",
    sort_order: 0,
    type: "single_select",
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
    sectionCode: "G",
    sort_order: 1,
    type: "single_select",
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
  {
    sectionCode: "H",
    sort_order: 0,
    type: "single_select",
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
    sectionCode: "H",
    sort_order: 1,
    type: "single_select",
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
  {
    sectionCode: "I",
    sort_order: 0,
    type: "single_select",
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
    sectionCode: "I",
    sort_order: 1,
    type: "single_select",
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
  {
    sectionCode: "J",
    sort_order: 0,
    type: "single_select",
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
    sectionCode: "J",
    sort_order: 1,
    type: "single_select",
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
    sectionCode: "J",
    sort_order: 2,
    type: "single_select",
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
];

async function seed() {
  console.log("=== Creating sections D-J ===");
  const sectionMap = {};
  for (const sec of SECTIONS) {
    const { data, error } = await sb
      .from("sections")
      .insert([
        {
          code: sec.code,
          title_en: sec.titleEn,
          title_th: sec.titleTh,
          desc_en: sec.descEn,
          desc_th: sec.descTh,
          sort_order: sec.sort_order,
        },
      ])
      .select("id, code")
      .single();
    if (error) {
      console.error(`Failed to insert section ${sec.code}:`, error.message);
      return;
    }
    sectionMap[data.code] = data.id;
    console.log(`  ✓ Section ${sec.code} → ${data.id}`);
  }

  console.log("\n=== Creating 15 questions with choices ===");
  let qCount = 0;
  for (const q of QUESTIONS) {
    const sectionId = sectionMap[q.sectionCode];
    if (!sectionId) {
      console.error(`  ✗ Section ${q.sectionCode} not found, skipping`);
      continue;
    }
    const { data: question, error: qErr } = await sb
      .from("questions")
      .insert([
        {
          section_id: sectionId,
          type: q.type,
          text_en: q.textEn,
          text_th: q.textTh,
          desc_en: q.descEn ?? null,
          desc_th: q.descTh ?? null,
          required: q.required,
          sort_order: q.sort_order,
          category: null,
        },
      ])
      .select("id")
      .single();
    if (qErr) {
      console.error(`  ✗ Failed to insert question: ${qErr.message}`);
      continue;
    }
    const questionId = question.id;
    if (q.choices && q.choices.length > 0) {
      const { error: cErr } = await sb.from("question_choices").insert(
        q.choices.map((c, i) => ({
          question_id: questionId,
          value: c.value,
          label_en: c.labelEn,
          label_th: c.labelTh,
          sort_order: i,
        }))
      );
      if (cErr) console.error(`  ✗ Failed to insert choices: ${cErr.message}`);
    }
    qCount++;
    console.log(`  ✓ Q${qCount} (${q.sectionCode}) → ${questionId}`);
  }

  console.log("\n=== Creating survey SK1 ===");
  const allSectionCodes = ["A", "B", "C", ...SECTIONS.map((s) => s.code)];
  const { data: survey, error: sErr } = await sb
    .from("surveys")
    .insert([
      {
        title_en: "Employee Engagement Survey SK",
        title_th: "แบบสำรวจความผูกพันพนักงาน SK",
        status: "active",
        survey_type: "anonymous",
        start_date: "2026-05-01",
        end_date: "2026-07-31",
        target_responses: 500,
      },
    ])
    .select("id")
    .single();
  if (sErr) {
    console.error(`  ✗ Failed to create survey: ${sErr.message}`);
    return;
  }
  console.log(`  ✓ Survey SK1 → ${survey.id}`);

  const { data: allSections } = await sb.from("sections").select("id, code").in("code", allSectionCodes);
  if (allSections && allSections.length > 0) {
    const { error: ssErr } = await sb.from("survey_sections").insert(
      allSections
        .filter((s) => allSectionCodes.includes(s.code))
        .map((s, i) => ({
          survey_id: survey.id,
          section_id: s.id,
          sort_order: i,
        }))
    );
    if (ssErr) console.error(`  ✗ Failed to link sections: ${ssErr.message}`);
    else console.log(`  ✓ Linked ${allSections.length} sections to survey`);
  }

  console.log("\n=== Done ===");
  console.log(`  Sections: ${Object.keys(sectionMap).length + 3} (A,B,C + D-J)`);
  console.log(`  Questions: ${qCount}`);
  console.log(`  Survey: SK1 (${survey.id})`);
}

seed().catch(console.error);
