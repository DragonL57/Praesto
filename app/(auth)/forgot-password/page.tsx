/* eslint-disable import/no-unresolved */
"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    console.log('[Forgot Password] Form submitted')
    setIsLoading(true)
    setError("")
    console.log('[Forgot Password] Email state:', email)

    try {
      console.log('[Forgot Password] Attempting to send request to /api/auth/forgot-password')
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      console.log('[Forgot Password] Response status:', response.status)
      console.log('[Forgot Password] Response headers:', response.headers)

      const data = await response.json()
      console.log('[Forgot Password] Response data:', data)

      if (response.ok) {
        console.log('[Forgot Password] Request successful')
        setIsSubmitted(true)
      } else {
        console.error('[Forgot Password] Request failed:', data.message || 'Failed to send reset email')
        setError(data.message || 'Failed to send reset email')
      }
    } catch (error) {
      console.error('[Forgot Password] Catch block error:', error)
      setError('An error occurred while sending the reset email')
    } finally {
      console.log('[Forgot Password] Finally block')
      setIsLoading(false)
    }
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
          <div className="absolute inset-0 -z-10 size-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" style={{ backgroundSize: "4rem 4rem" }} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-8 shadow-lg"
          >
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Reset your password</h1>
              <p className="text-muted-foreground">
                Enter your email and we&apos;ll send you instructions to reset your password
              </p>
            </div>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <Alert className="bg-primary/10 border-primary/20 mb-6">
                  <Check className="size-4 text-primary" />
                  <AlertTitle>Check your email</AlertTitle>
                  <AlertDescription>
                    We&apos;ve sent password reset instructions to <span className="font-medium">{email}</span>
                  </AlertDescription>
                </Alert>

                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">Didn&apos;t receive the email? Check your spam folder or</p>
                  <Button onClick={() => setIsSubmitted(false)} variant="outline" className="rounded-full">
                    Try again
                  </Button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-lg"
                  />
                </div>

                {error && (
                  <p className="text-center text-sm text-destructive">{error}</p>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-full font-medium" 
                  disabled={isLoading}
                  onClick={() => {
                    console.log('[Forgot Password Button Clicked]');
                    // Note: We are keeping the form's onSubmit for the actual submission logic.
                    // This onClick is just for immediate click feedback.
                  }}
                >
                  {isLoading ? "Sending instructions..." : "Send reset instructions"}
                  {!isLoading && <ArrowRight className="ml-2 size-4" />}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm inline-flex items-center text-primary hover:underline">
                <ArrowLeft className="mr-1 size-4" />
                Back to login
              </Link>
            </div>
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