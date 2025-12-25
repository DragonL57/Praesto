import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Introduction | UniTaskAI Documentation",
  description: "Welcome to UniTaskAI documentation site",
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-4xl font-bold">Welcome to UniTaskAI Documentation</h1>
      <p className="mb-4">
        This is the official documentation for UniTaskAI, the accessible AI assistant with powerful agent capabilities.
      </p>
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Features</h2>
      <ul className="mb-4 list-inside list-disc space-y-1">
        <li>Powerful AI models with different personas to suit your needs</li>
        <li>Integrated tools for web search, weather information, and more</li>
        <li>Document handling and creation capabilities</li>
        <li>Structured outputs through our unique Artifact system</li>
        <li>Multimodal inputs (text, images, files)</li>
        <li>Clean, intuitive user interface</li>
      </ul>
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Getting Started</h2>
      <p className="mb-4">
        To get started with UniTaskAI, navigate through the sections using the sidebar on the left.
        Here&apos;s a quick overview of the available sections:
      </p>
      <ul className="mb-4 list-inside list-disc space-y-1">
        <li>
          <strong>Getting Started</strong>: Learn how to create an account, set up your preferences, and start using UniTaskAI
        </li>
        <li>
          <strong>Tools &amp; Capabilities</strong>: Explore UniTaskAI&apos;s integrated tools and how to use them effectively
        </li>
        <li>
          <strong>Advanced Usage</strong>: Discover advanced features like personas, model selection, and multimodal inputs
        </li>
      </ul>
      <p className="mb-4">
        If you have any questions or need assistance, don&apos;t hesitate to reach out to our support team 
        or check our FAQ section for common questions and answers.
      </p>
      <h2 className="mb-4 mt-8 text-2xl font-semibold">Need Help?</h2>
      <p className="mb-4">
        We are continuously improving UniTaskAI. If you find any errors or have suggestions for improvement,
        please feel free to provide your feedback through our contact channels.
      </p>
    </main>
  )
}