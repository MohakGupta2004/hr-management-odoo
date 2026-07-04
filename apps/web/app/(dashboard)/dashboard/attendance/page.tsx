"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

// ─── Types ───

type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY" | "WEEKEND" | "LEAVE"

interface AttendanceRecord {
  date: string
  checkIn: string
  checkOut: string
  workHours: string
  extraHours: string
  status: AttendanceStatus
}

interface AttendanceResponse {
  summary: {
    daysPresent: number
    leavesCount: number
    totalWorkingDays: number
  }
  data: AttendanceRecord[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// ─── Deterministic pseudo-random (avoids hydration mismatch) ───

function seededRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297
  return x - Math.floor(x)
}

// ─── Mock data generator ───

function generateMockData(month: number, year: number): AttendanceResponse {
  const daysInMonth = new Date(year, month, 0).getDate()
  const records: AttendanceRecord[] = []
  let daysPresent = 0
  let leavesCount = 0
  let totalWorkingDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    const dow = new Date(year, month - 1, day).getDay()
    const isWeekend = dow === 0 || dow === 6

    if (isWeekend) {
      records.push({
        date,
        checkIn: "—",
        checkOut: "—",
        workHours: "—",
        extraHours: "—",
        status: "WEEKEND",
      })
      continue
    }

    totalWorkingDays++

    const rand = seededRand(day * 31 + month * 13 + year)
    if (rand < 0.05) {
      leavesCount++
      records.push({
        date,
        checkIn: "—",
        checkOut: "—",
        workHours: "—",
        extraHours: "—",
        status: "ABSENT",
      })
    } else if (rand < 0.1) {
      leavesCount++
      records.push({
        date,
        checkIn: "—",
        checkOut: "—",
        workHours: "—",
        extraHours: "—",
        status: "LEAVE",
      })
    } else if (rand < 0.15) {
      daysPresent += 0.5
      records.push({
        date,
        checkIn: "10:00",
        checkOut: "14:00",
        workHours: "04:00",
        extraHours: "00:00",
        status: "HALF_DAY",
      })
    } else {
      daysPresent++
      const r2 = seededRand(day * 31 + month * 13 + year + 1000)
      const checkInHour = 8 + Math.floor(r2 * 3)
      const r3 = seededRand(day * 31 + month * 13 + year + 2000)
      const checkOutHour = 17 + Math.floor(r3 * 3)
      const workH = checkOutHour - checkInHour - 1
      const extraH = Math.max(0, workH - 8)
      records.push({
        date,
        checkIn: `${String(checkInHour).padStart(2, "0")}:00`,
        checkOut: `${String(checkOutHour).padStart(2, "0")}:00`,
        workHours: `${String(workH).padStart(2, "0")}:00`,
        extraHours: `${String(extraH).padStart(2, "0")}:00`,
        status: "PRESENT",
      })
    }
  }

  return {
    summary: {
      daysPresent,
      leavesCount,
      totalWorkingDays,
    },
    data: records,
    pagination: {
      page: 1,
      limit: 31,
      total: daysInMonth,
    },
  }
}

// ─── Status config ───

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; badgeClass: string }> = {
  PRESENT: { label: "Present", badgeClass: "" },
  ABSENT: { label: "Absent", badgeClass: "bg-destructive/10 text-destructive hover:bg-destructive/15" },
  HALF_DAY: { label: "Half Day", badgeClass: "bg-warning/10 text-warning hover:bg-warning/15" },
  WEEKEND: { label: "Weekend", badgeClass: "bg-muted text-muted-foreground" },
  LEAVE: { label: "Leave", badgeClass: "bg-secondary text-secondary-foreground" },
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

// ─── Component ───

export default function AttendancePage() {
  const [mounted, setMounted] = React.useState(false)
  const [month, setMonth] = React.useState(1)
  const [year, setYear] = React.useState(2026)

  React.useEffect(() => {
    const now = new Date()
    setMonth(now.getMonth() + 1)
    setYear(now.getFullYear())
    setMounted(true)
  }, [])

  const response = React.useMemo(() => generateMockData(month, year), [month, year])

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

  const { summary, data } = response

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
        <h1 className="text-lg font-medium text-foreground">Attendance</h1>

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
              {data.map((record) => (
                <TableRow key={record.date}>
                  <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                  <TableCell>{record.checkIn}</TableCell>
                  <TableCell>{record.checkOut}</TableCell>
                  <TableCell>{record.workHours}</TableCell>
                  <TableCell>{record.extraHours}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-normal",
                        record.status === "PRESENT" && "bg-green-500/10 text-green-600 hover:bg-green-500/15 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/20",
                        record.status === "WEEKEND" && "bg-muted text-muted-foreground",
                        record.status === "ABSENT" && "bg-destructive/10 text-destructive hover:bg-destructive/15",
                        record.status === "LEAVE" && "bg-orange-500/10 text-orange-600 hover:bg-orange-500/15 dark:bg-orange-500/15 dark:text-orange-400 dark:hover:bg-orange-500/20",
                        record.status === "HALF_DAY" && "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15 dark:bg-yellow-500/15 dark:text-yellow-400 dark:hover:bg-yellow-500/20",
                      )}
                    >
                      {STATUS_CONFIG[record.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {data.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No attendance records found.
          </p>
        )}
      </div>
    </div>
  )
}
