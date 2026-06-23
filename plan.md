# HR Pulse — Interactive Mockup Improvement Plan

> **แนวทาง:** Pre-Supabase phase — mock data 100%, craft UX & data model ให้พร้อมก่อนเชื่อม backend
> **เป้าหมาย:** Interactive mockup ที่ทีมทดลองใช้ได้จริง + เผื่อ data model สำหรับ Feature Expansion
> **ภาษาแผน:** ไทย (English key terms ในวงเล็บ)

---

## Phase 0 — Foundation Refactoring (ทำก่อนทุกอย่าง)

### 0.1 Question Data Model Expansion

**Current:** `SurveyQuestion { id, textEn, textTh }` — รองรับแค่ Likert scale
**New:** `Question { id, type, textEn, textTh, choices?, validation?, visibleIf?, ... }`

```typescript
type QuestionType =
  | "rating"            // Likert 1-5/7
  | "single_select"     // เลือก 1
  | "multiple_select"   // เลือกหลาย
  | "open_text_short"   // คำตอบสั้น
  | "open_text_long"    // คำตอบยาว
  | "matrix"            // ตาราง Likert หลาย statement
  | "ranking"           // จัดอันดับ
  | "nps"               // 0-10 Net Promoter Score
  | "binary"            // ใช่/ไม่ใช่
  | "constant_sum";     // แบ่งคะแนนรวม

interface Question {
  id: string;
  type: QuestionType;
  textEn: string;
  textTh: string;
  descEn?: string;
  descTh?: string;
  choices?: { value: string; labelEn: string; labelTh: string }[];
  required: boolean;
  minValue?: number;
  maxValue?: number;
  minChoices?: number;
  maxChoices?: number;
  visibleIf?: { questionId: string; value: string | number };
  rows?: string[];
  columns?: { value: string; labelEn: string; labelTh: string }[];
  category?: string;
}
```

**ไฟล์ที่แก้:** `src/lib/mock-data.ts`

---

### 0.2 Anonymous Survey (Public Route)

**Concept:**
- **Anonymous** → public route `/survey/public/:id` — ไม่ต้อง login, ไม่มี profile step, default anonymous, ไม่ track user
- **Identified** → route `/_app/survey` — ต้อง login, HRMS profile review, track user.id

**Anonymous flow:**
```
เปิด link → Intro → Questions (ตาม type) → Feedback → Done
           (ไม่มี profile, ไม่มี auth, localStorage draft)
```

**การแยก Storage:**
```
hrpulse.survey.draft.{surveyId}.anon  ← anonymous
hrpulse.survey.draft.{surveyId}.{userId}  ← identified
```

**ไฟล์สร้างใหม่:**
- `src/routes/survey/public/$id.tsx`
- `src/services/survey.service.ts` (extract logic)

**ไฟล์ที่แก้:** `src/routes/_app/survey.tsx`

---

### 0.3 HRMS Profile Review (Identified Survey)

**Concept:** พนักงานไม่ต้องกรอก 7 fields — HRMS API send profile → review + confirm

**Visual mockup (identified step 1):**
```
┌─────────────────────────────────────┐
│  📋 Review your profile             │
│  ข้อมูลจากระบบ HRMS  ✓              │
│                                     │
│  ชื่อ:          สมชาย ใจดี          │
│  หน่วยงาน:     IT                   │
│  ระดับ:        Executive            │
│  สถานที่ทำงาน: Head Office          │
│  หน่วยธุรกิจ:  Corporate            │
│                                     │
│  ✅ ข้อมูลถูกต้อง    [แก้ไข (optional)] │
└─────────────────────────────────────┘
```

**ไฟล์สร้างใหม่:**
- `src/services/hrms.service.ts` — mock HRMS API interface

**ไฟล์ที่แก้:** `src/routes/_app/survey.tsx`

---

## Phase 1 — Core UX Repair (Priority 🔴)

### 1.1 Dashboard Filters → Working State

**ไฟล์:** `src/routes/_app/dashboard.tsx`
**สิ่งที่ทำ:** `useState` + `useMemo` filter → charts reactive

### 1.2 Admin CRUD → Mock Dialogs

**ไฟล์:** `src/routes/_app/admin/{surveys,users,questions,departments}.tsx`
**สิ่งที่ทำ:** `<Dialog>` for Create/Edit, confirm for Delete, toast

### 1.3 Notification System

**ไฟล์:** `src/components/app-shell.tsx`
**สิ่งที่ทำ:** Bell icon header + dropdown mock notifications + unread badge

### 1.4 Mobile Responsive Navigation

**ไฟล์:** `src/components/app-shell.tsx`
**สิ่งที่ทำ:** `<Sheet>` drawer sidebar + hamburger button

### 1.5 Profile → Mock Save

**ไฟล์:** `src/routes/_app/profile.tsx`
**สิ่งที่ทำ:** `value` + `onChange` + save to localStorage + toast

