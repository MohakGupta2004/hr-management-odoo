"use client"

import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Skill {
  id: string
  name: string
}

interface Certification {
  id: string
  name: string
  issuedBy: string
  issuedAt: string
  fileUrl: string | null
}

interface ResumeTabProps {
  about: string | null
  whatILoveAboutJob: string | null
  interestsHobbies: string | null
  skills: Skill[]
  certifications: Certification[]
}

function ReadOnlyField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value || "—"}</p>
    </div>
  )
}

export function ResumeTab({ about, whatILoveAboutJob, interestsHobbies, skills, certifications }: ResumeTabProps) {
  return (
    <Card>
      <CardContent className="space-y-6 pt-(--card-spacing)">
        <ReadOnlyField label="About" value={about} />
        <ReadOnlyField label="What I Love About My Job" value={whatILoveAboutJob} />
        <ReadOnlyField label="Interests & Hobbies" value={interestsHobbies} />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <Badge key={s.id} variant="secondary">{s.name}</Badge>
            ))}
          </div>
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground">No skills added yet.</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Certifications</p>
          <div className="space-y-2">
            {certifications.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.issuedBy} &middot; {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {certifications.length === 0 && (
            <p className="text-sm text-muted-foreground">No certifications added yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
