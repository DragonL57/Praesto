/* eslint-disable import/no-unresolved */
"use client"

import { useState, useEffect, useActionState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ThemeToggle } from "@/components/theme-toggle"
import { toast } from "@/components/toast"

import { register, type RegisterActionState } from "../actions"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccessful, setIsSuccessful] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    company: "",
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
    } else if (state.status === "success") {
      toast({ type: "success", description: "Account created successfully!" })
      setIsSuccessful(true)
      router.refresh()
      // Redirect to /chat after successful registration
      setTimeout(() => {
        router.push("/chat")
      }, 500) // Small delay to allow refresh to complete
    }
  }, [state, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (step === 1) {
      setStep(2)
      return
    }

    setIsLoading(true)
    
    const data = new FormData()
    data.append("email", formData.email)
    data.append("password", formData.password)
    // Name and company are collected but not required by the backend currently
    // You can extend your backend to store these additional fields if needed
    
    formAction(data)
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground">
            U
          </div>
          <span>UniTaskAI</span>
        </Link>
        <ThemeToggle />
      </div>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md px-4">
          <div className="absolute inset-0 -z-10 size-full bg-white dark:bg-black [background-image:linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:[background-image:linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-8 shadow-lg"
          >
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Create your account</h1>
              <p className="text-muted-foreground">Get started with UniTaskAI today</p>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {step > 1 ? <Check className="size-4" /> : "1"}
                  </div>
                  <div className="ml-2 text-sm font-medium">Account</div>
                </div>
                <div className="h-0.5 w-10 bg-muted"></div>
                <div className="flex items-center">
                  <div
                    className={`flex size-8 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    2
                  </div>
                  <div className="ml-2 text-sm font-medium">Details</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@example.com"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="h-12 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="h-12 rounded-lg pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    </div>
                    <div className="mt-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Password requirements:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                        <li>Be at least 6 characters long</li>
                        <li>Contain at least one lowercase letter (a-z)</li>
                        <li>Contain at least one number (0-9)</li>
                        <li>No spaces at beginning or end</li>
                        <li>Special characters are recommended for stronger security</li>
                      </ul>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="h-12 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      name="company"
                      placeholder="Your Company"
                      value={formData.company}
                      onChange={handleChange}
                      className="h-12 rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">Optional: Enter your company name if applicable</p>
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox id="terms" required />
                <Label htmlFor="terms" className="text-sm font-normal">
                  I agree to the{" "}
                  <Link href="#" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="#" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <div className="flex gap-4">
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 rounded-full font-medium"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Button>
                )}

                <Button
                  type="submit"
                  className={`${step === 1 ? "w-full" : "flex-1"} h-12 rounded-full font-medium`}
                  disabled={isLoading || isSuccessful}
                >
                  {step === 1 ? "Continue" : isLoading ? "Creating account..." : isSuccessful ? "Account created!" : "Create account"}
                  {!isLoading && !isSuccessful && <ArrowRight className="ml-2 size-4" />}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            {step === 1 && (
              <>
                <div className="relative mt-8 pt-8 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/40"></div>
                  </div>
                  <div className="relative bg-background/80 px-4 text-sm text-muted-foreground">Or continue with</div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-lg"
                    onClick={(e) => {
                      e.preventDefault()
                      toast({
                        type: "error",
                        description: "Email/password registration is currently the only supported method. Social login will be available soon."
                      })
                    }}
                  >
                    <svg className="mr-2 size-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 rounded-lg"
                    onClick={(e) => {
                      e.preventDefault()
                      toast({
                        type: "error",
                        description: "Email/password registration is currently the only supported method. Social login will be available soon."
                      })
                    }}
                  >
                    <svg className="mr-2 size-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                    Facebook
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      </main>

      <footer className="border-t bg-background/95 backdrop-blur-sm py-6">
        <div className="container flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} UniTaskAI. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
