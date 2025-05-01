import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Tools & Capabilities | UniTaskAI Documentation",
  description: "Explore the tools and capabilities of UniTaskAI",
}

export default function Tools() {
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-4xl font-bold">Tools & Capabilities</h1>
      <p className="mb-4">
        This is the placeholder for the Tools & Capabilities section of UniTaskAI documentation.
      </p>
      
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Web Search</h2>
      <p className="mb-4">
        Placeholder content for web search functionality.
      </p>
      
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Weather Information</h2>
      <p className="mb-4">
        Placeholder content for weather information functionality.
      </p>
      
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Document Handling</h2>
      <p className="mb-4">
        Placeholder content for document handling capabilities.
      </p>
      
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Artifact System</h2>
      <p className="mb-4">
        Placeholder content for the artifact system.
      </p>
    </main>
  )
}