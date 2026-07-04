# HR Management API

Backend for the HR Management system — Bun + Express + Prisma (PostgreSQL) + Redis (BullMQ) + Cloudinary.

## Running locally

```bash
bun install
cp .env.example .env   # fill in the values
bun run index.ts       # starts on http://localhost:3000
```

## Running with Docker

Spins up the API + PostgreSQL + Redis (Cloudinary/JWT/Resend still come from `.env`):

```bash
docker compose up --build
```

---

## Conventions (read this first)

- **Base URL:** `http://localhost:3000`
- **Auth:** send the access token on every protected route:
  `Authorization: Bearer <accessToken>`
- **Content type:** JSON (`application/json`) except file uploads, which are `multipart/form-data`.
- **Roles:** `ADMIN` (HR), `MANAGER`, `EMPLOYEE`. Most write/admin routes require `ADMIN`.
- **Error shape:** every error returns `{ "error": "message" }` with an appropriate status code:
  | Status | Meaning |
  |--------|---------|
  | 400 | Validation error / bad input |
  | 401 | Missing/invalid/expired token |
  | 403 | Authenticated but not allowed (wrong role, disabled, unverified) |
  | 404 | Resource not found |
  | 409 | Conflict (duplicate, already processed) |
  | 500 | Unhandled server error |
- **Dates:** request dates are `YYYY-MM-DD`. Response timestamps are ISO 8601; date-only fields are `YYYY-MM-DD`; times are `HH:MM` (UTC).
- **Pagination:** list endpoints accept `?page` & `?limit` and return
  `{ "data" | "records": [...], "meta": { total, page, limit, totalPages } }`.
- **Money:** all amounts are integers (whole INR rupees).

### Auth lifecycle
1. `POST /auth/register-company` → creates company + admin, sends a verification email.
2. `GET /auth/verify?token=…` → verifies the email (required before login).
3. `POST /auth/login` → returns `accessToken` (short-lived) + `refreshToken` (long-lived).
4. Use the access token; when it expires, `POST /auth/refresh` for a new pair.
5. `POST /auth/logout` to invalidate the refresh token.

> **Note on `mustChangePassword`:** employees created by HR get a temporary password and `mustChangePassword: true`. While true, the auth layer blocks all routes except `/auth/me` and `/auth/logout`. ⚠️ A change-password endpoint is **not yet implemented** — flag this if you build the "set new password" screen.

---

## Health

### `GET /health`
No auth. Returns `{ "status": "ok" }`. Used by the Docker healthcheck.

---

## Auth — `/auth`

### `POST /auth/register-company`
Public. Creates a company and its first admin user.

```json
{
  "companyName": "Acme Inc",
  "logo": "https://cdn.example.com/logo.png",
  "fullName": "Jane Doe",
  "email": "jane@acme.com",
  "phone": "+15551234567",
  "password": "StrongPass@123",
  "confirmPassword": "StrongPass@123"
}
```
Password: min 8 chars, must include upper, lower, digit, special. **201** →
```json
{
  "company": { "id": "...", "name": "Acme Inc", "prefix": "AC", "logoUrl": "..." },
  "user": { "id": "...", "loginId": "ACJADO20260001", "email": "jane@acme.com", "role": "ADMIN" },
  "employee": { "id": "...", "firstName": "Jane", "lastName": "Doe" },
  "message": "Verification email sent successfully."
}
```

### `GET /auth/verify?token=<token>`
Public. Confirms the email from the verification link. **200** → `{ "message": "Email verified successfully." }`

### `POST /auth/login`
Public. `identifier` is the **login ID or email**.
```json
{ "identifier": "jane@acme.com", "password": "StrongPass@123" }
```
**200** →
```json
{
  "accessToken": "jwt...",
  "refreshToken": "jwt...",
  "user": { "id": "...", "loginId": "ACJADO20260001", "email": "jane@acme.com", "role": "ADMIN", "mustChangePassword": false }
}
```

### `POST /auth/refresh`
Public. Body `{ "refreshToken": "..." }` → **200** new `{ accessToken, refreshToken }`.

### `POST /auth/logout`
Public. Body `{ "refreshToken": "..." }` → **200** `{ "message": "Logged out successfully." }`.

