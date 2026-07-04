"use client"

import * as React from "react"
import { Calendar, MapPin, User, Mail, CreditCard, Building2, Landmark, Globe } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface BankInfo {
  accountNumber: string
  bankName: string
  ifscCode: string
  panNumber: string
  uanNumber: string
  esicCode: string
}

interface PrivateInfoData {
  dateOfBirth: string
  mailingAddress: string
  nationality: string
  personalEmail: string
  gender: string
  maritalStatus: string
  dateOfJoining: string
  bank: BankInfo
}

interface PrivateInfoTabProps {
  privateInfo: PrivateInfoData
  editableFields: string[]
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function InfoRow({
  icon: Icon,
  label,
  value,
  canEdit,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  canEdit: boolean
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {canEdit && onChange ? (
          <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-8 text-sm" />
        ) : (
          <p className="text-sm text-foreground">{value || "—"}</p>
        )}
      </div>
    </div>
  )
}

export function PrivateInfoTab({ privateInfo, editableFields }: PrivateInfoTabProps) {
  return (
    <Card>
      <CardContent className="divide-y pt-(--card-spacing)">
        {/* Personal Details */}
        <section className="space-y-3 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</p>
          <div className="space-y-3">
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={formatDate(privateInfo.dateOfBirth)}
              canEdit={false}
            />
            <InfoRow
              icon={MapPin}
              label="Mailing Address"
              value={privateInfo.mailingAddress}
              canEdit={editableFields.includes("mailingAddress")}
            />
            <InfoRow
              icon={Globe}
              label="Nationality"
              value={privateInfo.nationality}
              canEdit={false}
            />
            <InfoRow
              icon={Mail}
              label="Personal Email"
              value={privateInfo.personalEmail}
              canEdit={editableFields.includes("personalEmail")}
            />
            <InfoRow
              icon={User}
              label="Gender"
              value={privateInfo.gender}
              canEdit={false}
            />
            <InfoRow
              icon={User}
              label="Marital Status"
              value={privateInfo.maritalStatus}
              canEdit={false}
            />
            <InfoRow
              icon={Calendar}
              label="Date of Joining"
              value={formatDate(privateInfo.dateOfJoining)}
              canEdit={false}
            />
          </div>
        </section>

        {/* Bank Details */}
        <section className="space-y-3 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Details</p>
          <div className="space-y-3">
            <InfoRow
              icon={CreditCard}
              label="Account Number"
              value={privateInfo.bank.accountNumber}
              canEdit={false}
            />
            <InfoRow
              icon={Building2}
              label="Bank Name"
              value={privateInfo.bank.bankName}
              canEdit={false}
            />
            <InfoRow
              icon={Landmark}
              label="IFSC Code"
              value={privateInfo.bank.ifscCode}
              canEdit={false}
            />
            <InfoRow
              icon={CreditCard}
              label="PAN Number"
              value={privateInfo.bank.panNumber}
              canEdit={false}
            />
            <InfoRow
              icon={User}
              label="UAN Number"
              value={privateInfo.bank.uanNumber}
              canEdit={false}
            />
            <InfoRow
              icon={User}
              label="ESIC Code"
              value={privateInfo.bank.esicCode}
              canEdit={false}
            />
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
