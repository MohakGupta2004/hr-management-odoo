"use client"

import * as React from "react"
import { IndianRupee, Calendar, TrendingUp, BadgePercent, Banknote } from "lucide-react"

import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface SalaryData {
  ctc: number
  monthlyGross: number
  basic: number
  hra: number
  allowances: { label: string; amount: number }[]
  deductions: { label: string; amount: number }[]
  netPay: number
  effectiveFrom: string
}

interface SalaryInfoTabProps {
  salary: SalaryData
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

function SalaryRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  )
}

export function SalaryInfoTab({ salary }: SalaryInfoTabProps) {
  return (
    <Card>
      <CardContent className="space-y-6 pt-(--card-spacing)">
        {/* CTC & Monthly */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Annual CTC</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{formatCurrency(salary.ctc)}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Gross</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{formatCurrency(salary.monthlyGross)}</p>
          </div>
        </div>

        {/* Breakdown */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Earnings</p>
          <div className="space-y-2">
            <SalaryRow icon={IndianRupee} label="Basic" value={formatCurrency(salary.basic)} />
            <SalaryRow icon={Banknote} label="HRA" value={formatCurrency(salary.hra)} />
            {salary.allowances.map((a, i) => (
              <SalaryRow key={i} icon={TrendingUp} label={a.label} value={formatCurrency(a.amount)} />
            ))}
          </div>
        </div>

        {/* Deductions */}
        {salary.deductions.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Deductions</p>
            <div className="space-y-2">
              {salary.deductions.map((d, i) => (
                <SalaryRow key={i} icon={BadgePercent} label={d.label} value={`- ${formatCurrency(d.amount)}`} />
              ))}
            </div>
          </div>
        )}

        {/* Net Pay */}
        <div className="rounded-lg border bg-accent/30 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Net Pay (Monthly)</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{formatCurrency(salary.netPay)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          Effective from {new Date(salary.effectiveFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </CardContent>
    </Card>
  )
}