### 1.6 Render Component by Question Type

**ไฟล์:** `src/routes/_app/survey.tsx` (+ new components)
**สิ่งที่ทำ:** Switch-case render component ตาม `question.type`:
- `rating` → `<RatingGroup>` (RadioGroup 1-5)
- `single_select` → `<Select>` หรือ `<RadioGroup>`
- `multiple_select` → `<CheckboxGroup>`
- `open_text_short` → `<Input>`
- `open_text_long` → `<Textarea>`
- `binary` → `<Switch>` หรือ Yes/No RadioGroup

---

## Phase 2 — Feature Completion (Priority 🟡)

### 2.1 Survey Results Page

**ไฟล์:** `src/routes/_app/results.tsx` (new)
**สิ่งที่ทำ:** After submit → summary score + chart breakdown; admin see aggregate

### 2.2 Notification Center

**ไฟล์:** `src/routes/_app/notifications.tsx` (new)
**สิ่งที่ทำ:** Full page list + mark as read

### 2.3 Mock Loading States

**ไฟล์:** ทุก route page
**สิ่งที่ทำ:** `<Skeleton>` + simulated delay (300ms)

### 2.4 eNPS Question Type

**ไฟล์:** `src/components/ui/nps-group.tsx` (new)
**สิ่งที่ทำ:** 0-10 button group + score calculation

### 2.5 Matrix Table Renderer

**ไฟล์:** `src/components/ui/matrix-table.tsx` (new)
**สิ่งที่ทำ:** Grid RadioGroup — Row = statements, Column = scale

---

## Phase 3 — Gamification & Interactive Polish (Priority 🟡)

### 3.1 Animated Progress Step Indicator

**ไฟล์:** `src/routes/_app/survey.tsx`
**สิ่งที่ทำ:**
- Progress bar → step badge "Section 2 of 5"
- Animated checkmark เมื่อ section complete
- Smooth progress bar fill animation
- Animated counter: ตัวเลข % นับจาก 0 → ปัจจุบัน

### 3.2 Selection Micro-interactions

**ไฟล์:** `src/routes/_app/survey.tsx` + CSS
**สิ่งที่ทำ:**
- `scale-[1.05]` + glow border on hover
- `transition-all duration-200` on select
- Ripple effect on navigation buttons

### 3.3 Page Transitions

**ไฟล์:** `src/routes/_app/survey.tsx` + CSS keyframes
**สิ่งที่ทำ:**
- Slide left/right ระหว่าง step
- Fade in content เมื่อ step เปลี่ยน

### 3.4 Completion Celebration

**ไฟล์:** `src/routes/_app/survey.tsx`, `src/routes/_app/results.tsx`
**สิ่งที่ทำ:**
- `canvas-confetti` library
- Confetti burst on submit success
- Staggered reveal of thank you page elements

### 3.5 Motivational Elements

**ไฟล์:** `src/routes/_app/survey.tsx`
**สิ่งที่ทำ:**
- Milestone messages ที่ 25%, 50%, 75%, 100%
- Fade in/out animation เมื่อข้อความเปลี่ยน

### 3.6 Animated Results

**ไฟล์:** `src/routes/_app/results.tsx`, `src/routes/_app/dashboard.tsx`
**สิ่งที่ทำ:**
- Recharts animation (built-in — set `isAnimationActive`)
- Score counter animation (นับ 0 → final score)
- `useInView` trigger animation
- `useReducedMotion` respect user preference

---

## Phase 4 — i18n + Error Handling (Priority 🟡)

### 4.1 Complete i18n Dictionary

**ไฟล์:** `src/lib/i18n.tsx` + ทุก route
**สิ่งที่ทำ:** ย้าย hardcoded strings ทั้งหมด + remove `lang === "th" ? ...` patterns

### 4.2 Error Boundaries + 404

**ไฟล์:** `src/routes/__root.tsx` + `src/routes/404.tsx` (new)
**สิ่งที่ทำ:** Error boundary, not-found route, empty state components

### 4.3 Smooth Transitions (Polish)

**ไฟล์:** `src/styles.css`
**สิ่งที่ทำ:** Page transition fade-in, focus-visible ring, scrollbar styling

---

## Phase 5 — Architecture Preparation (Priority 🟢)

### 5.1 API Service Layer

**ไฟล์:** `src/services/*.ts` (new directory)
**สิ่งที่ทำ:** service interface + mock implementation
- `auth.service.ts`
- `survey.service.ts`
- `analytics.service.ts`
- `admin.service.ts`
- `hrms.service.ts`

### 5.2 React Query Integration

**ไฟล์:** ทยอยเปลี่ยนทุก route
**สิ่งที่ทำ:** `useQuery` + `useMutation` แทน direct mock import

### 5.3 Auth Provider Refactor

