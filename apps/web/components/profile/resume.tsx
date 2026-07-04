"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
} from "@/components/ui/card"

interface Skill {
  id: string
  name: string
}

interface Certification {
  id: string
  name: string
  issuedBy: string
  issuedAt: string
}

interface ResumeData {
  about: string
  whatILoveAboutJob: string
  interestsHobbies: string
  skills: Skill[]
  certifications: Certification[]
}

interface ResumeTabProps {
  resume: ResumeData
  editableFields: string[]
}

function EditableField({
  label,
  value,
  fieldKey,
  editableFields,
  onChange,
  multiline,
}: {
  label: string
  value: string
  fieldKey: string
  editableFields: string[]
  onChange: (value: string) => void
  multiline?: boolean
}) {
  const canEdit = editableFields.includes(fieldKey)

  if (multiline) {
    return (
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {canEdit ? (
          <textarea
            className={cn(
              "w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap">{value || "—"}</p>
        )}
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {canEdit ? (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <p className="text-sm text-foreground">{value || "—"}</p>
      )}
    </div>
  )
}

function SkillBadge({
  skill,
  onRemove,
}: {
  skill: Skill
  onRemove: () => void
}) {
  return (
    <Badge variant="secondary" className="gap-1.5 pr-1.5">
      {skill.name}
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
        aria-label={`Remove ${skill.name}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  )
}

export function ResumeTab({ resume, editableFields }: ResumeTabProps) {
  const [skills, setSkills] = React.useState<Skill[]>(resume.skills)
  const [certs, setCerts] = React.useState<Certification[]>(resume.certifications)
  const [newSkill, setNewSkill] = React.useState("")
  const [newCertName, setNewCertName] = React.useState("")
  const [newCertIssuer, setNewCertIssuer] = React.useState("")
  const [newCertDate, setNewCertDate] = React.useState("")

  const canEditSkills = editableFields.includes("skills") || editableFields.includes("about")
  const canEditCerts = editableFields.includes("certifications") || editableFields.includes("about")

  const handleAddSkill = () => {
    const name = newSkill.trim()
    if (!name) return
    if (skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return
    setSkills((prev) => [...prev, { id: `skl_${Date.now()}`, name }])
    setNewSkill("")
  }

  const handleRemoveSkill = (id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id))
  }

  const handleAddCert = () => {
    const name = newCertName.trim()
    if (!name) return
    setCerts((prev) => [
      ...prev,
      { id: `crt_${Date.now()}`, name, issuedBy: newCertIssuer.trim(), issuedAt: newCertDate || new Date().toISOString().split("T")[0] },
    ])
    setNewCertName("")
    setNewCertIssuer("")
    setNewCertDate("")
  }

  const handleRemoveCert = (id: string) => {
    setCerts((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-(--card-spacing)">
        <EditableField
          label="About"
          value={resume.about}
          fieldKey="about"
          editableFields={editableFields}
          onChange={() => {}}
          multiline
        />

        <EditableField
          label="What I Love About My Job"
          value={resume.whatILoveAboutJob}
          fieldKey="whatILoveAboutJob"
          editableFields={editableFields}
          onChange={() => {}}
          multiline
        />

        <EditableField
          label="Interests & Hobbies"
          value={resume.interestsHobbies}
          fieldKey="interestsHobbies"
          editableFields={editableFields}
          onChange={() => {}}
          multiline
        />

        {/* Skills */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills</p>
            {canEditSkills && (
              <Button variant="outline" size="sm" onClick={() => setNewSkill("_focus")}>
                <Plus className="mr-1 size-3.5" />
                Add Skills
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <SkillBadge key={s.id} skill={s} onRemove={() => handleRemoveSkill(s.id)} />
            ))}
          </div>
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground">No skills added yet.</p>
          )}
          {canEditSkills && newSkill === "_focus" && (
            <div className="flex items-center gap-2 mt-3">
              <Input
                placeholder="Enter skill name..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill() } }}
                className="flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleAddSkill}>Add</Button>
            </div>
          )}
        </div>

        {/* Certifications */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certifications</p>
            {canEditCerts && (
              <Button variant="outline" size="sm" onClick={() => setNewCertName("_focus")}>
                <Plus className="mr-1 size-3.5" />
                Add Certs
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {certs.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.issuedBy} &middot; {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveCert(c.id)}
                  className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted-foreground/20"
                  aria-label={`Remove ${c.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
          {certs.length === 0 && (
            <p className="text-sm text-muted-foreground">No certifications added yet.</p>
          )}
          {canEditCerts && newCertName === "_focus" && (
            <div className="space-y-2 mt-3 rounded-lg border p-3">
              <Input
                placeholder="Certification name..."
                value={newCertName}
                onChange={(e) => setNewCertName(e.target.value)}
                autoFocus
              />
              <Input
                placeholder="Issued by..."
                value={newCertIssuer}
                onChange={(e) => setNewCertIssuer(e.target.value)}
              />
              <Input
                type="date"
                value={newCertDate}
                onChange={(e) => setNewCertDate(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setNewCertName(""); setNewCertIssuer(""); setNewCertDate("") }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddCert}>Add</Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
