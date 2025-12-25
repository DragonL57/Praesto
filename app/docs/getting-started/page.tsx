import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Getting Started | UniTaskAI Documentation",
  description: "Learn how to get started with UniTaskAI",
}

export default function GettingStarted() {
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-4xl font-bold">Getting Started</h1>
      <p className="mb-4">
        This is the placeholder for the Getting Started section of UniTaskAI documentation.
      </p>
      
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Setting up your account</h2>
      <p className="mb-4">
        Placeholder content for account setup instructions.
      </p>
      
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Your first conversation</h2>
      <p className="mb-4">
        Placeholder content for starting your first conversation with UniTaskAI.
      </p>
    </main>
  )
}