**ไฟล์:** `src/lib/auth.tsx`
**สิ่งที่ทำ:** แยก login logic → service, support token pattern

---

## 📁 Files Summary

### สร้างใหม่ (14 ไฟล์)

| File | Phase | Description |
|------|-------|-------------|
| `src/routes/survey/public/$id.tsx` | 0.2 | Public anonymous survey route |
| `src/services/survey.service.ts` | 0.2, 5.1 | Survey service interface |
| `src/services/hrms.service.ts` | 0.3, 5.1 | Mock HRMS API |
| `src/services/auth.service.ts` | 5.1 | Auth service |
| `src/services/analytics.service.ts` | 5.1 | Analytics service |
| `src/services/admin.service.ts` | 5.1 | Admin service |
| `src/components/ui/nps-group.tsx` | 2.4 | 0-10 NPS component |
| `src/components/ui/matrix-table.tsx` | 2.5 | Matrix Likert grid |
| `src/routes/_app/results.tsx` | 2.1 | Survey results page |
| `src/routes/_app/notifications.tsx` | 2.2 | Notification center |
| `src/routes/404.tsx` | 4.2 | Not found page |
| `src/hooks/use-mock-query.ts` | 5.2 | Mock query hook |
| `src/hooks/use-animated-counter.ts` | 3.1 | Animated number hook |
| `src/hooks/use-reduced-motion.ts` | 3.6 | Accessibility hook |

### แก้ไข (13 ไฟล์)

| File | Phase | Changes |
|------|-------|---------|
| `src/lib/mock-data.ts` | 0.1 | Question model expansion |
| `src/routes/_app/survey.tsx` | 0.2, 0.3, 1.6, 3.x | Public/identified split, render by type, gamification |
| `src/routes/_app/dashboard.tsx` | 1.1, 3.6 | Reactive filters, chart animation |
| `src/components/app-shell.tsx` | 1.3, 1.4 | Notifications, mobile nav |
| `src/routes/_app/profile.tsx` | 1.5 | Mock save |
| `src/routes/_app/admin/surveys.tsx` | 1.2 | CRUD dialogs |
| `src/routes/_app/admin/users.tsx` | 1.2 | CRUD dialogs |
| `src/routes/_app/admin/questions.tsx` | 1.2 | CRUD dialogs |
| `src/routes/_app/admin/departments.tsx` | 1.2 | CRUD dialogs |
| `src/routes/_app/reports.tsx` | 3.6 | Chart animation |
| `src/lib/i18n.tsx` | 4.1 | Dictionary expansion |
| `src/routes/__root.tsx` | 4.2 | Error boundary |
| `src/styles.css` | 3.x, 4.3 | Animations, transitions |

---

## 📦 New Dependencies

```bash
bun add canvas-confetti        # 1.5KB — celebration effect (Phase 3.4)
bun add @types/canvas-confetti  # type definitions
```

ไม่ต้องเพิ่ม Framer Motion — ใช้ CSS transitions + keyframes ทั้งหมด (weight ต่ำกว่า, performance ดีกว่า)

---

## ⚠️ Animation Notes

1. **`prefers-reduced-motion`** — ต้องมี fallback สำหรับ user ที่ปิด animation
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

2. **Performance** — ใช้ `transform` + `opacity` เท่านั้น (GPU accelerate),
   หลีกเลี่ยง animating `width`, `height`, `top`, `left`

3. **Confetti** — fire เฉพาะตอน submit success, ไม่ repeat

---

## 📊 Timeline

| Phase | ระยะเวลา | ผลลัพธ์ |
|-------|----------|---------|
| **0 — Foundation** | ~2 ชม. | Data model รองรับทุก question type, แยก public/private route |
| **1 — Core UX** | ~3-4 ชม. | ทุกอย่าง interactive, filter ทำงาน, admin CRUD, mobile nav |
| **2 — Features** | ~2-3 ชม. | Results, NPS, Matrix, notifications, loading states |
| **3 — Gamification** | ~2-3 ชม. | Surveys สนุกขึ้น, celebration, animated results |
| **4 — i18n + Error** | ~1-2 ชม. | i18n สมบูรณ์, error handling |
| **5 — Architecture** | ~1-2 ชม. | Service layer, React Query, auth refactor |
| **รวม** | **~11-16 ชม.** | Mockup พร้อม demo + ready for backend |

---

## สิ่งที่ยังไม่ทำ (v2)

| Feature | เหตุผล |
|---------|--------|
| Database integration (Supabase) | user ระบุให้ทำทีหลัง |
| Survey Builder เต็มรูปแบบ (drag-drop) | ใช้เวลาเยอะ — v2 |
| 360 Feedback / Peer Review | Enterprise feature |
| Text analytics / NLP | ต้องใช้ API |
| Org Chart visualization | v2 |
| E2E tests | เกิน scope mockup |
| Lottie animations | หาก illustrator ไม่ support → v2 |
