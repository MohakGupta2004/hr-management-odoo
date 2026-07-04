"use client"

import * as React from "react"
import {
  Plus,
  Check,
  Ban,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
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
import { useAuth } from "@/lib/auth-context"
import api from "@/lib/api"

// ─── Types ───

type LeaveType = "PAID" | "SICK" | "CASUAL"
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED"

interface LeaveRequest {
  id: string
  leaveType: LeaveType
  startDate: string
  endDate: string
  days: number
  reason: string
  status: LeaveStatus
  approvedAt: string | null
  decisionReason: string | null
  createdAt: string
}

interface AdminLeaveRequest extends LeaveRequest {
  employee: { id: string; name: string; department: string | null }
}

interface Allocation {
  id: string
  leaveType: LeaveType
  year: number
  totalDays: number
  usedDays: number
  remainingDays: number
}

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface EmployeeOption {
  id: string
  name: string
}

// ─── Constants / helpers ───

const LEAVE_TYPES: LeaveType[] = ["PAID", "SICK", "CASUAL"]
const LIMIT = 8

const TYPE_LABELS: Record<LeaveType, string> = {
  PAID: "Paid Leave",
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
}

const STATUS_CONFIG: Record<LeaveStatus, { label: string; klass: string }> = {
  PENDING: { label: "Pending", klass: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15 dark:bg-yellow-500/15 dark:text-yellow-400" },
  APPROVED: { label: "Approved", klass: "bg-green-500/10 text-green-600 hover:bg-green-500/15 dark:bg-green-500/15 dark:text-green-400" },
  REJECTED: { label: "Rejected", klass: "bg-destructive/10 text-destructive hover:bg-destructive/15" },
}

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function errorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err instanceof Error ? err.message : fallback)
  )
}

// ─── Balance Card ───

