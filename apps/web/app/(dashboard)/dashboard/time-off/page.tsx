"use client"

import * as React from "react"
import {
  Search,
  Plus,
  X,
  Check,
  Ban,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  FileText,
  Upload,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"

// ─── Types ───

type LeaveType = "PAID" | "SICK" | "UNPAID"
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

interface Balance {
  type: LeaveType
  allocated: number | null
  used: number
  available: number | null
}

interface BalancesResponse {
  year: number
  balances: Balance[]
}

interface LeaveRequest {
  id: string
  type: LeaveType
  startDate: string
  endDate: string
  days: number
  status: LeaveStatus
  employee?: { id: string; name: string }
  approver?: { id: string; name: string }
  approverComment?: string
  attachmentUrl?: string | null
  createdAt: string
  decidedAt?: string
}

interface LeaveListResponse {
  data: LeaveRequest[]
  pagination: { page: number; limit: number; total: number }
}

interface Allocation {
  id: string
  employeeId: string
  employeeName: string
  type: LeaveType
  year: number
  allocatedDays: number
}

// ─── Mock Data ───

const CURRENT_YEAR = 2026
const CURRENT_USER = { id: "emp_01", name: "Alice Johnson" }

const MOCK_BALANCES: BalancesResponse = {
  year: CURRENT_YEAR,
  balances: [
    { type: "PAID", allocated: 24, used: 0, available: 24 },
    { type: "SICK", allocated: 7, used: 0, available: 7 },
    { type: "UNPAID", allocated: null, used: 3, available: null },
  ],
}

let leaveIdCounter = 107
function nextLeaveId() {
  return `lv_${++leaveIdCounter}`
}

let allocationIdCounter = 20
function nextAllocationId() {
  return `al_${++allocationIdCounter}`
}

function daysBetween(start: string, end: string) {
  const s = new Date(start + "T00:00:00")
  const e = new Date(end + "T00:00:00")
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1)
}

const TYPE_LABELS: Record<LeaveType, string> = {
  PAID: "Paid Leave",
  SICK: "Sick Leave",
  UNPAID: "Unpaid Leave",
}

