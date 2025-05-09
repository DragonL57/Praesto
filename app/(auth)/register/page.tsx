/* eslint-disable import/no-unresolved */
"use client"

import { useState, useEffect, useActionState, startTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/toast"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { register, type RegisterActionState } from "../actions"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccessful, setIsSuccessful] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    }
  )

  useEffect(() => {
    if (state.status === "user_exists") {
      toast({ 
        type: "error", 
        description: state.message || "Account already exists!" 
      })
      setIsLoading(false)
    } else if (state.status === "failed") {
      toast({ 
        type: "error", 
        description: state.message || "Failed to create account!" 
      })
      setIsLoading(false)
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: state.message || "Please check your email and password requirements.",
      })
      setIsLoading(false)
    } else if (state.status === "verification_email_sent") {
      toast({ 
        type: "success", 
        description: state.message || "Account created! Please check your email to verify."
      });
      setIsLoading(false);
      setIsSuccessful(true);
      router.refresh();
      // Redirect to /login after successful registration and verification email sent
      setTimeout(() => {
        router.push("/login"); 
      }, 1500); // Allow time for user to see the toast
    }
  }, [state, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const data = new FormData()
    data.append("email", formData.email)
    data.append("password", formData.password)
    
    startTransition(() => {
      formAction(data)
    })
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <Image
                        src="/UniTaskAI_logo.png"
                        alt="UniTaskAI Logo"
                        width={60}
                        height={60}
                        priority
                      />
                    </div>
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-balance text-muted-foreground">Sign up to get started with UniTaskAI</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <TooltipProvider delayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button 
                              type="button" 
                              className="ml-1.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M12 16v-4"></path>
                                <path d="M12 8h.01"></path>
                              </svg>
                              <span className="sr-only">Password requirements</span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="right" 
                            className={cn(
                              "max-w-xs text-sm",
                              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
                              "data-[state=open]:animate-none"
                            )}
                          >
                            <p className="font-semibold mb-1">Password must contain:</p>
                            <ul className="list-disc list-inside space-y-1">
                              <li>At least 8 characters</li>
                              <li>At least one lowercase letter</li>
                              <li>At least one number</li>
                            </ul>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                            <line x1="2" x2="22" y1="2" y2="22"></line>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || isSuccessful}>
                    {isLoading ? "Creating account..." : isSuccessful ? "Account created!" : "Sign up"}
                  </Button>
                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link href="/login" className="underline underline-offset-4">
                      Sign in
                    </Link>
                  </div>
                </div>
              </form>
              <div className="relative hidden bg-muted md:block">
                <Image
                  src="/UniTaskAI_logo.png"
                  alt="UniTaskAI Decorative Background"
                  fill
                  className="object-cover size-full dark:brightness-[0.2] dark:grayscale rounded-none"
                  priority
                />
              </div>
            </CardContent>
          </Card>
          <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
            By clicking continue, you agree to our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </div>
        </div>
      </div>
      
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  )
}
