/* eslint-disable import/no-unresolved */
"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState, startTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/toast"
import { ThemeToggle } from "@/components/theme-toggle"
import { login, type LoginActionState } from "../actions"

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [isSuccessful, setIsSuccessful] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Load saved email if it exists
  useEffect(() => {
    const savedEmail = localStorage.getItem("unitaskai_remembered_email")
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  )

  useEffect(() => {
    if (state.status === "user_not_found") {
      toast({
        type: "error",
        description: state.message || "No account found. Please register first.",
      })
      setIsLoading(false)
    } else if (state.status === "wrong_password") {
      toast({
        type: "error",
        description: state.message || "Incorrect password. Please try again.",
      })
      setIsLoading(false)
    } else if (state.status === "failed") {
      toast({
        type: "error",
        description: state.message || "Failed to sign in. Please try again.",
      })
      setIsLoading(false)
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: state.message || "Invalid email or password format.",
      })
      setIsLoading(false)
    } else if (state.status === "success") {
      // Save email to localStorage if "Remember me" is checked
      if (rememberMe) {
        localStorage.setItem("unitaskai_remembered_email", email)
      } else {
        localStorage.removeItem("unitaskai_remembered_email")
      }
      
      setIsSuccessful(true)
      router.refresh()
      // Redirect to /chat after successful login
      setTimeout(() => {
        router.push("/chat")
      }, 500) // Small delay to allow refresh to complete
    }
  }, [state.status, state.message, router, rememberMe, email])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    const formData = new FormData(e.currentTarget)
    const emailValue = formData.get("email") as string
    setEmail(emailValue)
    
    // Add remember_me to the form data
    formData.append("remember_me", rememberMe.toString())
    
    // Wrap formAction in startTransition
    startTransition(() => {
      formAction(formData)
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
                    <h1 className="text-2xl font-bold">Welcome back</h1>
                    <p className="text-balance text-muted-foreground">Login to your UniTaskAI account</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      placeholder="m@example.com" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                      <Link href="/forgot-password" className="ml-auto text-sm text-muted-foreground hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        name="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••" 
                        required 
                      />
                      <button 
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <line x1="2" x2="22" y1="2" y2="22" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || isSuccessful}>
                    {isLoading ? "Signing in..." : isSuccessful ? "Signed in!" : "Login"}
                  </Button>
                  <div className="text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="underline underline-offset-4">
                      Sign up
                    </Link>
                  </div>
                </div>
              </form>
              <div className="relative hidden bg-muted md:block">
                <Image
                  src="/UniTaskAI_logo.png"
                  alt="UniTaskAI Decorative Background"
                  fill
                  className="object-cover size-full dark:brightness-[0.2] dark:grayscale"
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
