"use client"

import * as React from "react"
import api from "@/lib/api"
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies"

type User = {
  id: string
  loginId: string
  email: string
  role: string
  mustChangePassword: boolean
}

type Company = {
  id: string
  name: string
  prefix: string
  logoUrl: string
}

type Employee = {
  id: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  designation: string | null
  department: string | null
}

type AuthState = {
  user: User | null
  company: Company | null
  employee: Employee | null
  attendanceStatus: string | null
  loading: boolean
}

type AuthContextValue = AuthState & {
  login: (identifier: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    user: null,
    company: null,
    employee: null,
    attendanceStatus: null,
    loading: true,
  })

  const fetchMe = React.useCallback(async () => {
    try {
      const res = await api.get("/auth/me")
      const { id, loginId, email, role, mustChangePassword, company, employee, attendanceStatus } = res.data
      setState({
        user: { id, loginId, email, role, mustChangePassword },
        company,
        employee,
        attendanceStatus,
        loading: false,
      })
    } catch {
      deleteCookie("token")
      deleteCookie("refreshToken")
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [])

  React.useEffect(() => {
    if (getCookie("token")) {
      fetchMe()
    } else {
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [fetchMe])

  const login = React.useCallback(
    async (identifier: string, password: string) => {
      const res = await api.post("/auth/login", { identifier, password })
      const { accessToken, refreshToken } = res.data
      setCookie("token", accessToken, 7)
      setCookie("refreshToken", refreshToken, 7)
      await fetchMe()
    },
    [fetchMe]
  )

  const logout = React.useCallback(async () => {
    try {
      const refreshToken = getCookie("refreshToken")
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken })
      }
    } catch {
      // ignore
    } finally {
      deleteCookie("token")
      deleteCookie("refreshToken")
      window.location.href = "/login"
    }
  }, [])

  const refreshAuth = React.useCallback(async () => {
    const refreshToken = getCookie("refreshToken")
    if (!refreshToken) {
      deleteCookie("token")
      setState((prev) => ({ ...prev, loading: false }))
      return
    }
    try {
      const res = await api.post("/auth/refresh", { refreshToken })
      const { accessToken, refreshToken: newRefresh } = res.data
      setCookie("token", accessToken, 7)
      setCookie("refreshToken", newRefresh, 7)
      await fetchMe()
    } catch {
      deleteCookie("token")
      deleteCookie("refreshToken")
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [fetchMe])

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
