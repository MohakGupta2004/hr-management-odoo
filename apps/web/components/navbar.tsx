"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Building2, ChevronRight, Clock, LogOut, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"
import api from "@/lib/api"

const NAV_ITEMS = [
  { href: "/dashboard/employees", label: "Employees" },
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/time-off", label: "Time Off" },
] as const

interface TodayAttendance {
  checkIn: string | null
  checkOut: string | null
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

function CheckInModal({
  open,
  onClose,
  today,
  refreshing,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  today: TodayAttendance | null
  refreshing: boolean
  onChanged: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  if (!open) return null

  const status: "CHECKED_IN" | "COMPLETED" | "NOT_STARTED" =
    today?.checkIn && today.checkOut
      ? "COMPLETED"
      : today?.checkIn
        ? "CHECKED_IN"
        : "NOT_STARTED"

  const handleCheck = async () => {
    setLoading(true)
    setError(null)
    try {
      if (status === "NOT_STARTED") {
        await api.post("/attendance/check-in")
      } else if (status === "CHECKED_IN") {
        await api.post("/attendance/check-out")
      }
      onChanged()
    } catch (err) {
      setError(errorMessage(err, status === "NOT_STARTED" ? "Failed to check in" : "Failed to check out"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 pt-[--card-spacing]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Daily Attendance</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-3 py-4">
            <div className={cn(
              "flex size-16 items-center justify-center rounded-full",
              status === "CHECKED_IN" ? "bg-green-500/10" : "bg-muted",
            )}>
              <Clock className={cn(
                "size-7",
                status === "CHECKED_IN" ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
              )} />
            </div>
            <Badge
              variant={status === "CHECKED_IN" ? "default" : "secondary"}
              className={cn(
                status === "CHECKED_IN" && "bg-green-600 hover:bg-green-700",
              )}
            >
              {status === "CHECKED_IN" ? "Checked In" : status === "COMPLETED" ? "Checked Out" : "Not Checked In"}
            </Badge>
            {status === "CHECKED_IN" && today?.checkIn && (
              <span className="text-xs text-muted-foreground">
                Since {today.checkIn}
              </span>
            )}
            {status === "COMPLETED" && today?.checkOut && (
              <span className="text-xs text-muted-foreground">
                Checked out at {today.checkOut}
              </span>
            )}
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            variant={status === "NOT_STARTED" ? "default" : "outline"}
            onClick={handleCheck}
            disabled={loading || refreshing || status === "COMPLETED"}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : status === "NOT_STARTED" ? (
              "Check In"
            ) : status === "CHECKED_IN" ? (
              "Check Out"
            ) : (
              "Done for Today"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const { user, company, employee, logout } = useAuth()
  const [checkInOpen, setCheckInOpen] = React.useState(false)
  const [today, setToday] = React.useState<TodayAttendance | null>(null)
  const [refreshing, setRefreshing] = React.useState(true)

  const fetchToday = React.useCallback(() => {
    setRefreshing(true)
    const now = new Date()
    api
      .get("/attendance/me", {
        params: { month: now.getMonth() + 1, year: now.getFullYear(), page: 1, limit: 31 },
      })
      .then((res) => {
        const records: Array<{ date: string; checkIn: string | null; checkOut: string | null }> =
          res.data.records ?? []
        const record = records.find((r) => r.date === todayISO())
        setToday(record ? { checkIn: record.checkIn, checkOut: record.checkOut } : { checkIn: null, checkOut: null })
      })
      .catch(() => setToday(null))
      .finally(() => setRefreshing(false))
  }, [])

  React.useEffect(() => {
    fetchToday()
  }, [fetchToday])

  const navStatus: "CHECKED_IN" | "COMPLETED" | "NOT_STARTED" =
    today?.checkIn && today.checkOut
      ? "COMPLETED"
      : today?.checkIn
        ? "CHECKED_IN"
        : "NOT_STARTED"

  const initials = employee
    ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    : user?.loginId?.slice(0, 2).toUpperCase() ?? "??"
  const displayName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : user?.email ?? "User"

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/dashboard/employees" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Building2 className="size-5" />
            HRMS
          </Link>

          {/* Nav links */}
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setCheckInOpen(true)}>
              <Clock className="mr-1.5 size-3.5" />
              {navStatus === "CHECKED_IN" ? "Check Out" : navStatus === "COMPLETED" ? "Attendance" : "Check In"}
            </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <Avatar size="sm">
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">{displayName}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 size-3.5" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => logout()}
                  >
                    <LogOut className="mr-2 size-3.5" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
      </header>

      <CheckInModal
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        today={today}
        refreshing={refreshing}
        onChanged={fetchToday}
      />
    </>
  )
}
