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

const NAV_ITEMS = [
  { href: "/dashboard/employees", label: "Employees" },
  { href: "/dashboard/attendance", label: "Attendance" },
  { href: "/dashboard/time-off", label: "Time Off" },
] as const

function CheckInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [status, setStatus] = React.useState<"CHECKED_IN" | "CHECKED_OUT">("CHECKED_OUT")
  const [loading, setLoading] = React.useState(false)

  if (!open) return null

  const handleCheck = () => {
    setLoading(true)
    setTimeout(() => {
      setStatus((s) => (s === "CHECKED_OUT" ? "CHECKED_IN" : "CHECKED_OUT"))
      setLoading(false)
    }, 800)
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
              {status === "CHECKED_IN" ? "Checked In" : "Checked Out"}
            </Badge>
            {status === "CHECKED_IN" && (
              <span className="text-xs text-muted-foreground">
                Since {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>

          <Button
            className="w-full"
            variant={status === "CHECKED_OUT" ? "default" : "outline"}
            onClick={handleCheck}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Processing...
              </span>
            ) : status === "CHECKED_OUT" ? (
              "Check In"
            ) : (
              "Check Out"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const [checkInOpen, setCheckInOpen] = React.useState(false)

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
              Check In
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <Avatar size="sm">
                    <AvatarFallback className="text-xs">AD</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Admin User</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 size-3.5" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-3.5" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <CheckInModal open={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </>
  )
}
