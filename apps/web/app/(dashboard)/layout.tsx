import { Navbar } from "@/components/navbar";
import * as React from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="flex-1 flex flex-col">
  <Navbar/>
  {children}
  </div>
}
