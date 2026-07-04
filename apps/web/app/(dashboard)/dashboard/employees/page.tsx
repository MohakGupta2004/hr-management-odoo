"use client"

import * as React from "react"
import { Search, ChevronLeft, ChevronRight, Plane, MapPin, Building2, Phone, Mail, Calendar, User, Briefcase, Award, CreditCard, Landmark } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

// ─── List-level types ───

type TodayStatus = "PRESENT" | "ON_LEAVE" | "ABSENT"

interface Employee {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string
  department: string
  todayStatus: TodayStatus
}

// ─── Detail-level types ───

interface Skill {
  id: string
  name: string
}

interface Certification {
  id: string
  name: string
  issuedBy: string
  issuedAt: string
}

interface Resume {
  about: string
  whatILoveAboutJob: string
  interestsHobbies: string
  skills: Skill[]
  certifications: Certification[]
}

interface BankInfo {
  accountNumber: string
  bankName: string
  ifscCode: string
  panNumber: string
  uanNumber: string
  esicCode: string
}

interface PrivateInfo {
  dateOfBirth: string
  mailingAddress: string
  nationality: string
  personalEmail: string
  gender: string
  maritalStatus: string
  dateOfJoining: string
  bank: BankInfo
}

interface EmployeeDetail {
  id: string
  loginId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl: string
  company: string
  department: string
  manager: { id: string; name: string }
  location: string
  todayStatus: TodayStatus
  resume: Resume
  privateInfo: PrivateInfo
}

// ─── Mock list data ───

