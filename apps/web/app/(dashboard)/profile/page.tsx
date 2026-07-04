"use client"

import * as React from "react"
import { Mail, Phone, MapPin, User, Briefcase, FileText, Award } from "lucide-react"

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
import { SalaryInfoTab } from "@/components/profile/salary-info"
import { DocumentsTab } from "@/components/profile/documents"

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

interface Resume {
  about: string
  whatILoveAboutJob: string
  interestsHobbies: string
  skills: Skill[]
  certifications: Certification[]
}

interface BankInfo {
  accountNumber: string
  bankName: string
  ifscCode: string
  panNumber: string
  uanNumber: string
  esicCode: string
}

interface PrivateInfo {
  dateOfBirth: string
  mailingAddress: string
  nationality: string
  personalEmail: string
  gender: string
  maritalStatus: string
  dateOfJoining: string
  bank: BankInfo
}

interface Manager {
  id: string
  name: string
}

interface EmployeeProfile {
  id: string
  loginId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl: string
  company: string
  department: string
  manager: Manager
  location: string
  resume: Resume
  privateInfo: PrivateInfo
  editableFields: string[]
}

const MOCK_PROFILE: EmployeeProfile = {
  id: "emp_02",
  loginId: "OIJODO20220001",
  firstName: "John",
  lastName: "Doe",
  email: "john@odoo.in",
  phone: "+91 9876543211",
  avatarUrl: "",
  company: "Odoo India",
  department: "Engineering",
  manager: { id: "emp_01", name: "Jane Doe" },
  location: "Kolkata",
  resume: {
    about: "Full-stack developer with 4 years experience building scalable web applications using React, Node.js, and PostgreSQL.",
    whatILoveAboutJob: "Solving real problems for real people through clean, maintainable code.",
    interestsHobbies: "Chess, trekking, photography",
    skills: [
      { id: "skl_01", name: "React" },
      { id: "skl_02", name: "Node.js" },
    ],
    certifications: [
      { id: "crt_01", name: "AWS Solutions Architect", issuedBy: "Amazon", issuedAt: "2025-03-01" },
    ],
  },
  privateInfo: {
    dateOfBirth: "1998-04-12",
    mailingAddress: "22 Park Street, Kolkata 700016",
    nationality: "Indian",
    personalEmail: "john.personal@gmail.com",
    gender: "MALE",
    maritalStatus: "SINGLE",
    dateOfJoining: "2022-01-10",
    bank: {
      accountNumber: "XXXX1234",
      bankName: "SBI",
      ifscCode: "SBIN0000123",
      panNumber: "ABCDE1234F",
      uanNumber: "100200300400",
      esicCode: "1234567890",
    },
  },
  editableFields: ["phone", "mailingAddress", "personalEmail", "avatar", "about", "whatILoveAboutJob", "interestsHobbies"],
}

const MOCK_DOCUMENTS = [
  { id: "doc_01", title: "Offer letter", fileUrl: "#", uploadedAt: "2022-01-10T10:00:00+05:30" },
  { id: "doc_02", title: "ID proof", fileUrl: "#", uploadedAt: "2022-01-11T14:30:00+05:30" },
]

const MOCK_SALARY = {
  ctc: 2400000,
  monthlyGross: 200000,
  basic: 80000,
  hra: 40000,
  allowances: [
    { label: "Special Allowance", amount: 50000 },
    { label: "Travel Allowance", amount: 10000 },
    { label: "Medical Allowance", amount: 12500 },
  ],
  deductions: [
    { label: "PF", amount: 12000 },
    { label: "Professional Tax", amount: 200 },
  ],
  netPay: 158300,
  effectiveFrom: "2025-04-01",
}

function getInitials(firstName: string, lastName: string) {
  return (firstName[0] + lastName[0]).toUpperCase()
}

export default function ProfilePage() {
  const [profile] = React.useState(MOCK_PROFILE)
  const isAdmin = true

  const tabList = ["Resume"]
  if (isAdmin) tabList.push("Private Info", "Salary Info")
  else tabList.push("Private Info")
  tabList.push("Documents")

  const [activeTab, setActiveTab] = React.useState(tabList[0])

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
              <p className="text-sm text-muted-foreground">{profile.department} &middot; {profile.company}</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  {profile.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  {profile.phone}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {profile.location}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <User className="size-3.5" />
                Reports to <span className="font-medium text-foreground">{profile.manager.name}</span>
              </div>
            </div>
            <Badge variant="default" className="shrink-0">
              {isAdmin ? "Admin" : "Employee"}
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto">
            {tabList.map((tab) => (
              <TabsTrigger key={tab} value={tab} className="flex-1">
                {tab === "Resume" && <FileText className="mr-1.5 size-3.5" />}
                {tab === "Private Info" && <User className="mr-1.5 size-3.5" />}
                {tab === "Salary Info" && <Award className="mr-1.5 size-3.5" />}
                {tab === "Documents" && <Briefcase className="mr-1.5 size-3.5" />}
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="Resume">
            <ResumeTab resume={profile.resume} editableFields={profile.editableFields} />
          </TabsContent>

          <TabsContent value="Private Info">
            <PrivateInfoTab privateInfo={profile.privateInfo} editableFields={profile.editableFields} />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="Salary Info">
              <SalaryInfoTab salary={MOCK_SALARY} />
            </TabsContent>
          )}

          <TabsContent value="Documents">
            <DocumentsTab documents={MOCK_DOCUMENTS} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