function BalanceCard({ allocation }: { allocation: Allocation }) {
  const progress = allocation.totalDays > 0 ? Math.round((allocation.usedDays / allocation.totalDays) * 100) : 0

  return (
    <Card size="sm" className="flex-1 min-w-0">
      <CardContent className="pt-[--card-spacing]">
        <p className="text-xs text-muted-foreground mb-1">{TYPE_LABELS[allocation.leaveType]}</p>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{allocation.remainingDays}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {allocation.usedDays} used of {allocation.totalDays}
        </p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progress >= 80 ? "bg-destructive" : progress >= 50 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
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
  onCreate: (data: { leaveType: LeaveType; startDate: string; endDate: string; reason: string }) => Promise<void>
}) {
  const [leaveType, setLeaveType] = React.useState<LeaveType>("PAID")
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setLeaveType("PAID")
      setStartDate("")
      setEndDate("")
      setReason("")
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onCreate({ leaveType, startDate, endDate, reason })
    } catch (err) {
      setError(errorMessage(err, "Failed to submit leave request"))
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = startDate && endDate && reason.trim() && new Date(endDate) >= new Date(startDate)

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
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
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
              <label className="mb-1.5 block text-xs font-medium text-foreground">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
                placeholder="Reason for leave..."
              />
            </fieldset>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Submit Request
            </Button>
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
  request: AdminLeaveRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecide: (id: string, action: "approve" | "reject", reason: string) => Promise<void>
}) {
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState<"approve" | "reject" | null>(null)

  React.useEffect(() => {
    if (open) {
      setReason("")
      setError(null)
      setBusy(null)
    }
  }, [open])

  if (!request) return null

  async function handleDecide(action: "approve" | "reject") {
    setBusy(action)
    setError(null)
    try {
      await onDecide(request!.id, action, reason)
      onOpenChange(false)
    } catch (err) {
      setError(errorMessage(err, "Failed to update leave request"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{request.employee.name} &middot; {TYPE_LABELS[request.leaveType]}</SheetTitle>
          <SheetDescription>
            {formatDate(request.startDate)} — {formatDate(request.endDate)} ({request.days} day{request.days > 1 ? "s" : ""})
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground mb-0.5">Reason</p>
            <p className="text-sm text-foreground">{request.reason}</p>
          </div>

          <fieldset>
            <label className="mb-1.5 block text-xs font-medium text-foreground">Rejection Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground resize-none"
              placeholder="Only used if you reject..."
            />
          </fieldset>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}

          <SheetFooter className="flex-row gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              disabled={busy !== null}
              onClick={() => handleDecide("reject")}
            >
              {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-4" />}
              Reject
            </Button>
            <Button
              className="flex-1 gap-1.5"
              disabled={busy !== null}
              onClick={() => handleDecide("approve")}
            >
              {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
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
  defaultEmployeeId,
  employees,
  open,
  onOpenChange,
  onSave,
}: {
  allocation?: Allocation | null
  defaultEmployeeId: string | null
  employees: EmployeeOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: { employeeId: string; leaveType: LeaveType; year: number; totalDays: number }) => Promise<void>
}) {
  const isEdit = !!allocation
  const [employeeId, setEmployeeId] = React.useState(defaultEmployeeId ?? "")
  const [leaveType, setLeaveType] = React.useState<LeaveType>("PAID")
  const [year, setYear] = React.useState(new Date().getFullYear())
  const [totalDays, setTotalDays] = React.useState(24)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setError(null)
    if (allocation) {
      setLeaveType(allocation.leaveType)
      setYear(allocation.year)
      setTotalDays(allocation.totalDays)
    } else {
      setEmployeeId(defaultEmployeeId ?? "")
      setLeaveType("PAID")
      setYear(new Date().getFullYear())
      setTotalDays(24)
    }
  }, [allocation, open, defaultEmployeeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSave({ employeeId, leaveType, year, totalDays })
    } catch (err) {
      setError(errorMessage(err, "Failed to save allocation"))
    } finally {
      setSubmitting(false)
    }
  }

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
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </fieldset>

            <fieldset>
              <label className="mb-1.5 block text-xs font-medium text-foreground">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
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
              <label className="mb-1.5 block text-xs font-medium text-foreground">Total Days</label>
              <Input
                type="number"
                min={1}
                value={totalDays}
                onChange={(e) => setTotalDays(Number(e.target.value))}
                required
              />
            </fieldset>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </SheetClose>
            <Button type="submit" disabled={!employeeId || submitting}>
              {submitting && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Component ───

export default function TimeOffPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [activeTab, setActiveTab] = React.useState<Tab>("my-requests")
  const [allocations, setAllocations] = React.useState<Allocation[]>([])

  const fetchMyAllocations = React.useCallback(() => {
    api
      .get("/leaves/allocations/me")
      .then((res) => setAllocations(res.data ?? []))
      .catch(() => setAllocations([]))
  }, [])

  React.useEffect(() => {
    fetchMyAllocations()
  }, [fetchMyAllocations])

  const currentYear = new Date().getFullYear()
  const currentAllocations = allocations.filter((a) => a.year === currentYear)
  const tabs = isAdmin ? TABS : TABS.filter((t) => t.key === "my-requests")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <h1 className="text-lg font-medium text-foreground">Time Off</h1>

        {currentAllocations.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {currentAllocations.map((a) => (
              <BalanceCard key={a.id} allocation={a} />
            ))}
          </div>
        )}

        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
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

        {activeTab === "my-requests" && <MyRequestsTab onLeaveCreated={fetchMyAllocations} />}
        {activeTab === "all-requests" && isAdmin && <AllRequestsTab onDecision={fetchMyAllocations} />}
        {activeTab === "allocations" && isAdmin && <AllocationsTab />}
      </div>
    </div>
  )
}

// ─── My Requests Tab ───