const STATUS_CONFIG: Record<LeaveStatus, { label: string; klass: string }> = {
  PENDING: { label: "Pending", klass: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15 dark:bg-yellow-500/15 dark:text-yellow-400" },
  APPROVED: { label: "Approved", klass: "bg-green-500/10 text-green-600 hover:bg-green-500/15 dark:bg-green-500/15 dark:text-green-400" },
  REJECTED: { label: "Rejected", klass: "bg-destructive/10 text-destructive hover:bg-destructive/15" },
}

const MOCK_MY_LEAVES: LeaveRequest[] = [
  { id: "lv_101", type: "PAID", startDate: "2026-05-13", endDate: "2026-05-14", days: 2, status: "APPROVED", approverComment: "Enjoy!", createdAt: "2026-05-01T09:30:00+05:30", decidedAt: "2026-05-02T10:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_102", type: "SICK", startDate: "2026-06-10", endDate: "2026-06-10", days: 1, status: "PENDING", createdAt: "2026-06-09T08:15:00+05:30" },
  { id: "lv_103", type: "UNPAID", startDate: "2026-07-01", endDate: "2026-07-03", days: 3, status: "REJECTED", approverComment: "Critical release that week.", createdAt: "2026-06-20T14:00:00+05:30", decidedAt: "2026-06-21T09:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_104", type: "PAID", startDate: "2026-08-17", endDate: "2026-08-21", days: 5, status: "APPROVED", approverComment: "Have a great vacation!", createdAt: "2026-07-15T11:00:00+05:30", decidedAt: "2026-07-16T10:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_105", type: "SICK", startDate: "2026-09-05", endDate: "2026-09-05", days: 1, status: "PENDING", createdAt: "2026-09-04T07:45:00+05:30" },
]

const MOCK_ALL_LEAVES: LeaveRequest[] = [
  { id: "lv_001", employee: { id: "emp_02", name: "John Doe" }, type: "PAID", startDate: "2026-10-28", endDate: "2026-10-28", days: 1, status: "PENDING", attachmentUrl: null, createdAt: "2026-10-27T09:00:00+05:30" },
  { id: "lv_002", employee: { id: "emp_03", name: "Bob Smith" }, type: "SICK", startDate: "2026-10-15", endDate: "2026-10-16", days: 2, status: "PENDING", attachmentUrl: null, createdAt: "2026-10-14T10:30:00+05:30" },
  { id: "lv_003", employee: { id: "emp_04", name: "Carol Williams" }, type: "PAID", startDate: "2026-11-01", endDate: "2026-11-05", days: 5, status: "APPROVED", approverComment: "Approved.", attachmentUrl: null, createdAt: "2026-10-20T08:00:00+05:30", decidedAt: "2026-10-21T09:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_004", employee: { id: "emp_05", name: "David Brown" }, type: "UNPAID", startDate: "2026-12-01", endDate: "2026-12-01", days: 1, status: "PENDING", attachmentUrl: null, createdAt: "2026-11-28T14:00:00+05:30" },
  { id: "lv_005", employee: { id: "emp_06", name: "Emma Jones" }, type: "PAID", startDate: "2026-09-20", endDate: "2026-09-22", days: 3, status: "REJECTED", approverComment: "Team capacity insufficient.", attachmentUrl: null, createdAt: "2026-09-15T11:00:00+05:30", decidedAt: "2026-09-16T10:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_006", employee: { id: "emp_07", name: "Frank Miller" }, type: "SICK", startDate: "2026-08-03", endDate: "2026-08-05", days: 3, status: "APPROVED", approverComment: "Get well soon.", attachmentUrl: null, createdAt: "2026-08-02T07:00:00+05:30", decidedAt: "2026-08-02T09:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_007", employee: { id: "emp_08", name: "Grace Davis" }, type: "PAID", startDate: "2026-07-14", endDate: "2026-07-14", days: 1, status: "PENDING", attachmentUrl: "https://example.com/attachment.pdf", createdAt: "2026-07-10T13:00:00+05:30" },
  { id: "lv_101", employee: { id: "emp_01", name: "Alice Johnson" }, type: "PAID", startDate: "2026-05-13", endDate: "2026-05-14", days: 2, status: "APPROVED", approverComment: "Enjoy!", attachmentUrl: null, createdAt: "2026-05-01T09:30:00+05:30", decidedAt: "2026-05-02T10:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_102", employee: { id: "emp_01", name: "Alice Johnson" }, type: "SICK", startDate: "2026-06-10", endDate: "2026-06-10", days: 1, status: "PENDING", attachmentUrl: null, createdAt: "2026-06-09T08:15:00+05:30" },
  { id: "lv_103", employee: { id: "emp_01", name: "Alice Johnson" }, type: "UNPAID", startDate: "2026-07-01", endDate: "2026-07-03", days: 3, status: "REJECTED", approverComment: "Critical release that week.", attachmentUrl: null, createdAt: "2026-06-20T14:00:00+05:30", decidedAt: "2026-06-21T09:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
  { id: "lv_104", employee: { id: "emp_01", name: "Alice Johnson" }, type: "PAID", startDate: "2026-08-17", endDate: "2026-08-21", days: 5, status: "APPROVED", approverComment: "Have a great vacation!", attachmentUrl: null, createdAt: "2026-07-15T11:00:00+05:30", decidedAt: "2026-07-16T10:00:00+05:30", approver: { id: "emp_00", name: "Jane Doe" } },
]

const MOCK_ALLOCATIONS: Allocation[] = [
  { id: "al_01", employeeId: "emp_01", employeeName: "Alice Johnson", type: "PAID", year: CURRENT_YEAR, allocatedDays: 24 },
  { id: "al_02", employeeId: "emp_01", employeeName: "Alice Johnson", type: "SICK", year: CURRENT_YEAR, allocatedDays: 7 },
  { id: "al_03", employeeId: "emp_02", employeeName: "John Doe", type: "PAID", year: CURRENT_YEAR, allocatedDays: 24 },
  { id: "al_04", employeeId: "emp_02", employeeName: "John Doe", type: "SICK", year: CURRENT_YEAR, allocatedDays: 7 },
  { id: "al_05", employeeId: "emp_03", employeeName: "Bob Smith", type: "PAID", year: CURRENT_YEAR, allocatedDays: 24 },
  { id: "al_06", employeeId: "emp_03", employeeName: "Bob Smith", type: "SICK", year: CURRENT_YEAR, allocatedDays: 7 },
  { id: "al_07", employeeId: "emp_04", employeeName: "Carol Williams", type: "PAID", year: CURRENT_YEAR, allocatedDays: 24 },
  { id: "al_08", employeeId: "emp_04", employeeName: "Carol Williams", type: "SICK", year: CURRENT_YEAR, allocatedDays: 7 },
  { id: "al_09", employeeId: "emp_05", employeeName: "David Brown", type: "PAID", year: CURRENT_YEAR, allocatedDays: 24 },
  { id: "al_10", employeeId: "emp_05", employeeName: "David Brown", type: "SICK", year: CURRENT_YEAR, allocatedDays: 7 },
]

// ─── Helpers ───

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

const LEAVE_TYPES: LeaveType[] = ["PAID", "SICK", "UNPAID"]
const CURRENT_USER_LEAVES = MOCK_MY_LEAVES
let allLeavesState = [...MOCK_ALL_LEAVES]
let allocationsState = [...MOCK_ALLOCATIONS]

// ─── Balance Card ───

function BalanceCard({ balance }: { balance: Balance }) {
  const progress =
    balance.allocated != null && balance.allocated > 0
      ? Math.round((balance.used / balance.allocated) * 100)
      : 0

  return (
    <Card size="sm" className="flex-1 min-w-0">
      <CardContent className="pt-[--card-spacing]">
        <p className="text-xs text-muted-foreground mb-1">{TYPE_LABELS[balance.type]}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">
          {balance.available != null ? balance.available : "—"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {balance.allocated != null
            ? `${balance.used} used of ${balance.allocated}`
            : `${balance.used} used`}
        </p>
        {balance.allocated != null && balance.allocated > 0 && (
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progress >= 80 ? "bg-destructive" : progress >= 50 ? "bg-yellow-500" : "bg-green-500"
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tabs ───

type Tab = "my-requests" | "all-requests" | "allocations"

const TABS: { key: Tab; label: string }[] = [
  { key: "my-requests", label: "My Requests" },
  { key: "all-requests", label: "All Requests" },
  { key: "allocations", label: "Allocations" },
]

// ─── Create Leave Sheet ───

function CreateLeaveSheet({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (data: { type: LeaveType; startDate: string; endDate: string; remarks: string }) => void
}) {
  const [type, setType] = React.useState<LeaveType>("PAID")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [remarks, setRemarks] = React.useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onCreate({ type, startDate, endDate, remarks })
    setType("PAID")
    setStartDate("")
    setEndDate("")
    setRemarks("")
  }

  const canSubmit = startDate && endDate && new Date(endDate) >= new Date(startDate)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create Leave Request</SheetTitle>
          <SheetDescription>Submit a new leave request for approval.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex-1 space-y-4">
            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Leave Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LeaveType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
                placeholder="Optional reason..."
              />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Attachment (optional)</label>
              <div className="flex items-center gap-2 rounded-md border border-dashed border-input px-3 py-4 text-sm text-muted-foreground">
                <Upload className="size-4" />
                <span>Drop a file or click to upload</span>
              </div>
            </fieldset>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={!canSubmit}>Submit Request</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Approve/Reject Sheet ───

function DecisionSheet({
  request,
  open,
  onOpenChange,
  onDecide,
}: {
  request: LeaveRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecide: (id: string, action: "approve" | "reject", comment: string) => void
}) {
  const [comment, setComment] = React.useState("")

  React.useEffect(() => {
    if (open) setComment("")
  }, [open])

  if (!request) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{request.employee?.name || CURRENT_USER.name} &middot; {TYPE_LABELS[request.type]}</SheetTitle>
          <SheetDescription>
            {formatDate(request.startDate)} — {formatDate(request.endDate)} ({request.days} day{request.days > 1 ? "s" : ""})
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <fieldset>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
              placeholder="Optional comment..."
            />
          </fieldset>

          <SheetFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => {
                onDecide(request.id, "reject", comment)
                onOpenChange(false)
              }}
            >
              <Ban className="size-4" />
              Reject
            </Button>
            <Button
              className="flex-1 gap-1.5"
              onClick={() => {
                onDecide(request.id, "approve", comment)
                onOpenChange(false)
              }}
            >
              <Check className="size-4" />
              Approve
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Allocation Sheet ───

function AllocationSheet({
  allocation,
  open,
  onOpenChange,
  onSave,
}: {
  allocation?: Allocation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { employeeId: string; type: LeaveType; year: number; allocatedDays: number }) => void
}) {
  const isEdit = !!allocation
  const [employeeId, setEmployeeId] = React.useState("emp_01")
  const [type, setType] = React.useState<LeaveType>("PAID")
  const [year, setYear] = React.useState(CURRENT_YEAR)
  const [allocatedDays, setAllocatedDays] = React.useState(24)

  React.useEffect(() => {
    if (allocation) {
      setEmployeeId(allocation.employeeId)
      setType(allocation.type)
      setYear(allocation.year)
      setAllocatedDays(allocation.allocatedDays)
    } else {
      setEmployeeId("emp_01")
      setType("PAID")
      setYear(CURRENT_YEAR)
      setAllocatedDays(24)
    }
  }, [allocation, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({ employeeId, type, year, allocatedDays })
  }

  const employeeSet = [...new Set(allocationsState.map((a) => a.employeeId))].map(
    (id) => {
      const found = allocationsState.find((a) => a.employeeId === id)
      return { id, name: found?.employeeName ?? id }
    }
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Allocation" : "Create Allocation"}</SheetTitle>
          <SheetDescription>{isEdit ? "Modify allocated days." : "Allocate leave days to an employee."}</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex-1 space-y-4">
            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Employee</label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={isEdit}
              >
                {employeeSet.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Leave Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LeaveType)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={isEdit}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Year</label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={isEdit}
                required
              />
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Allocated Days</label>
              <Input
                type="number"
                min={0}
                value={allocatedDays}
                onChange={(e) => setAllocatedDays(Number(e.target.value))}
                required
              />
            </fieldset>
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit">{isEdit ? "Update" : "Create"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Component ───

export default function TimeOffPage() {
  const [activeTab, setActiveTab] = React.useState<Tab>("my-requests")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-lg font-medium text-foreground">Time Off</h1>

        {/* Balance Overview */}
        <div className="flex flex-wrap gap-4">
          {MOCK_BALANCES.balances.map((b) => (
            <BalanceCard key={b.type} balance={b} />
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 border-b">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "my-requests" && <MyRequestsTab />}
        {activeTab === "all-requests" && <AllRequestsTab />}
        {activeTab === "allocations" && <AllocationsTab />}
      </div>
    </div>
  )
}

// ─── My Requests Tab ───

function MyRequestsTab() {
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>(CURRENT_USER_LEAVES)
  const [year, setYear] = React.useState(CURRENT_YEAR)
  const [statusFilter, setStatusFilter] = React.useState<LeaveStatus | "ALL">("ALL")
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detailRequest, setDetailRequest] = React.useState<LeaveRequest | null>(null)

  const filtered = React.useMemo(() => {
    return leaves.filter((l) => {
      const lYear = new Date(l.startDate + "T00:00:00").getFullYear()
      return lYear === year && (statusFilter === "ALL" || l.status === statusFilter)
    })
  }, [leaves, year, statusFilter])

  function handleCreate(data: { type: LeaveType; startDate: string; endDate: string; remarks: string }) {
    const newLeave: LeaveRequest = {
      id: nextLeaveId(),
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      days: daysBetween(data.startDate, data.endDate),
      status: "PENDING",
      attachmentUrl: null,
      createdAt: new Date().toISOString(),
    }
    setLeaves((prev) => [newLeave, ...prev])
    allLeavesState = [newLeave, ...allLeavesState]
    setCreateOpen(false)
  }

  function handleCancel(id: string) {
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status: "REJECTED" as LeaveStatus } : l)))
    allLeavesState = allLeavesState.map((l) => (l.id === id ? { ...l, status: "REJECTED" as LeaveStatus } : l))
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[2026, 2025, 2024].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | "ALL")}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Create Leave
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approver</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((leave) => {
              const statusCfg = STATUS_CONFIG[leave.status]
              const detail = allLeavesState.find((l) => l.id === leave.id)
              return (
                <TableRow key={leave.id}>
                  <TableCell>
                    <span className="text-sm font-medium text-foreground">{TYPE_LABELS[leave.type]}</span>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    <span className="text-muted-foreground">{formatDate(leave.startDate)}</span>
                    <span className="mx-1 text-muted-foreground/50">—</span>
                    <span className="text-muted-foreground">{formatDate(leave.endDate)}</span>
                  </TableCell>
                  <TableCell className="tabular-nums">{leave.days}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("font-normal", statusCfg.klass)}>
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {detail?.approver?.name || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">
                    {formatDateTime(leave.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDetailRequest(leave)}
                        title="View details"
                      >
                        <FileText className="size-3.5" />
                      </Button>
                      {leave.status === "PENDING" && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleCancel(leave.id)}
                          title="Cancel request"
                        >
                          <X className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No leave requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateLeaveSheet open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />

      {/* Detail Sheet */}
      <Sheet
        open={!!detailRequest}
        onOpenChange={(open) => { if (!open) setDetailRequest(null) }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          {detailRequest && (
            <>
              <SheetHeader>
                <SheetTitle>{TYPE_LABELS[detailRequest.type]}</SheetTitle>
                <SheetDescription>
                  {detailRequest.id} &middot;{" "}
                  <Badge variant="secondary" className={cn("font-normal", STATUS_CONFIG[detailRequest.status].klass)}>
                    {STATUS_CONFIG[detailRequest.status].label}
                  </Badge>
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 p-4">
                <div className="flex items-start gap-2.5">
                  <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date Range</p>
                    <p className="text-sm text-foreground">
                      {formatDate(detailRequest.startDate)} — {formatDate(detailRequest.endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm text-foreground">{detailRequest.days} day{detailRequest.days > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="text-sm text-foreground">{formatDateTime(detailRequest.createdAt)}</p>
                  </div>
                </div>
                {detailRequest.approverComment && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Approver Comment</p>
                    <p className="text-sm text-foreground">{detailRequest.approverComment}</p>
                  </div>
                )}
                {detailRequest.decidedAt && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Decided At</p>
                      <p className="text-sm text-foreground">{formatDateTime(detailRequest.decidedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── All Requests Tab (Admin) ───

const LIMIT = 8

function AllRequestsTab() {
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>(allLeavesState)
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<LeaveStatus | "ALL">("ALL")
  const [page, setPage] = React.useState(1)
  const [decisionTarget, setDecisionTarget] = React.useState<LeaveRequest | null>(null)

  const filtered = React.useMemo(() => {
    let result = leaves
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((l) => l.employee?.name.toLowerCase().includes(q))
    }
    if (statusFilter !== "ALL") {
      result = result.filter((l) => l.status === statusFilter)
    }
    return result
  }, [leaves, search, statusFilter])

  const totalPages = Math.ceil(filtered.length / LIMIT)
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT)

  function handleDecide(id: string, action: "approve" | "reject", comment: string) {
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: action === "approve" ? "APPROVED" : "REJECTED",
              approverComment: comment || undefined,
              approver: { id: CURRENT_USER.id, name: CURRENT_USER.name },
              decidedAt: new Date().toISOString(),
            }
          : l
      )
    )
    allLeavesState = allLeavesState.map((l) =>
      l.id === id
        ? {
            ...l,
            status: action === "approve" ? "APPROVED" : "REJECTED",
            approverComment: comment || undefined,
            approver: { id: CURRENT_USER.id, name: CURRENT_USER.name },
            decidedAt: new Date().toISOString(),
          }
        : l
    )
    setDecisionTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as LeaveStatus | "ALL")
            setPage(1)
          }}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Attachment</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map((leave) => {
              const statusCfg = STATUS_CONFIG[leave.status]
              return (
                <TableRow key={leave.id}>
                  <TableCell>
                    <span className="text-sm font-medium text-foreground">{leave.employee?.name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{TYPE_LABELS[leave.type]}</TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatDate(leave.startDate)}
                    <span className="mx-1 text-muted-foreground/50">—</span>
                    {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell className="tabular-nums">{leave.days}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("font-normal", statusCfg.klass)}>
                      {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {leave.attachmentUrl ? (
                      <a href={leave.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {leave.status === "PENDING" ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDecisionTarget(leave)}
                          className="text-green-600 hover:text-green-700"
                          title="Approve"
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setDecisionTarget(leave)
                          }}
                          className="text-destructive hover:text-destructive"
                          title="Reject"
                        >
                          <Ban className="size-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {paginated.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  No leave requests found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

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

      <DecisionSheet
        request={decisionTarget}
        open={!!decisionTarget}
        onOpenChange={(open) => { if (!open) setDecisionTarget(null) }}
        onDecide={handleDecide}
      />
    </div>
  )
}

// ─── Allocations Tab (Admin) ───

function AllocationsTab() {
  const [allocations, setAllocations] = React.useState<Allocation[]>(allocationsState)
  const [employeeFilter, setEmployeeFilter] = React.useState("ALL")
  const [yearFilter, setYearFilter] = React.useState(CURRENT_YEAR)
  const [editTarget, setEditTarget] = React.useState<Allocation | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const employeeOptions = React.useMemo(() => {
    const map = new Map<string, string>()
    allocations.forEach((a) => map.set(a.employeeId, a.employeeName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allocations])

  const filtered = React.useMemo(() => {
    return allocations.filter((a) => {
      if (employeeFilter !== "ALL" && a.employeeId !== employeeFilter) return false
      if (a.year !== yearFilter) return false
      return true
    })
  }, [allocations, employeeFilter, yearFilter])

  function handleCreate(data: { employeeId: string; type: LeaveType; year: number; allocatedDays: number }) {
    const exists = allocationsState.find(
      (a) => a.employeeId === data.employeeId && a.type === data.type && a.year === data.year
    )
    if (exists) {
      alert("Allocation already exists for this employee, type, and year. Use edit to modify.")
      return
    }
    const employeeName = employeeOptions.find((e) => e.id === data.employeeId)?.name ?? data.employeeId
    const newAllocation: Allocation = {
      id: nextAllocationId(),
      employeeId: data.employeeId,
      employeeName,
      type: data.type,
      year: data.year,
      allocatedDays: data.allocatedDays,
    }
    setAllocations((prev) => [...prev, newAllocation])
    allocationsState = [...allocationsState, newAllocation]
    setCreateOpen(false)
  }

  function handleEdit(data: { employeeId: string; type: LeaveType; year: number; allocatedDays: number }) {
    if (!editTarget) return
    setAllocations((prev) =>
      prev.map((a) =>
        a.id === editTarget.id ? { ...a, allocatedDays: data.allocatedDays } : a
      )
    )
    allocationsState = allocationsState.map((a) =>
      a.id === editTarget.id ? { ...a, allocatedDays: data.allocatedDays } : a
    )
    setEditTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Employees</option>
            {employeeOptions.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {[2026, 2025, 2024].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          New Allocation
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Allocated Days</TableHead>
              <TableHead className="w-16">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((allocation) => (
              <TableRow key={allocation.id}>
                <TableCell className="font-medium text-foreground">{allocation.employeeName}</TableCell>
                <TableCell className="text-muted-foreground">{TYPE_LABELS[allocation.type]}</TableCell>
                <TableCell className="tabular-nums">{allocation.year}</TableCell>
                <TableCell className="tabular-nums">{allocation.allocatedDays}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setEditTarget(allocation)}
                    title="Edit allocation"
                  >
                    <FileText className="size-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No allocations found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AllocationSheet open={createOpen} onOpenChange={setCreateOpen} onSave={handleCreate} />

      <AllocationSheet
        allocation={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        onSave={handleEdit}
      />
    </div>
  )
}
