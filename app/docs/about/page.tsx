import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About UniTaskAI | Documentation",
  description: "Learn about UniTaskAI's vision and what makes it unique",
}

export default function About() {
  return (
    <main className="mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
      {/* Header Section */}
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">UniTaskAI</h1>
        <p className="text-xl font-medium text-muted-foreground">The Intelligent, Action-Oriented AI Assistant</p>
      </section>
      
      {/* Vision Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b">Our Vision</h2>
        <div className="pl-4 border-l-4 border-primary mb-6">
          <p className="text-lg italic">
            Transforming AI from conversation to meaningful action, accessible to everyone.
          </p>
        </div>
        <p className="mb-4">
          UniTaskAI redefines AI assistance by focusing on tangible results rather than just conversation. 
          We believe AI should be a practical tool that helps you accomplish real tasks efficiently.
        </p>
        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium mb-2">Intelligent & Practical</p>
            <p className="text-sm">Solves complex problems with contextual understanding and practical tools</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium mb-2">Accessible & Affordable</p>
            <p className="text-sm">Brings powerful AI capabilities to users of all economic backgrounds</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium mb-2">Integrated & Seamless</p>
            <p className="text-sm">Fits naturally into your existing workflows with minimal disruption</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium mb-2">Efficient & Autonomous</p>
            <p className="text-sm">Takes initiative to complete tasks with minimal guidance required</p>
          </div>
        </div>
      </section>
      
      {/* Market Analysis Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b">The AI Capability Gap</h2>
        <p className="mb-6">
          Today&apos;s AI market presents users with a clear dilemma that UniTaskAI is designed to solve:
        </p>
        
        <div className="space-y-8">
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-medium mb-3">Basic AI Chatbots</h3>
            <p className="mb-3 text-muted-foreground text-sm">Examples: ChatGPT, Gemini, DeepSeek</p>
            <p className="mb-4">
              These platforms excel at conversation but have important limitations for practical use:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <p className="text-sm">Limited ability to use tools for complex tasks without human intervention</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <p className="text-sm">Subscription costs ($20+/month) create barriers for many users, particularly in regions like ASEAN</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <p className="text-sm">Primarily focused on answering questions rather than completing tasks autonomously</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 rounded-lg border">
            <h3 className="text-xl font-medium mb-3">Specialized Agent Platforms</h3>
            <p className="mb-3 text-muted-foreground text-sm">Examples: Manus AI</p>
            <p className="mb-4">
              While these platforms offer impressive automation capabilities, they remain inaccessible to most users:
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <p className="text-sm">High costs with per-task pricing models that quickly become expensive</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <p className="text-sm">Complex interfaces that require significant learning investment</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-500">•</span>
                <p className="text-sm">Too expensive for regular use by students, educators, and average professionals</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="font-medium">
            UniTaskAI addresses this gap by providing advanced, tool-using AI capabilities at an affordable price point, 
            making practical AI assistance accessible to everyone.
          </p>
        </div>
      </section>
      
      {/* Solution Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b">Our Solution</h2>
        <h3 className="text-2xl font-medium mb-4">UniTaskAI: The Accessible Agent</h3>
        
        <p className="mb-6">
          UniTaskAI bridges the capability gap by combining powerful AI models with practical tools that work autonomously
          to help you accomplish real tasks, all at a price point that makes sense for everyday use.
        </p>
        
        <div className="mb-8">
          <h4 className="text-lg font-medium mb-3">Integrated Tool Ecosystem</h4>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Information Access</h5>
              <p className="text-sm">Finds answers from the web in real-time, eliminating the need to switch between apps</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Context Awareness</h5>
              <p className="text-sm">Provides location-specific information including weather forecasts and local data</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <h5 className="font-medium mb-2">Content Creation</h5>
              <p className="text-sm">Creates and manages documents, code, and visualizations through our Artifact system</p>
            </div>
          </div>
        </div>
        
        <p>
          Our modern interface built with Next.js and shadcn/ui provides an intuitive experience that feels natural and responsive.
          UniTaskAI takes initiative to suggest and use the right tools at the right time, helping you accomplish more with less effort.
        </p>
      </section>
      
      {/* Value Proposition Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b">Why Choose UniTaskAI</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit"><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z"/><path d="M16 8V5c0-1.1.9-2 2-2"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8a2 2 0 0 0 2-2V5"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Tool-Powered Assistant</h3>
                <p className="text-sm text-muted-foreground">Goes beyond chat to complete real tasks with autonomous tools</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-puzzle"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.743-.95l.235-1.86a1.118 1.118 0 0 0-1.11-1.27h-3.13c-.51 0-.948.36-1.05.857l-.099.498a1.054 1.054 0 0 1-1.007.845 1.12 1.12 0 0 1-1.045-.743l-.888-2.665a1.117 1.117 0 0 0-1.058-.744 1.116 1.116 0 0 0-1.058.744l-.888 2.665a1.12 1.12 0 0 1-1.045.743 1.054 1.054 0 0 1-1.007-.845l-.1-.498a1.12 1.12 0 0 0-1.05-.857H2.87A1.118 1.118 0 0 0 1.76 13.6l.235 1.86c.059.47-.273.88-.743.95a.979.979 0 0 1-.837-.276L.804 14.523c-.47-.47-.706-1.087-.706-1.704s.235-1.233.706-1.704l1.568-1.568a1.112 1.112 0 0 0 .29-.878c-.05-.322-.248-.619-.533-.769L1.22 7.4a1.111 1.111 0 0 1-.412-1.5l.5-.867a1.12 1.12 0 0 1 1.5-.413l.961.5a1.12 1.12 0 0 0 1.554-.43l.588-1.036a1.12 1.12 0 0 1 1.517-.425l.848.495c.331.193.73.196 1.064.007l.932-.518a1.12 1.12 0 0 1 1.517.425l.588 1.036a1.12 1.12 0 0 0 1.554.43l.961-.5a1.119 1.119 0 0 1 1.5.413l.5.867a1.112 1.112 0 0 1-.412 1.5l-.909.5c-.285.157-.483.454-.533.776Z"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Flexible Intelligence</h3>
                <p className="text-sm text-muted-foreground">Choose from multiple AI models and personas to match your specific needs</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-component"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/><path d="m18.5 8.5 3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Artifact System</h3>
                <p className="text-sm text-muted-foreground">Our innovative approach to organizing and displaying complex outputs with clarity</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-tag"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a1.994 1.994 0 0 0 2.827 0l7.072-7.072a2 2 0 0 0 0-2.827l-8.703-8.705Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
              </div>
              <div>
                <h3 className="font-medium">Affordability</h3>
                <p className="text-sm text-muted-foreground">Advanced AI capabilities at a fraction of the cost of premium subscriptions and specialized agents</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Target Audience Section */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 pb-2 border-b">Who We Built UniTaskAI For</h2>
        <p className="mb-6">
          UniTaskAI is designed for people who need powerful AI assistance in their daily lives without excessive costs:
        </p>
        <ul className="grid md:grid-cols-3 gap-4 mb-8">
          <li className="p-4 bg-muted/30 rounded-lg">
            <p className="font-medium mb-1">Students</p>
            <p className="text-sm">Who need research assistance, writing help, and learning support at an affordable price</p>
          </li>
          <li className="p-4 bg-muted/30 rounded-lg">
            <p className="font-medium mb-1">Professionals</p>
            <p className="text-sm">Looking to automate routine tasks and enhance productivity in their daily workflow</p>
          </li>
          <li className="p-4 bg-muted/30 rounded-lg">
            <p className="font-medium mb-1">Knowledge Workers</p>
            <p className="text-sm">Who require intelligent assistance with research, content creation, and information processing</p>
          </li>
        </ul>
      </section>
      
      {/* Closing Section */}
      <section className="text-center mb-8 p-6 bg-primary/5 rounded-lg">
        <p className="text-lg font-medium mb-2">
          Experience AI that does more than just talk.
        </p>
        <p className="text-sm text-muted-foreground">
          UniTaskAI: Practical AI power that works for everyone.
        </p>
      </section>
    </main>
  )
}