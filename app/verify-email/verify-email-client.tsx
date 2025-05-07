'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Check, AlertCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const verify = async () => {
      const token = searchParams.get('token')
      const email = searchParams.get('email')

      if (!token || !email) {
        setError('Missing verification token or email. Please use the link provided in your email.')
        setIsVerifying(false)
        return
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, token }),
        })

        const data = await response.json()

        if (response.ok) {
          setIsSuccess(true)
          // Optional: Redirect after a short delay
          setTimeout(() => {
            router.push('/login?verified=success') // Redirect to login page
          }, 3000);
        } else {
          setError(data.message || 'Failed to verify email. The link may be invalid or expired.')
        }
      } catch (err) {
        setError('An error occurred during verification.')
        console.error('Error verifying email:', err)
      } finally {
        setIsVerifying(false)
      }
    }

    verify()
  }, [searchParams, router]) // Added router to dependency array as it's used in setTimeout

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-background/80 backdrop-blur-lg border border-border/40 rounded-2xl p-8 shadow-lg w-full max-w-md text-center"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-2">Email Verification</h1>
      </div>

      {isVerifying && (
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your email...</p>
        </div>
      )}

      {isSuccess && !isVerifying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <Alert className="bg-primary/10 border-primary/20 text-left">
            <Check className="size-4 text-primary" />
            <AlertTitle>Email Verified Successfully!</AlertTitle>
            <AlertDescription>
              Your email address has been verified. Redirecting to login...
            </AlertDescription>
          </Alert>
          <Button asChild className="w-full rounded-full">
            <Link href="/login">Go to Login</Link>
          </Button>
        </motion.div>
      )}

      {error && !isVerifying && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Verification Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button asChild className="w-full rounded-full">
            <Link href="/login">Back to Login</Link>
          </Button>
           {/* Optional: Add a button to request a new verification email */}
        </motion.div>
      )}
    </motion.div>
  )
} 