### `GET /auth/me`  🔒
Any authenticated user. Returns the current user + company + employee profile + live attendance state:
```json
{
  "id": "...", "loginId": "ACJADO20260001", "email": "jane@acme.com", "role": "ADMIN", "mustChangePassword": false,
  "company": { "id": "...", "name": "Acme Inc", "prefix": "AC", "logoUrl": "..." },
  "employee": { "id": "...", "firstName": "Jane", "lastName": "Doe", "avatarUrl": null, "designation": null, "department": null },
  "attendanceStatus": "NOT_CHECKED_IN"
}
```
`attendanceStatus` ∈ `NOT_CHECKED_IN | CHECKED_IN | CHECKED_OUT` (derived from today's attendance row).

---

## Employees — `/employees`  🔒 ADMIN only

### `POST /employees`
Creates an employee (auto-generates login ID + temp password, emails credentials).
```json
{
  "firstName": "John", "lastName": "Smith", "email": "john@acme.com",
  "phone": "+15559876543", "designation": "Engineer", "department": "Engineering",
  "location": "Remote", "managerId": "<employeeId>", "dateOfJoining": "2026-07-01",
  "role": "EMPLOYEE"
}
```
Required: `firstName`, `lastName`, `email`, `dateOfJoining`. `role` defaults to `EMPLOYEE`. **201** → `{ employee: { id, firstName, lastName }, user: { loginId } }`.

### `GET /employees`
Query: `page`, `limit`, `search` (name/email/loginId), `sortBy` (`firstName|createdAt|dateOfJoining`), `sortOrder` (`asc|desc`).
**200** → `{ data: [{ id, name, email, role, designation, department, status, isActive }], meta }`.

### `GET /employees/:id`
Full profile incl. `user`, `manager`, `skills[]`, `certifications[]`, `documents[]`.

### `PATCH /employees/:id`
Updatable fields only: `department`, `designation`, `phone`, `managerId`, `location`. **200** → updated employee.

### `DELETE /employees/:id`
Soft-deactivates (sets user inactive, status `TERMINATED`, kills sessions). **200** → `{ "message": "Employee deactivated successfully" }`.

### Skills
- `POST /employees/:id/skills` — body `{ "name": "Node.js" }` → **201** `{ id, name }`
- `DELETE /employees/:id/skills/:skillId` → **200** `{ message }`

### Certifications  *(multipart/form-data)*
- `POST /employees/:id/certifications` — fields: `name`, `issuedBy`, `issuedAt` (YYYY-MM-DD), optional `file`. **201** → cert object.
- `DELETE /employees/:id/certifications/:certId` → **200** `{ message }`

### Documents  *(multipart/form-data)*
- `POST /employees/:id/documents` — fields: `title`, `file` (**required**). **201** → `{ id, title, fileUrl, uploadedAt }`.
- `GET /employees/:id/documents` → list of documents.
- `DELETE /employees/:id/documents/:docId` → **200** `{ message }`

> File uploads accept **PDF or images** (JPEG/PNG/WEBP/GIF) only, max **10 MB**. Files are stored on Cloudinary; `fileUrl` is a public URL.

---

## Attendance — `/attendance`  🔒

Self-service routes work for any authenticated employee; the token identifies the employee (no `employeeId` in the body).

Attendance record shape:
```json
{ "id": "...", "date": "2026-07-04", "checkIn": "09:02", "checkOut": "18:30", "status": "PRESENT", "workingMinutes": 568, "overtimeMinutes": 88 }
```
`status` ∈ `PRESENT | ABSENT | HALF_DAY | LEAVE | WEEKEND`.

### `POST /attendance/check-in`
No body. Creates today's row. **201** → record. **409** if already checked in.

### `POST /attendance/check-out`
No body. Sets `checkOut` and computes `workingMinutes`/`overtimeMinutes` (overtime = minutes over 480). **200** → record. **409** if not checked in / already checked out.

### `GET /attendance/me`
Query: `page`, `limit`, `month` (1–12), `year`. **200** → `{ records, meta }`.

### `GET /attendance/:employeeId`  — ADMIN
History for one employee. **200** → `{ records, meta }`.

### `GET /attendance`  — ADMIN
Query: `page`, `limit`, `employee` (id), `department`, `date` (YYYY-MM-DD), `status`.
**200** → `{ data: [{ ...record, employee: { id, name, department } }], meta }`.

---

## Leave — `/leaves`  🔒

`leaveType` ∈ `PAID | SICK | CASUAL`. Leave request shape:
```json
{ "id": "...", "leaveType": "PAID", "startDate": "2026-07-10", "endDate": "2026-07-12", "days": 3,
  "reason": "Family vacation", "status": "PENDING", "approvedAt": null, "decisionReason": null, "createdAt": "..." }
```
`status` ∈ `PENDING | APPROVED | REJECTED`.

### `POST /leaves` — employee
```json
{ "leaveType": "PAID", "startDate": "2026-07-10", "endDate": "2026-07-12", "reason": "Family vacation" }
```
**201** → request (`PENDING`). Balance is **not** deducted until approval. Errors: start > end / past date / insufficient balance → 400; overlapping request → 409.

### `GET /leaves/me` — employee
Query: `page`, `limit`, `status`. **200** → `{ records, meta }`.

### `GET /leaves/allocations/me` — employee
**200** → `[{ id, leaveType, year, totalDays, usedDays, remainingDays }]`.

### `POST /leaves/allocations` — ADMIN
Allocate/adjust a balance (upsert per employee+type+year).
```json
{ "employeeId": "...", "leaveType": "PAID", "totalDays": 24, "year": 2026 }
```
`year` optional (defaults to current). **201** → allocation.

### `GET /leaves/allocations/:employeeId` — ADMIN
**200** → allocations for that employee.

### `GET /leaves/pending` — ADMIN
Pending requests. **200** → `{ data: [{ ...request, employee: { id, name, department } }], meta }`.

### `GET /leaves` — ADMIN
Query: `page`, `limit`, `status`, `employee` (id), `leaveType`. **200** → `{ data, meta }`.

### `PATCH /leaves/:id/approve` — ADMIN
Atomically: sets `APPROVED`, decrements balance, and marks each day `LEAVE` in Attendance. **200** → request. **409** if not `PENDING`.

### `PATCH /leaves/:id/reject` — ADMIN
Optional body `{ "reason": "..." }`. Only updates the request (no balance/attendance change). **200** → request. **409** if not `PENDING`.

---

## Payroll

### Salary structures — `/salary-structures`  🔒 ADMIN
One structure per employee, composed of flexible components (`type` ∈ `EARNING | DEDUCTION`).

- **`POST /salary-structures`**
  ```json
  {
    "employeeId": "...", "effectiveFrom": "2026-07-01",
    "components": [
      { "name": "Basic", "type": "EARNING", "amount": 40000 },
      { "name": "HRA",   "type": "EARNING", "amount": 10000 },
      { "name": "PF",    "type": "DEDUCTION", "amount": 4800 }
    ]
  }
  ```
  `effectiveFrom` & `components` optional. **201** → structure with `components[]` and `totals { earnings, deductions }`. **409** if one already exists.
- **`GET /salary-structures/:employeeId`** → structure.
- **`PATCH /salary-structures/:id`** — body `{ "effectiveFrom": "2026-08-01" }`.
- **`POST /salary-structures/:id/components`** — body `{ name, type, amount }` → **201** component.

### Salary components — `/salary-components`  🔒 ADMIN
- **`PATCH /salary-components/:id`** — any of `{ name?, type?, amount? }`.
- **`DELETE /salary-components/:id`** → `{ message }`.

### Payslips — `/payroll` & `/payslips`

- **`POST /payroll/generate`**  🔒 ADMIN
  ```json
  { "employeeId": "...", "month": 7, "year": 2026 }
  ```
  Reads the salary structure + that month's attendance, computes and **stores an immutable snapshot**. **201** →
  ```json
  {
    "id": "...", "employeeId": "...", "month": 7, "monthName": "July", "year": 2026,
    "workingDays": 31, "presentDays": 20, "leaveDays": 2, "absentDays": 1,
    "grossSalary": 55000, "totalDeductions": 6574, "netSalary": 48426,
    "breakdown": { "earnings": [...], "deductions": [...], "lossOfPay": { "absentDays": 1, "perDaySalary": 1774, "amount": 1774 }, "attendance": {...} },
    "generatedAt": "..."
  }
  ```
  Errors: already generated → 409; no salary structure / no attendance for the month → 400.
  *Calc:* `net = gross(earnings) − deductions − lossOfPay`, where `lossOfPay = absentDays × round(gross / daysInMonth)`.

- **`GET /payslips/me`**  🔒 employee — query `page`, `limit`, `year`. **200** → `{ records, meta }`.

- **`GET /payslips`**  🔒 ADMIN — query `page`, `limit`, `employee` (id), `month`, `year`. **200** → `{ data: [{ ...payslip, employee: { id, name, department } }], meta }`.

- **`GET /payslips/:id/pdf`**  🔒 owner **or** ADMIN
  Returns `application/pdf` (a rendered payslip with the company logo). **Not JSON** — fetch as a blob:
  ```ts
  const res = await fetch(`${API}/payslips/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
  const url = URL.createObjectURL(await res.blob()); // then <iframe src={url}> or trigger download
  ```

---

## Users — `/users`  *(basic/legacy — not part of the main flow)*
- `GET /users` — list all users.
- `POST /users` — `{ loginId, email, password, companyId }`.

> These predate the auth/employee modules and have no role guard. Prefer `/auth` + `/employees` for real work.
