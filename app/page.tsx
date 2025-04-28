"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const router = useRouter()

  useEffect(() => {
    // Simple redirect to the login page
    // The auth middleware will handle redirecting authenticated users to /chat
    router.push("/login")
  }, [router])

  // Return an empty div while redirecting
  return <div className="min-h-dvh"></div>
}
