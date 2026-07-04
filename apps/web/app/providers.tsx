"use client"

import * as React from "react"
import { ThemeProvider as NextThemeProvider } from "next-themes"
import { AuthProvider } from "@/lib/auth-context"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>{children}</AuthProvider>
    </NextThemeProvider>
  )
}
