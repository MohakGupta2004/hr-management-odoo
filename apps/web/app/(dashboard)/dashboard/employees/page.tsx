"use client"

import * as React from "react"
import { Search, ChevronLeft, ChevronRight, MapPin, Building2, Phone, Mail, Calendar, User, Briefcase, Award, Plus, X, Loader2 } from "lucide-react"

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
  open,
  onClose,
  onCreated,
}: {
  open: boolean
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

  if (!open) return null

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="mx-4 w-full max-w-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Create Employee</CardTitle>
          <button
            onClick={onClose}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Email <span className="text-destructive">*</span>
              </label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Phone</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Designation</label>
                <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Department</label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Location</label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Date of Joining <span className="text-destructive">*</span>
                </label>
                <Input type="date" value={dateOfJoining} onChange={(e) => setDateOfJoining(e.target.value)} required />
              </div>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
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
                className="cursor-pointer transition-colors hover:bg-accent/50"
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
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selectedId && !detail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : detail ? (
            <>
              <SheetHeader className="border-b pb-4">
                <div className="flex items-center gap-3 pt-2">
                  <Avatar size="lg">
                    <AvatarFallback className="text-base">
                      {getInitials(`${detail.firstName} ${detail.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle>
                      {detail.firstName} {detail.lastName}
                    </SheetTitle>
                    <SheetDescription>
                      {detail.department}
                      {detail.designation ? ` \u00b7 ${detail.designation}` : ""}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="divide-y">
                {/* Contact */}
                <Section title="Contact">
                  <DetailRow icon={Mail} label="Email" value={detail.email} />
                  <DetailRow icon={Phone} label="Phone" value={detail.phone ?? "—"} />
                  <DetailRow icon={MapPin} label="Location" value={detail.location ?? "—"} />
                </Section>

                {/* Employment */}
                <Section title="Employment">
                  <DetailRow icon={User} label="Login ID" value={detail.user?.loginId ?? "—"} />
                  <DetailRow icon={Building2} label="Company" value={detail.department ?? "—"} />
                  <DetailRow icon={Briefcase} label="Designation" value={detail.designation ?? "—"} />
                  <DetailRow icon={User} label="Manager" value={detail.manager?.name ?? "—"} />
                  <DetailRow icon={Calendar} label="Date of Joining" value={formatDate(detail.dateOfJoining)} />
                </Section>

                {/* Skills */}
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

                {/* Certifications */}
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

      <CreateEmployeeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  )
}
