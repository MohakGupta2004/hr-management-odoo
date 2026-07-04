"use client"

import * as React from "react"
import { Mail, Phone, MapPin, User, Briefcase, FileText, Wallet, Loader2, AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import { ResumeTab } from "@/components/profile/resume"
import { PrivateInfoTab } from "@/components/profile/private-info"
import { DocumentsTab } from "@/components/profile/documents"
import { SalaryInfoTab } from "@/components/profile/salary-info"
import api from "@/lib/api"

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

interface Document {
  id: string
  title: string
  fileUrl: string
  uploadedAt: string
}

interface Manager {
  id: string
  firstName: string
  lastName: string
}

interface EmployeeProfile {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  phone: string | null
  designation: string | null
  department: string | null
  location: string | null
  managerId: string | null
  dateOfJoining: string
  about: string | null
  whatILoveAboutJob: string | null
  interestsHobbies: string | null
  dateOfBirth: string | null
  mailingAddress: string | null
  nationality: string | null
  personalEmail: string | null
  gender: string | null
  maritalStatus: string | null
  bankAccountNumber: string | null
  bankName: string | null
  ifscCode: string | null
  panNumber: string | null
  uanNumber: string | null
  esicCode: string | null
  user: {
    loginId: string
    email: string
    role: string
  }
  manager: Manager | null
  skills: Skill[]
  certifications: Certification[]
  documents: Document[]
}

function getInitials(firstName: string, lastName: string) {
  return ((firstName[0] ?? "") + (lastName[0] ?? "")).toUpperCase() || "?"
}

function errorMessage(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
    (err instanceof Error ? err.message : fallback)
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchProfile = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api
      .get("/employees/me")
      .then((res) => setProfile(res.data))
      .catch((err) => setError(errorMessage(err, "Failed to load profile")))
      .finally(() => setLoading(false))
  }, [])

  React.useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleFieldSave = React.useCallback(
    async (field: "phone" | "location" | "department" | "designation", value: string) => {
      if (!profile) return
      const res = await api.patch(`/employees/${profile.id}`, { [field]: value })
      setProfile((prev) => (prev ? { ...prev, [field]: res.data[field] } : prev))
    },
    [profile],
  )

  const tabList = ["Resume", "Private Info", "Salary Info", "Documents"]
  const [activeTab, setActiveTab] = React.useState(tabList[0])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error ?? "Profile not found"}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-xl bg-card p-6 shadow-xs ring-1 ring-foreground/10">
          <div className="flex items-start gap-5">
            <Avatar size="lg" className="size-16">
              <AvatarFallback className="text-lg">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-medium text-foreground">
                {profile.firstName} {profile.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile.department ?? "—"} &middot; {profile.designation ?? "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  {profile.user.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  {profile.phone ?? "—"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {profile.location ?? "—"}
                </div>
              </div>
              {profile.manager && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="size-3.5" />
                  Reports to{" "}
                  <span className="font-medium text-foreground">
                    {profile.manager.firstName} {profile.manager.lastName}
                  </span>
                </div>
              )}
            </div>
            <Badge variant="default" className="shrink-0">
              {profile.user.role.charAt(0) + profile.user.role.slice(1).toLowerCase()}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto">
            {tabList.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="flex-1">
                {tab === "Resume" && <FileText className="mr-1.5 size-3.5" />}
                {tab === "Private Info" && <User className="mr-1.5 size-3.5" />}
                {tab === "Salary Info" && <Wallet className="mr-1.5 size-3.5" />}
                {tab === "Documents" && <Briefcase className="mr-1.5 size-3.5" />}
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="Resume">
            <ResumeTab
              about={profile.about}
              whatILoveAboutJob={profile.whatILoveAboutJob}
              interestsHobbies={profile.interestsHobbies}
              skills={profile.skills}
              certifications={profile.certifications}
            />
          </TabsContent>

          <TabsContent value="Private Info">
            <PrivateInfoTab profile={profile} onSave={handleFieldSave} />
          </TabsContent>

          <TabsContent value="Salary Info">
            <SalaryInfoTab />
          </TabsContent>

          <TabsContent value="Documents">
            <DocumentsTab documents={profile.documents} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
