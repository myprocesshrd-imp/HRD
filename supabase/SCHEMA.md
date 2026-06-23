# Database Schema Overview

## Auth / Login Flow

```
User enters employee code + password
          ↓
POST /login → IDMS/SSO (centralized)
          ↓
  ┌─── { Result: "OK", EmpId: "xxx" } ───┐
  │                                       │
  ↓                                       ↓
GET /hrms/employee/{EmpId}            Login failed → show error
  ↓
{ status: "success", data: { employee: {…} } }
          ↓
  ┌─── user exists in DB? ───┐
  │         yes               no
  ↓                           ↓
update sync fields         create user
(last_synced_at,            (role = 'employee' default)
 position, phone,
 avatar, dept, etc.)
          ↓
create session → return JWT → frontend
```

## Entity-Relationship

```
departments
  ├── users                    (department_id → departments.id)
  │
  │  users fields from HRMS:
  │    employee_code     รหัสพนักงาน
  │    name_en / name_th ชื่อ-นามสกุล
  │    position          ตำแหน่ง
  │    phone             เบอร์โทร
  │    avatar_url        รูปโปรไฟล์
  │    idms_subject      unique ID from IDMS
  │    role              default = employee (promoted via admin)
  │    ⚠️ NO password_hash — SSO handles auth
  │
surveys                      sections
  └── survey_sections ──────┘  |
  │                            └── questions
  │                                ├── question_choices
  │                                ├── matrix_rows
  │                                └── matrix_columns
  │
survey_responses
  ├── response_answers
  └── response_feedback

notifications
hrms_sync_log               (audit: when/why/what HRMS sync)
```

## Table Summary

| Table | Key Design Points |
|-------|-------------------|
| `users` | No password! `employee_code` (unique), `idms_subject` (SSO link), role defaults to `employee`, `hrms_raw_data` for debugging |
| `hrms_sync_log` | Audit trail: which users were synced, errors, payload snapshot |
| `sections` | Question categories (A, B, C...) with `sort_order` |
| `questions` | All types in one table with type-specific nullable columns |
| `question_choices` | Options for `single_select` / `multiple_select` |
| `matrix_rows` / `matrix_columns` | For `matrix` questions |
| `surveys` | Campaign configuration + dates |
| `survey_sections` | M:N — which sections compose a survey |
| `survey_responses` | Per-session tracking, demographics JSONB for anonymous |
| `response_answers` | Answer per question (4 value columns per type) |
| `response_feedback` | Open-ended feedback separate from structured answers |
| `notifications` | Per-user push/display notifications |

## Role Strategy

| Role | Source | How Assigned |
|------|--------|-------------|
| `employee` | Default on first HRMS sync | Automatic |
| `manager` | Admin promotes via backend UI | Manual |
| `hr_admin` | Admin promotes via backend UI | Manual |
| `super_admin` | System bootstrap / manual | Manual |

## RLS Principle

- `employee` → own data only (profile, responses, notifications)
- `manager` → own + team aggregate data
- `hr_admin` → all aggregate data (no PII answers exposure)
- `super_admin` → full access
- Role self-promotion is blocked via RLS policy `users_no_role_change`
