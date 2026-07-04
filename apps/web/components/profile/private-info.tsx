"use client"

import * as React from "react"
import { Calendar, MapPin, User, Mail, CreditCard, Building2, Landmark, Globe, Briefcase, Phone } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface ProfileData {
  phone: string | null
  department: string | null
  designation: string | null
  location: string | null
  dateOfBirth: string | null
  mailingAddress: string | null
  nationality: string | null
  personalEmail: string | null
  gender: string | null
  maritalStatus: string | null
  dateOfJoining: string
  bankAccountNumber: string | null
  bankName: string | null
  ifscCode: string | null
  panNumber: string | null
  uanNumber: string | null
  esicCode: string | null
}

type EditableField = "phone" | "location" | "department" | "designation"

interface PrivateInfoTabProps {
  profile: ProfileData
  onSave: (field: EditableField, value: string) => Promise<void>
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
}) {
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

function EditableRow({
  icon: Icon,
  label,
  value,
  onSave,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | null
  onSave: (value: string) => Promise<void>
}) {
  const [draft, setDraft] = React.useState(value ?? "")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    setDraft(value ?? "")
  }, [value])

  const handleBlur = async () => {
    if (draft === (value ?? "")) return
    setSaving(true)
    try {
      await onSave(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Input
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          className="mt-0.5 h-8 text-sm"
        />
      </div>
    </div>
  )
}

export function PrivateInfoTab({ profile, onSave }: PrivateInfoTabProps) {
  return (
    <Card>
      <CardContent className="divide-y pt-(--card-spacing)">
        {/* Job Details */}
        <section className="space-y-3 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Job Details</p>
          <div className="space-y-3">
            <EditableRow icon={Briefcase} label="Department" value={profile.department} onSave={(v) => onSave("department", v)} />
            <EditableRow icon={Briefcase} label="Designation" value={profile.designation} onSave={(v) => onSave("designation", v)} />
            <EditableRow icon={Phone} label="Phone" value={profile.phone} onSave={(v) => onSave("phone", v)} />
            <EditableRow icon={MapPin} label="Location" value={profile.location} onSave={(v) => onSave("location", v)} />
          </div>
        </section>

        {/* Personal Details */}
        <section className="space-y-3 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Details</p>
          <div className="space-y-3">
            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(profile.dateOfBirth)} />
            <InfoRow icon={MapPin} label="Mailing Address" value={profile.mailingAddress} />
            <InfoRow icon={Globe} label="Nationality" value={profile.nationality} />
            <InfoRow icon={Mail} label="Personal Email" value={profile.personalEmail} />
            <InfoRow icon={User} label="Gender" value={profile.gender} />
            <InfoRow icon={User} label="Marital Status" value={profile.maritalStatus} />
            <InfoRow icon={Calendar} label="Date of Joining" value={formatDate(profile.dateOfJoining)} />
          </div>
        </section>

        {/* Bank Details */}
        <section className="space-y-3 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bank Details</p>
          <div className="space-y-3">
            <InfoRow icon={CreditCard} label="Account Number" value={profile.bankAccountNumber} />
            <InfoRow icon={Building2} label="Bank Name" value={profile.bankName} />
            <InfoRow icon={Landmark} label="IFSC Code" value={profile.ifscCode} />
            <InfoRow icon={CreditCard} label="PAN Number" value={profile.panNumber} />
            <InfoRow icon={User} label="UAN Number" value={profile.uanNumber} />
            <InfoRow icon={User} label="ESIC Code" value={profile.esicCode} />
          </div>
        </section>
      </CardContent>
    </Card>
  )
}
