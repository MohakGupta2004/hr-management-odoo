"use client"

import * as React from "react"
import { Search, ChevronLeft, ChevronRight, MapPin, Building2, Phone, Mail, Calendar, User, Briefcase, Award, Plus, X, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth-context"
import api from "@/lib/api"

// ─── Types ───

interface EmployeeListItem {
  id: string
  name: string
  email: string
  role: string
  designation: string | null
  department: string | null
  status: string
  isActive: boolean
}

interface EmployeeDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  designation: string | null
  department: string | null
  location: string | null
  dateOfJoining: string
  user: { loginId: string } | null
  manager: { id: string; name: string } | null
  skills: { id: string; name: string }[]
  certifications: { id: string; name: string; issuedBy: string; issuedAt: string }[]
}

// ─── Helpers ───

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
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

// ─── Create Employee Dialog ───

function CreateEmployeeDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [designation, setDesignation] = React.useState("")
  const [department, setDepartment] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [dateOfJoining, setDateOfJoining] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await api.post("/employees", {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        designation: designation || undefined,
        department: department || undefined,
        location: location || undefined,
        dateOfJoining,
      })
      setSuccess(true)
      setTimeout(() => {
        onCreated()
        onClose()
        setFirstName("")
        setLastName("")
        setEmail("")
        setPhone("")
        setDesignation("")
        setDepartment("")
        setLocation("")
        setDateOfJoining("")
        setSuccess(false)
      }, 600)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to create employee")
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = firstName && lastName && email && dateOfJoining

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}>
      <Card className={cn("mx-4 w-full max-w-lg transition-all", success && "scale-95 opacity-0")}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Create Employee</CardTitle>
          <button
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-green-500/10">
                <svg className="size-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Employee Created</p>
              <p className="text-xs text-muted-foreground">Credentials have been sent to {email}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={submitting} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={submitting} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} placeholder="john@acme.com" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Phone</label>
                <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} placeholder="+1 555 987 6543" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Designation</label>
                  <Input value={designation} onChange={(e) => setDesignation(e.target.value)} disabled={submitting} placeholder="Engineer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Department</label>
                  <Input value={department} onChange={(e) => setDepartment(e.target.value)} disabled={submitting} placeholder="Engineering" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Location</label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} disabled={submitting} placeholder="Remote" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Date of Joining <span className="text-destructive">*</span>
                  </label>
                  <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required disabled={submitting} />
                </div>
              </div>

              {error && (
                <p className="flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid || submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Employee"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Edit Employee Dialog ───

function EditEmployeeDialog({
  employee,
  onClose,
  onUpdated,
}: {
  employee: EmployeeDetail
  onClose: () => void
  onUpdated: (employee: EmployeeDetail) => void
}) {
  const [department, setDepartment] = React.useState(employee.department ?? "")
  const [designation, setDesignation] = React.useState(employee.designation ?? "")
  const [phone, setPhone] = React.useState(employee.phone ?? "")
  const [location, setLocation] = React.useState(employee.location ?? "")
  const [managerId, setManagerId] = React.useState(employee.manager?.id ?? "")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.patch(`/employees/${employee.id}`, {
        department: department || undefined,
        designation: designation || undefined,
        phone: phone || undefined,
        location: location || undefined,
        managerId: managerId || undefined,
      })
      onUpdated(res.data)
      onClose()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to update employee")
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const hasChanges =
    department !== (employee.department ?? "") ||
    designation !== (employee.designation ?? "") ||
    phone !== (employee.phone ?? "") ||
    location !== (employee.location ?? "") ||
    managerId !== (employee.manager?.id ?? "")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose() }}>
      <Card className="mx-4 w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Edit {employee.firstName} {employee.lastName}
          </CardTitle>
          <button
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground">
              <Pencil className="size-3.5 shrink-0 text-blue-500" />
              Only updatable fields are shown
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Department</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Designation</label>
              <Input value={designation} onChange={(e) => setDesignation(e.target.value)} disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Phone</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} disabled={submitting} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Manager ID</label>
              <Input value={managerId} onChange={(e) => setManagerId(e.target.value)} disabled={submitting} placeholder="Employee ID" />
            </div>

            {error && (
              <p className="flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={!hasChanges || submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Delete Confirm Dialog ───

function DeleteConfirmDialog({
  employee,
  onClose,
  onDeleted,
}: {
  employee: EmployeeDetail
  onClose: () => void
  onDeleted: () => void
}) {
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const handleDelete = async () => {
    setError(null)
    setDeleting(true)
    try {
      await api.delete(`/employees/${employee.id}`)
      onDeleted()
      onClose()
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : "Failed to deactivate employee")
      setError(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose() }}>
      <Card className="mx-4 w-full max-w-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Deactivate Employee</CardTitle>
          <button
            onClick={onClose}
            disabled={deleting}
            className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-40"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="text-foreground">
                Deactivate <strong>{employee.firstName} {employee.lastName}</strong>?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This will mark them as terminated, revoke system access, and end their active sessions.
              </p>
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="size-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Deactivating...
                </>
              ) : (
                "Deactivate"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Component ───

export default function EmployeesPage() {
  const { user } = useAuth()
  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [employees, setEmployees] = React.useState<EmployeeListItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [detail, setDetail] = React.useState<EmployeeDetail | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const isAdmin = user?.role === "ADMIN"

  const debouncedSearch = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const [query, setQuery] = React.useState("")

  React.useEffect(() => {
    if (debouncedSearch.current) clearTimeout(debouncedSearch.current)
    debouncedSearch.current = setTimeout(() => {
      setQuery(search)
      setPage(1)
    }, 300)
    return () => {
      if (debouncedSearch.current) clearTimeout(debouncedSearch.current)
    }
  }, [search])

  React.useEffect(() => {
    const params: Record<string, string | number> = {
      page,
      limit: LIMIT,
      sortBy: "createdAt",
      sortOrder: "desc",
    }
    if (query) params.search = query

    let ignore = false
    api
      .get("/employees", { params })
      .then((res) => {
        if (ignore) return
        setEmployees(res.data.data)
        setTotal(res.data.meta?.total ?? res.data.data.length)
        setLoading(false)
      })
      .catch(() => {
        if (ignore) return
        setEmployees([])
        setTotal(0)
        setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [page, query])

  React.useEffect(() => {
    if (!selectedId) return
    let ignore = false
    api
      .get(`/employees/${selectedId}`)
      .then((res) => {
        if (!ignore) setDetail(res.data)
      })
      .catch(() => {
        if (!ignore) setDetail(null)
      })
    return () => {
      ignore = true
    }
  }, [selectedId])

  const totalPages = Math.ceil(total / LIMIT)

  function handleCreated() {
    setPage(1)
    setSearch("")
    setQuery("")
  }

  function handleUpdated(updated: EmployeeDetail) {
    setDetail(updated)
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === updated.id
          ? {
              ...e,
              name: `${updated.firstName} ${updated.lastName}`,
              department: updated.department,
              designation: updated.designation,
            }
          : e,
      ),
    )
  }

  function handleDeleted() {
    setSelectedId(null)
    setDetail(null)
    setPage(1)
    setQuery("")
    setSearch("")
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-medium text-foreground">Employees</h1>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                New
              </Button>
            )}
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {employees.map((employee) => (
              <Card
                key={employee.id}
                size="sm"
                className={cn(
                  "cursor-pointer transition-colors hover:bg-accent/50",
                  !employee.isActive && "opacity-60",
                )}
                onClick={() => setSelectedId(employee.id)}
              >
                <CardContent className="flex items-start gap-3 pt-[--card-spacing]">
                  <Avatar>
                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.department ?? employee.designation ?? "—"}
                    </p>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <span
                      className={cn(
                        "block size-2.5 rounded-full",
                        employee.isActive ? "bg-green-500" : "bg-red-500",
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && employees.length === 0 && (
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
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null)
            setDetail(null)
          }
        }}
      >
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          {selectedId && !detail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-start justify-between gap-3 pt-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar size="lg">
                      <AvatarFallback className="text-base">
                        {getInitials(`${detail.firstName} ${detail.lastName}`)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <SheetTitle className="truncate">
                        {detail.firstName} {detail.lastName}
                      </SheetTitle>
                      <SheetDescription className="truncate">
                        {detail.department}
                        {detail.designation ? ` \u00b7 ${detail.designation}` : ""}
                      </SheetDescription>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => setEditOpen(true)}
                        title="Edit employee"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteOpen(true)}
                        title="Deactivate employee"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto divide-y">
                <Section title="Contact">
                  <DetailRow icon={Mail} label="Email" value={detail.email} />
                  <DetailRow icon={Phone} label="Phone" value={detail.phone ?? "—"} />
                  <DetailRow icon={MapPin} label="Location" value={detail.location ?? "—"} />
                </Section>

                <Section title="Employment">
                  <DetailRow icon={User} label="Login ID" value={detail.user?.loginId ?? "—"} />
                  <DetailRow icon={Building2} label="Department" value={detail.department ?? "—"} />
                  <DetailRow icon={Briefcase} label="Designation" value={detail.designation ?? "—"} />
                  <DetailRow icon={User} label="Manager" value={detail.manager?.name ?? "—"} />
                  <DetailRow icon={Calendar} label="Date of Joining" value={formatDate(detail.dateOfJoining)} />
                </Section>

                {detail.skills && detail.skills.length > 0 && (
                  <Section title="Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {detail.skills.map((s) => (
                        <Badge key={s.id} variant="secondary">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

                {detail.certifications && detail.certifications.length > 0 && (
                  <Section title="Certifications">
                    <div className="space-y-2">
                      {detail.certifications.map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <Award className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.issuedBy} &middot; {formatDate(c.issuedAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {createOpen && (
        <CreateEmployeeDialog
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {editOpen && detail && (
        <EditEmployeeDialog
          employee={detail}
          onClose={() => setEditOpen(false)}
          onUpdated={handleUpdated}
        />
      )}

      {deleteOpen && detail && (
        <DeleteConfirmDialog
          employee={detail}
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