function MyRequestsTab({ onLeaveCreated }: { onLeaveCreated: () => void }) {
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([])
  const [meta, setMeta] = React.useState<Meta | null>(null)
  const [statusFilter, setStatusFilter] = React.useState<LeaveStatus | "ALL">("ALL")
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [detailRequest, setDetailRequest] = React.useState<LeaveRequest | null>(null)

  const fetchLeaves = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get("/leaves/me", {
        params: { page, limit: LIMIT, status: statusFilter !== "ALL" ? statusFilter : undefined },
      })
      .then((res) => {
        setLeaves(res.data.records ?? [])
        setMeta(res.data.meta ?? null)
      })
      .catch((err) => {
        setLeaves([])
        setMeta(null)
        setError(errorMessage(err, "Failed to load leave requests"))
      })
      .finally(() => setLoading(false))
  }, [page, statusFilter])

  React.useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  async function handleCreate(data: { leaveType: LeaveType; startDate: string; endDate: string; reason: string }) {
    await api.post("/leaves", data)
    setCreateOpen(false)
    setPage(1)
    fetchLeaves()
    onLeaveCreated()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Create Leave
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="flex items-center justify-center gap-1.5 py-12 text-center text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-16">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => {
                  const statusCfg = STATUS_CONFIG[leave.status]
                  return (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">{TYPE_LABELS[leave.leaveType]}</span>
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
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {formatDateTime(leave.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDetailRequest(leave)}
                          title="View details"
                        >
                          <FileText className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {leaves.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      <CreateLeaveSheet open={createOpen} onOpenChange={setCreateOpen} onCreate={handleCreate} />

      <Sheet open={!!detailRequest} onOpenChange={(open) => { if (!open) setDetailRequest(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {detailRequest && (
            <>
              <SheetHeader>
                <SheetTitle>{TYPE_LABELS[detailRequest.leaveType]}</SheetTitle>
                <SheetDescription>
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
                <div className="rounded-md bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-0.5">Reason</p>
                  <p className="text-sm text-foreground">{detailRequest.reason}</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created At</p>
                    <p className="text-sm text-foreground">{formatDateTime(detailRequest.createdAt)}</p>
                  </div>
                </div>
                {detailRequest.decisionReason && (
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Decision Reason</p>
                    <p className="text-sm text-foreground">{detailRequest.decisionReason}</p>
                  </div>
                )}
                {detailRequest.approvedAt && (
                  <div className="flex items-start gap-2.5">
                    <Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Decided At</p>
                      <p className="text-sm text-foreground">{formatDateTime(detailRequest.approvedAt)}</p>
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

function AllRequestsTab({ onDecision }: { onDecision: () => void }) {
  const [leaves, setLeaves] = React.useState<AdminLeaveRequest[]>([])
  const [meta, setMeta] = React.useState<Meta | null>(null)
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([])
  const [employeeFilter, setEmployeeFilter] = React.useState("ALL")
  const [statusFilter, setStatusFilter] = React.useState<LeaveStatus | "ALL">("ALL")
  const [leaveTypeFilter, setLeaveTypeFilter] = React.useState<LeaveType | "ALL">("ALL")
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [decisionTarget, setDecisionTarget] = React.useState<AdminLeaveRequest | null>(null)

  React.useEffect(() => {
    api
      .get("/employees", { params: { limit: 100 } })
      .then((res) => setEmployees(res.data.data ?? []))
      .catch(() => setEmployees([]))
  }, [])

  const fetchLeaves = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get("/leaves", {
        params: {
          page,
          limit: LIMIT,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          employee: employeeFilter !== "ALL" ? employeeFilter : undefined,
          leaveType: leaveTypeFilter !== "ALL" ? leaveTypeFilter : undefined,
        },
      })
      .then((res) => {
        setLeaves(res.data.data ?? [])
        setMeta(res.data.meta ?? null)
      })
      .catch((err) => {
        setLeaves([])
        setMeta(null)
        setError(errorMessage(err, "Failed to load leave requests"))
      })
      .finally(() => setLoading(false))
  }, [page, statusFilter, employeeFilter, leaveTypeFilter])

  React.useEffect(() => {
    fetchLeaves()
  }, [fetchLeaves])

  async function handleDecide(id: string, action: "approve" | "reject", reason: string) {
    if (action === "approve") {
      await api.patch(`/leaves/${id}/approve`)
    } else {
      await api.patch(`/leaves/${id}/reject`, reason ? { reason } : {})
    }
    fetchLeaves()
    onDecision()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={employeeFilter}
          onChange={(e) => { setEmployeeFilter(e.target.value); setPage(1) }}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as LeaveStatus | "ALL"); setPage(1) }}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={leaveTypeFilter}
          onChange={(e) => { setLeaveTypeFilter(e.target.value as LeaveType | "ALL"); setPage(1) }}
          className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">All Types</option>
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="flex items-center justify-center gap-1.5 py-12 text-center text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => {
                  const statusCfg = STATUS_CONFIG[leave.status]
                  return (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">{leave.employee.name}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{TYPE_LABELS[leave.leaveType]}</TableCell>
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
                        {leave.status === "PENDING" ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDecisionTarget(leave)}
                            title="Review request"
                          >
                            <FileText className="size-3.5" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {leaves.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No leave requests found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
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
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([])
  const [employeeId, setEmployeeId] = React.useState<string | null>(null)
  const [allocations, setAllocations] = React.useState<Allocation[]>([])
  const [yearFilter, setYearFilter] = React.useState(new Date().getFullYear())
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [editTarget, setEditTarget] = React.useState<Allocation | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  React.useEffect(() => {
    api
      .get("/employees", { params: { limit: 100 } })
      .then((res) => {
        const list: EmployeeOption[] = res.data.data ?? []
        setEmployees(list)
        setEmployeeId((prev) => prev ?? list[0]?.id ?? null)
      })
      .catch(() => setEmployees([]))
  }, [])

  const fetchAllocations = React.useCallback(() => {
    if (!employeeId) return
    setLoading(true)
    setError(null)
    api
      .get(`/leaves/allocations/${employeeId}`)
      .then((res) => setAllocations(res.data ?? []))
      .catch((err) => {
        setAllocations([])
        setError(errorMessage(err, "Failed to load allocations"))
      })
      .finally(() => setLoading(false))
  }, [employeeId])

  React.useEffect(() => {
    fetchAllocations()
  }, [fetchAllocations])

  async function handleSave(data: { employeeId: string; leaveType: LeaveType; year: number; totalDays: number }) {
    await api.post("/leaves/allocations", data)
    setCreateOpen(false)
    setEditTarget(null)
    fetchAllocations()
  }

  const filtered = allocations.filter((a) => a.year === yearFilter)
  const years = Array.from(new Set(allocations.map((a) => a.year))).sort((a, b) => b - a)
  if (!years.includes(yearFilter)) years.unshift(yearFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={employeeId ?? ""}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(Number(e.target.value))}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)} disabled={!employeeId}>
          <Plus className="mr-1.5 size-4" />
          New Allocation
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="flex items-center justify-center gap-1.5 py-12 text-center text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Leave Type</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Total Days</TableHead>
                <TableHead>Used Days</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead className="w-16">Edit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="font-medium text-foreground">{TYPE_LABELS[allocation.leaveType]}</TableCell>
                  <TableCell className="tabular-nums">{allocation.year}</TableCell>
                  <TableCell className="tabular-nums">{allocation.totalDays}</TableCell>
                  <TableCell className="tabular-nums">{allocation.usedDays}</TableCell>
                  <TableCell className="tabular-nums">{allocation.remainingDays}</TableCell>
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
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No allocations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AllocationSheet
        open={createOpen}
        defaultEmployeeId={employeeId}
        employees={employees}
        onOpenChange={setCreateOpen}
        onSave={handleSave}
      />

      <AllocationSheet
        allocation={editTarget}
        open={!!editTarget}
        defaultEmployeeId={employeeId}
        employees={employees}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        onSave={(data) => handleSave({ ...data, employeeId: employeeId! })}
      />
    </div>
  )
}
