"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Eye, EyeOff, ChevronDown } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import api from "@/lib/api"

const registerSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    phoneCode: z.string().min(1, "Select country code"),
    phoneNumber: z.string().min(1, "Phone number is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterFormData = z.infer<typeof registerSchema>

const countryCodes = [
  { code: "+1", country: "US" },
  { code: "+44", country: "UK" },
  { code: "+91", country: "IN" },
  { code: "+61", country: "AU" },
  { code: "+81", country: "JP" },
  { code: "+86", country: "CN" },
  { code: "+49", country: "DE" },
  { code: "+33", country: "FR" },
  { code: "+39", country: "IT" },
  { code: "+55", country: "BR" },
  { code: "+7", country: "RU" },
  { code: "+82", country: "KR" },
]

export default function RegisterPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setError(null)
    const payload = {
      companyName: data.companyName,
      logo: logoPreview || "",
      fullName: data.name,
      email: data.email,
      phone: `${data.phoneCode}${data.phoneNumber}`,
      password: data.password,
      confirmPassword: data.confirmPassword,
    }

    try {
      const response = await api.post("/auth/register-company", payload)
      console.log(response.data)
      router.push("/login")
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed"
      setError(message)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Create account</CardTitle>
          <CardDescription>
            Register your company to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="size-16 rounded-md border border-input bg-muted flex items-center justify-center overflow-hidden cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="size-full object-contain"
                    />
                  ) : (
                    <Upload className="size-5 text-muted-foreground" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
              <div className="flex-1 space-y-2">
                <label
                  htmlFor="companyName"
                  className="text-sm font-medium text-foreground"
                >
                  Company name
                </label>
                <Input
                  id="companyName"
                  type="text"
                  placeholder="Odoo"
                  {...register("companyName")}
                  aria-invalid={errors.companyName ? "true" : undefined}
                />
                {errors.companyName && (
                  <p className="text-xs text-destructive">
                    {errors.companyName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-foreground"
              >
                Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="John doe"
                {...register("name")}
                aria-invalid={errors.name ? "true" : undefined}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="johndoe@gmail.com"
                {...register("email")}
                aria-invalid={errors.email ? "true" : undefined}
              />
              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Phone
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    {...register("phoneCode")}
                    className="h-9 w-[5.5rem] rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs appearance-none outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
                    aria-invalid={errors.phoneCode ? "true" : undefined}
                  >
                    <option value="">Code</option>
                    {countryCodes.map((cc) => (
                      <option key={cc.code} value={cc.code}>
                        {cc.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-3 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <Input
                    type="tel"
                    placeholder="98765 43210"
                    {...register("phoneNumber")}
                    aria-invalid={errors.phoneNumber ? "true" : undefined}
                  />
                </div>
              </div>
              {(errors.phoneCode || errors.phoneNumber) && (
                <p className="text-xs text-destructive">
                  {errors.phoneCode?.message || errors.phoneNumber?.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  className="pr-10"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  className="pr-10"
                  {...register("confirmPassword")}
                  aria-invalid={errors.confirmPassword ? "true" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
