"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Loader2, LogIn, LogOut, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import api from "@/lib/api"

// ─── Types ───

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "WEEKEND" | "LEAVE"

interface AttendanceRecord {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  workingMinutes: number | null
  overtimeMinutes: number | null
}

interface AttendanceMeta {
  page: number
  limit: number
  total: number
}

// ─── Status config ───

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; badgeClass: string }> = {
  PRESENT: { label: "Present", badgeClass: "bg-green-500/10 text-green-600 hover:bg-green-500/15 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/20" },
  ABSENT: { label: "Absent", badgeClass: "bg-destructive/10 text-destructive hover:bg-destructive/15" },
  HALF_DAY: { label: "Half Day", badgeClass: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15 dark:bg-yellow-500/15 dark:text-yellow-400 dark:hover:bg-yellow-500/20" },
  WEEKEND: { label: "Weekend", badgeClass: "bg-muted text-muted-foreground" },
  LEAVE: { label: "Leave", badgeClass: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/20" },
}

// ─── Helpers ───

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function formatMinutes(mins: number | null) {
  if (mins == null) return "—"
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function todayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function errorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err instanceof Error ? err.message : fallback)
  )
}

// ─── Component ───

export default function AttendancePage() {
  const [mounted, setMounted] = React.useState(false)
  const [month, setMonth] = React.useState(1)
  const [year, setYear] = React.useState(2026)

  const [records, setRecords] = React.useState<AttendanceRecord[]>([])
  const [meta, setMeta] = React.useState<AttendanceMeta | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [punching, setPunching] = React.useState(false)
  const [punchError, setPunchError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const now = new Date()
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
    setMounted(true)
  }, [])

  const fetchRecords = React.useCallback(() => {
    if (!mounted) return
    setLoading(true)
    setError(null)
    api
      .get("/attendance/me", { params: { month, year, page: 1, limit: 31 } })
      .then((res) => {
        setRecords(res.data.records ?? [])
        setMeta(res.data.meta ?? null)
      })
      .catch((err) => {
        setRecords([])
        setMeta(null)
        setError(errorMessage(err, "Failed to load attendance"))
      })
      .finally(() => setLoading(false))
  }, [mounted, month, year])

  React.useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const goPrev = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
  }

  const goNext = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
  }

  const today = todayISO()
  const isCurrentMonth = mounted && new Date().getFullYear() === year && new Date().getMonth() + 1 === month
  const todayRecord = isCurrentMonth ? records.find((r) => r.date === today) : undefined

  const handleCheckIn = async () => {
    setPunching(true)
    setPunchError(null)
    try {
      await api.post("/attendance/check-in")
      fetchRecords()
    } catch (err) {
      setPunchError(errorMessage(err, "Failed to check in"))
    } finally {
      setPunching(false)
    }
  }

  const handleCheckOut = async () => {
    setPunching(true)
    setPunchError(null)
    try {
      await api.post("/attendance/check-out")
      fetchRecords()
    } catch (err) {
      setPunchError(errorMessage(err, "Failed to check out"))
    } finally {
      setPunching(false)
    }
  }

  const summary = React.useMemo(() => {
    let daysPresent = 0
    let leavesCount = 0
    let totalWorkingDays = 0
    for (const r of records) {
      if (r.status === "WEEKEND") continue
      totalWorkingDays++
      if (r.status === "PRESENT") daysPresent++
      else if (r.status === "HALF_DAY") daysPresent += 0.5
      else if (r.status === "LEAVE" || r.status === "ABSENT") leavesCount++
    }
    return { daysPresent, leavesCount, totalWorkingDays }
  }, [records])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-6" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-lg font-medium text-foreground">Attendance</h1>

          {isCurrentMonth && (
            <div className="flex items-center gap-3">
              {punchError && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  {punchError}
                </p>
              )}
              {!todayRecord || !todayRecord.checkIn ? (
                <Button onClick={handleCheckIn} disabled={punching}>
                  {punching ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <LogIn className="mr-1.5 size-4" />}
                  Check In
                </Button>
              ) : !todayRecord.checkOut ? (
                <Button onClick={handleCheckOut} disabled={punching} variant="outline">
                  {punching ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <LogOut className="mr-1.5 size-4" />}
                  Check Out
                </Button>
              ) : (
                <Badge variant="secondary" className="font-normal">
                  Checked out at {todayRecord.checkOut}
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goPrev} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium tabular-nums">
              {MONTHS[month - 1]} {year}
            </span>
            <Button variant="outline" size="icon" onClick={goNext} aria-label="Next month">
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Card size="sm" className="shrink-0">
              <CardContent className="flex items-center gap-2 py-2 pe-4 ps-3">
                <span className="text-sm text-muted-foreground">Days Present</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{summary.daysPresent}</span>
              </CardContent>
            </Card>
            <Card size="sm" className="shrink-0">
              <CardContent className="flex items-center gap-2 py-2 pe-4 ps-3">
                <span className="text-sm text-muted-foreground">Leaves</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{summary.leavesCount}</span>
              </CardContent>
            </Card>
            <Card size="sm" className="shrink-0">
              <CardContent className="flex items-center gap-2 py-2 pe-4 ps-3">
                <span className="text-sm text-muted-foreground">Working Days</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{summary.totalWorkingDays}</span>
              </CardContent>
            </Card>
          </div>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Work Hours</TableHead>
                    <TableHead>Extra Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                      <TableCell>{record.checkIn ?? "—"}</TableCell>
                      <TableCell>{record.checkOut ?? "—"}</TableCell>
                      <TableCell>{formatMinutes(record.workingMinutes)}</TableCell>
                      <TableCell>{formatMinutes(record.overtimeMinutes)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn("font-normal", STATUS_CONFIG[record.status].badgeClass)}
                        >
                          {STATUS_CONFIG[record.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {records.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No attendance records found.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
