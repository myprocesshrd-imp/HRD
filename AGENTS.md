# HR Pulse Survey Platform

## Tech Stack
- **Runtime**: React 19 + TanStack Start (SSR via Vite)
- **Routing**: TanStack Router (file-based, auto-generated `routeTree.gen.ts`)
- **Styling**: Tailwind CSS v4 + `tw-animate-css`
- **UI**: shadcn/ui (Radix primitives), Recharts, Lucide icons, sonner toast
- **State**: React hooks + localStorage (no DB yet)
- **Drag**: @dnd-kit/core + @dnd-kit/sortable + @dnd-kit/utilities
- **Animations**: Pure CSS (`@keyframes` in `src/styles.css`)
- **Lint**: ESLint + Prettier
- **Build**: `npm run build` → regenerates `routeTree.gen.ts` automatically

## Commands
```bash
npm run dev          # dev server (port 8080)
npm run build        # production build
npx tsc --noEmit    # TypeScript check
```

## Mock Users
| Email | Password | Role |
|-------|----------|------|
| admin@company.co.th | admin123 | super_admin |
| hr@company.co.th | hr123 | hr_admin |
| manager@company.co.th | manager123 | manager |
| employee@company.co.th | employee123 | employee |

## Routes
| Path | Component | Auth |
|------|-----------|------|
| `/login` | LoginPage | Public |
| `/` | DashboardPage (role-gated) | Auth |
| `/survey` | SurveyPageWrapper → SurveyList / SurveyFlow | Auth |
| `/survey/public/$id` | AnonymousSurveyPage | Public |
| `/results` | ResultsPage | Auth |
| `/reports` | ReportsPage | Auth |
| `/profile` | ProfilePage | Auth |
| `/notifications` | NotificationsPage | Auth |
| `/admin/surveys` | SurveysAdmin | Auth (admin) |
| `/admin/questions` | QuestionsAdmin | Auth (admin) |
| `/admin/users` | UsersAdmin | Auth (admin) |
| `/admin/departments` | DepartmentsAdmin | Auth (admin) |

## Data Model (`src/lib/mock-data.ts`)

### MockSurvey
```ts
interface MockSurvey {
  id: string; titleEn; titleTh;
  status: "Active" | "Closed" | "Draft";
  surveyType: "anonymous" | "identified";
  startDate; endDate; responses; target;
  sectionIds: string[];  // references QUESTION_BANK section IDs
}
```

### QUESTION_BANK (master question bank)
```ts
SurveySection[] = [
  { id: "A", titleEn, titleTh, descEn, descTh, questions: Question[] },
  { id: "B", ... },
  { id: "C", ... },
]
```

### Survey ↔ Question relationship
- `getSurveySections(surveyId)` → filters QUESTION_BANK by survey's sectionIds
- S1 (Annual) → ["A","B","C"]  |  S2 (Pulse Q1) → ["A","B","C"]
- S3 (Onboarding) → ["A"]      |  S4 (Pulse Q2 Anon) → ["A","C"]

### Question types
`rating`, `single_select`, `multiple_select`, `open_text_short`, `open_text_long`, `matrix`, `ranking`, `nps`, `binary`, `constant_sum`

## Dashboard
- **employee** → EmployeeDashboard (pending surveys, personal stats, read-only trend, "your voice matters" section)
- **manager/hr_admin/super_admin** → AdminDashboard (filters, department breakdown, heatmap, pie chart, trend, categories radar, participation by dept)

## Survey Flow
### Identified (`/survey`)
1. Survey list → pick one
2. Intro (with anonymous toggle)
3. HRMS profile review (confirm identity)
4. Sections A–C (dynamic per survey's sectionIds)
5. Open feedback (optional)
6. Thank you + confetti

### Anonymous (`/survey/public/$id`)
1. Intro
2. Demographics (7 fields: dept, BU, level, location, age, gender, tenure)
3. Sections A–C (dynamic per survey's sectionIds)
4. Open feedback (optional)
5. Thank you + confetti

## Key Conventions
- `throw redirect` **must NOT** be used inside React component functions — use `useNavigate` + `useEffect` + conditional `return null`
- All admin CRUD dialogs use `Dialog` + `AlertDialog` for delete confirmation
- i18n via `useI18n()` hook with TH/EN dictionary (`src/lib/i18n.tsx`)
- Auth via `useAuth()` (localStorage mock, role-based)
- Draft save to localStorage key: `hrpulse.survey.draft.{surveyId}.{userId|anon}`
- Sidebar collapse/expand toggle at top-right, state persisted in `localStorage("hrpulse.sidebar.open")`
- `prefers-reduced-motion` respected via `useReducedMotion()` hook
- `canvas-confetti` with dynamic import pattern (`src/lib/confetti.ts`)
- NPS 0-10 scale component at `src/components/ui/nps-group.tsx`
- Matrix table at `src/components/ui/matrix-table.tsx`

## What's Implemented
- [x] Question bank (QUESTION_BANK) with type-aware admin editor
- [x] Section CRUD (create/edit/delete with confirm, disabled delete if has questions)
- [x] Question CRUD (add/edit/delete/duplicate within sections)
- [x] Type-aware dialog (rating: min/max; select: choices editor; matrix: rows/columns)
- [x] Drag-and-drop question reorder within section (@dnd-kit)
- [x] Move question between sections (dropdown per question row)
- [x] Search across all questions
- [x] Section collapse/expand
- [x] Survey ↔ section relationship (sectionIds on MockSurvey)
- [x] Survey selection list before taking survey
- [x] Employee-specific dashboard (vs admin dashboard)
- [x] Anonymous survey with demographics
- [x] Gamification (progress milestones, confetti, animated counter)
- [x] Notifications (bell + notification center page)
- [x] Mobile responsive (Sheet drawer, hamburger button)
- [x] Role-based nav links

## Next Steps (Phase 5)
- Service abstraction layer + React Query integration
- Real Supabase backend
- Real HRMS API integration
- Text analytics (word cloud, sentiment)
- Survey builder (drag-drop question editor)
- Deploy to Cloudflare/Railway for preview
