"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Download, Loader2, AlertTriangle, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import api from "@/lib/api"

interface Payslip {
  id: string
  month: number
  monthName: string
  year: number
  grossSalary: number
  totalDeductions: number
  netSalary: number
  generatedAt: string
}

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}

const LIMIT = 8

function errorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err instanceof Error ? err.message : fallback)
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function SalaryInfoTab() {
  const [payslips, setPayslips] = React.useState<Payslip[]>([])
  const [meta, setMeta] = React.useState<Meta | null>(null)
  const [yearFilter, setYearFilter] = React.useState<number | "ALL">("ALL")
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

  const fetchPayslips = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get("/payslips/me", {
        params: { page, limit: LIMIT, year: yearFilter !== "ALL" ? yearFilter : undefined },
      })
      .then((res) => {
        setPayslips(res.data.records ?? [])
        setMeta(res.data.meta ?? null)
      })
      .catch((err) => {
        setPayslips([])
        setMeta(null)
        setError(errorMessage(err, "Failed to load payslips"))
      })
      .finally(() => setLoading(false))
  }, [page, yearFilter])

  React.useEffect(() => {
    fetchPayslips()
  }, [fetchPayslips])

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  async function handleDownload(payslip: Payslip) {
    setDownloadingId(payslip.id)
    try {
      const res = await api.get(`/payslips/${payslip.id}/pdf`, { responseType: "blob" })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement("a")
      a.href = url
      a.download = `payslip-${payslip.monthName}-${payslip.year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(errorMessage(err, "Failed to download payslip"))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-(--card-spacing)">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Wallet className="size-3.5" />
            Payslips
          </p>
          <select
            value={yearFilter}
            onChange={(e) => {
              setYearFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))
              setPage(1)
            }}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ALL">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
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
                    <TableHead>Month</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead className="w-16">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium text-foreground">
                        {payslip.monthName} {payslip.year}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatCurrency(payslip.grossSalary)}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatCurrency(payslip.totalDeductions)}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium text-foreground">
                        {formatCurrency(payslip.netSalary)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          disabled={downloadingId === payslip.id}
                          onClick={() => handleDownload(payslip)}
                          title="Download payslip"
                        >
                          {downloadingId === payslip.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payslips.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                        No payslips found.
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
      </CardContent>
    </Card>
  )
}