const MOCK_EMPLOYEES: Employee[] = [
  { id: "emp_01", firstName: "Alice", lastName: "Johnson", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_02", firstName: "John", lastName: "Doe", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_03", firstName: "Bob", lastName: "Smith", avatarUrl: "", department: "Marketing", todayStatus: "ON_LEAVE" },
  { id: "emp_04", firstName: "Carol", lastName: "Williams", avatarUrl: "", department: "Design", todayStatus: "ABSENT" },
  { id: "emp_05", firstName: "David", lastName: "Brown", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_06", firstName: "Emma", lastName: "Jones", avatarUrl: "", department: "HR", todayStatus: "PRESENT" },
  { id: "emp_07", firstName: "Frank", lastName: "Miller", avatarUrl: "", department: "Marketing", todayStatus: "ABSENT" },
  { id: "emp_08", firstName: "Grace", lastName: "Davis", avatarUrl: "", department: "Design", todayStatus: "PRESENT" },
  { id: "emp_09", firstName: "Henry", lastName: "Wilson", avatarUrl: "", department: "Engineering", todayStatus: "ON_LEAVE" },
  { id: "emp_10", firstName: "Ivy", lastName: "Moore", avatarUrl: "", department: "HR", todayStatus: "PRESENT" },
  { id: "emp_11", firstName: "Jack", lastName: "Taylor", avatarUrl: "", department: "Marketing", todayStatus: "PRESENT" },
  { id: "emp_12", firstName: "Kate", lastName: "Anderson", avatarUrl: "", department: "Design", todayStatus: "ABSENT" },
  { id: "emp_13", firstName: "Leo", lastName: "Thomas", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_14", firstName: "Mia", lastName: "Jackson", avatarUrl: "", department: "HR", todayStatus: "ON_LEAVE" },
  { id: "emp_15", firstName: "Noah", lastName: "White", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_16", firstName: "Olivia", lastName: "Harris", avatarUrl: "", department: "Marketing", todayStatus: "PRESENT" },
  { id: "emp_17", firstName: "Paul", lastName: "Martin", avatarUrl: "", department: "Design", todayStatus: "ABSENT" },
  { id: "emp_18", firstName: "Quinn", lastName: "Garcia", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_19", firstName: "Rose", lastName: "Martinez", avatarUrl: "", department: "HR", todayStatus: "ON_LEAVE" },
  { id: "emp_20", firstName: "Sam", lastName: "Robinson", avatarUrl: "", department: "Marketing", todayStatus: "PRESENT" },
  { id: "emp_21", firstName: "Tina", lastName: "Clark", avatarUrl: "", department: "Engineering", todayStatus: "ABSENT" },
  { id: "emp_22", firstName: "Uma", lastName: "Rodriguez", avatarUrl: "", department: "Design", todayStatus: "PRESENT" },
  { id: "emp_23", firstName: "Victor", lastName: "Lewis", avatarUrl: "", department: "Engineering", todayStatus: "PRESENT" },
  { id: "emp_24", firstName: "Wendy", lastName: "Lee", avatarUrl: "", department: "HR", todayStatus: "PRESENT" },
  { id: "emp_25", firstName: "Xander", lastName: "Walker", avatarUrl: "", department: "Marketing", todayStatus: "ON_LEAVE" },
]

// ─── Mock detail data (separate "API call") ───

const MOCK_EMPLOYEE_DETAILS: Record<string, EmployeeDetail> = {
  emp_01: {
    id: "emp_01",
    loginId: "OIJODO20220001",
    firstName: "Alice",
    lastName: "Johnson",
    email: "alice@odoo.in",
    phone: "+91 9876543210",
    avatarUrl: "",
    company: "Odoo India",
    department: "Engineering",
    manager: { id: "emp_00", name: "Admin User" },
    location: "Bangalore",
    todayStatus: "PRESENT",
    resume: {
      about: "Experienced software engineer with 5+ years in full-stack development.",
      whatILoveAboutJob: "Solving complex problems and building scalable systems.",
      interestsHobbies: "Reading, hiking, open-source contributions.",
      skills: [
        { id: "skl_01", name: "React" },
        { id: "skl_02", name: "Node.js" },
        { id: "skl_03", name: "PostgreSQL" },
        { id: "skl_04", name: "TypeScript" },
      ],
      certifications: [
        { id: "crt_01", name: "AWS SAA", issuedBy: "Amazon", issuedAt: "2025-03-01" },
        { id: "crt_02", name: "CKAD", issuedBy: "CNCF", issuedAt: "2024-08-15" },
      ],
    },
    privateInfo: {
      dateOfBirth: "1995-06-15",
      mailingAddress: "123 Main St, Bangalore",
      nationality: "Indian",
      personalEmail: "alice.personal@gmail.com",
      gender: "FEMALE",
      maritalStatus: "SINGLE",
      dateOfJoining: "2022-01-10",
      bank: {
        accountNumber: "XXXX5678",
        bankName: "HDFC",
        ifscCode: "HDFC0000123",
        panNumber: "ABCDE1234F",
        uanNumber: "100200300400",
        esicCode: "1234567890",
      },
    },
  },
  emp_02: {
    id: "emp_02",
    loginId: "OIJODO20220002",
    firstName: "John",
    lastName: "Doe",
    email: "john@odoo.in",
    phone: "+91 9876543211",
    avatarUrl: "",
    company: "Odoo India",
    department: "Engineering",
    manager: { id: "emp_01", name: "Jane Doe" },
    location: "Kolkata",
    todayStatus: "PRESENT",
    resume: {
      about: "Backend developer specializing in Python and distributed systems.",
      whatILoveAboutJob: "Automating workflows and optimizing database performance.",
      interestsHobbies: "Chess, cycling, photography.",
      skills: [
        { id: "skl_05", name: "Python" },
        { id: "skl_06", name: "Django" },
        { id: "skl_07", name: "Redis" },
        { id: "skl_08", name: "Docker" },
      ],
      certifications: [
        { id: "crt_03", name: "AWS SAA", issuedBy: "Amazon", issuedAt: "2025-03-01" },
      ],
    },
    privateInfo: {
      dateOfBirth: "1998-04-12",
      mailingAddress: "456 Park Road, Kolkata",
      nationality: "Indian",
      personalEmail: "john.personal@gmail.com",
      gender: "MALE",
      maritalStatus: "SINGLE",
      dateOfJoining: "2022-01-10",
      bank: {
        accountNumber: "XXXX1234",
        bankName: "SBI",
        ifscCode: "SBIN0000123",
        panNumber: "ABCDE1234F",
        uanNumber: "100200300400",
        esicCode: "1234567890",
      },
    },
  },
}

function detailForEmployee(emp: Employee): EmployeeDetail {
  return MOCK_EMPLOYEE_DETAILS[emp.id] ?? {
    id: emp.id,
    loginId: `EMP${emp.id.slice(4)}`,
    firstName: emp.firstName,
    lastName: emp.lastName,
    email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@odoo.in`,
    phone: "+91 9876543210",
    avatarUrl: emp.avatarUrl,
    company: "Odoo India",
    department: emp.department,
    manager: { id: "emp_00", name: "Admin User" },
    location: "Bangalore",
    todayStatus: emp.todayStatus,
    resume: {
      about: "",
      whatILoveAboutJob: "",
      interestsHobbies: "",
      skills: [],
      certifications: [],
    },
    privateInfo: {
      dateOfBirth: "",
      mailingAddress: "",
      nationality: "Indian",
      personalEmail: "",
      gender: "",
      maritalStatus: "",
      dateOfJoining: "",
      bank: {
        accountNumber: "",
        bankName: "",
        ifscCode: "",
        panNumber: "",
        uanNumber: "",
        esicCode: "",
      },
    },
  }
}

// ─── Helpers ───

const STATUS_CONFIG: Record<TodayStatus, { label: string; dotClass: string; icon: React.ComponentType<{ className?: string }> | null }> = {
  PRESENT: { label: "Present", dotClass: "bg-green-500", icon: null },
  ON_LEAVE: { label: "On Leave", dotClass: "", icon: Plane },
  ABSENT: { label: "Absent", dotClass: "bg-yellow-500", icon: null },
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase()
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value || "—"}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 px-4 py-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

const LIMIT = 8

// ─── Component ───

export default function EmployeesPage() {
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const filtered = React.useMemo(() => {
    if (!search.trim()) return MOCK_EMPLOYEES
    const q = search.toLowerCase()
    return MOCK_EMPLOYEES.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    )
  }, [search])

  const totalPages = Math.ceil(filtered.length / LIMIT)
  const paginatedEmployees = filtered.slice((page - 1) * LIMIT, page * LIMIT)

  const selectedDetail = selectedId
    ? detailForEmployee(MOCK_EMPLOYEES.find((e) => e.id === selectedId)!)
    : null

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-medium text-foreground">Employees</h1>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedEmployees.map((employee) => {
            const status = STATUS_CONFIG[employee.todayStatus]
            const StatusIcon = status.icon
            return (
              <Card
                key={employee.id}
                size="sm"
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => setSelectedId(employee.id)}
              >
                <CardContent className="flex items-start gap-3 pt-[--card-spacing]">
                  <Avatar>
                    {employee.avatarUrl ? (
                      <AvatarImage src={employee.avatarUrl} alt={`${employee.firstName} ${employee.lastName}`} />
                    ) : null}
                    <AvatarFallback>{getInitials(employee.firstName, employee.lastName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.department}
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    {StatusIcon ? (
                      <StatusIcon className="size-4 text-blue-500" />
                    ) : (
                      <span className={cn("block size-2.5 rounded-full", status.dotClass)} />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {paginatedEmployees.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No employees found.
          </p>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <Sheet
        open={!!selectedId}
        onOpenChange={(open) => { if (!open) setSelectedId(null) }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {selectedDetail && (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-3 pt-2">
                  <Avatar size="lg">
                    {selectedDetail.avatarUrl ? (
                      <AvatarImage src={selectedDetail.avatarUrl} alt={`${selectedDetail.firstName} ${selectedDetail.lastName}`} />
                    ) : null}
                    <AvatarFallback className="text-base">
                      {getInitials(selectedDetail.firstName, selectedDetail.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>
                      {selectedDetail.firstName} {selectedDetail.lastName}
                    </SheetTitle>
                    <SheetDescription>
                      {selectedDetail.department} &middot; {selectedDetail.company}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="divide-y">
                {/* Contact */}
                <Section title="Contact">
                  <DetailRow icon={Mail} label="Email" value={selectedDetail.email} />
                  <DetailRow icon={Phone} label="Phone" value={selectedDetail.phone} />
                  <DetailRow icon={MapPin} label="Location" value={selectedDetail.location} />
                </Section>

                {/* Employment */}
                <Section title="Employment">
                  <DetailRow icon={User} label="Login ID" value={selectedDetail.loginId} />
                  <DetailRow icon={Building2} label="Company" value={selectedDetail.company} />
                  <DetailRow icon={Briefcase} label="Department" value={selectedDetail.department} />
                  <DetailRow icon={User} label="Manager" value={selectedDetail.manager.name} />
                  <DetailRow icon={Calendar} label="Date of Joining" value={formatDate(selectedDetail.privateInfo.dateOfJoining)} />
                  <div className="flex items-start gap-2.5">
                    <Plane className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Status Today</p>
                      <Badge
                        variant={selectedDetail.todayStatus === "PRESENT" ? "default" : "secondary"}
                        className={cn(selectedDetail.todayStatus === "ON_LEAVE" && "gap-1.5")}
                      >
                        {selectedDetail.todayStatus === "ON_LEAVE" && <Plane className="size-3" />}
                        {STATUS_CONFIG[selectedDetail.todayStatus].label}
                      </Badge>
                    </div>
                  </div>
                </Section>

                {/* Resume */}
                <Section title="Resume">
                  {selectedDetail.resume.about && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">About</p>
                      <p className="text-sm text-foreground">{selectedDetail.resume.about}</p>
                    </div>
                  )}
                  {selectedDetail.resume.whatILoveAboutJob && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">What I Love About My Job</p>
                      <p className="text-sm text-foreground">{selectedDetail.resume.whatILoveAboutJob}</p>
                    </div>
                  )}
                  {selectedDetail.resume.interestsHobbies && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Interests &amp; Hobbies</p>
                      <p className="text-sm text-foreground">{selectedDetail.resume.interestsHobbies}</p>
                    </div>
                  )}
                  {selectedDetail.resume.skills.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedDetail.resume.skills.map((s) => (
                          <Badge key={s.id} variant="secondary">{s.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedDetail.resume.certifications.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Certifications</p>
                      {selectedDetail.resume.certifications.map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <Award className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.issuedBy} &middot; {formatDate(c.issuedAt)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Personal Info */}
                <Section title="Personal Info">
                  <DetailRow icon={Calendar} label="Date of Birth" value={formatDate(selectedDetail.privateInfo.dateOfBirth)} />
                  <DetailRow icon={MapPin} label="Mailing Address" value={selectedDetail.privateInfo.mailingAddress} />
                  <DetailRow icon={User} label="Nationality" value={selectedDetail.privateInfo.nationality} />
                  <DetailRow icon={Mail} label="Personal Email" value={selectedDetail.privateInfo.personalEmail} />
                  <DetailRow icon={User} label="Gender" value={selectedDetail.privateInfo.gender} />
                  <DetailRow icon={User} label="Marital Status" value={selectedDetail.privateInfo.maritalStatus} />
                </Section>

                {/* Bank Details */}
                <Section title="Bank Details">
                  <DetailRow icon={CreditCard} label="Account Number" value={selectedDetail.privateInfo.bank.accountNumber} />
                  <DetailRow icon={Building2} label="Bank Name" value={selectedDetail.privateInfo.bank.bankName} />
                  <DetailRow icon={Landmark} label="IFSC Code" value={selectedDetail.privateInfo.bank.ifscCode} />
                  <DetailRow icon={CreditCard} label="PAN Number" value={selectedDetail.privateInfo.bank.panNumber} />
                  <DetailRow icon={User} label="UAN Number" value={selectedDetail.privateInfo.bank.uanNumber} />
                  <DetailRow icon={User} label="ESIC Code" value={selectedDetail.privateInfo.bank.esicCode} />
                </Section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
