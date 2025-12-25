import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About UniTaskAI | Documentation",
  description: "Learn about UniTaskAI's vision, the problems it solves, and what makes it unique.",
}

export default function About() {
  return (
    <main className="mx-auto max-w-3xl prose prose-neutral dark:prose-invert">
      {/* Header Section */}
      <section className="mb-16 text-center">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">UniTaskAI</h1>
        <p className="text-2xl font-medium text-muted-foreground mb-2">The Intelligent, Action-Oriented AI Assistant</p>
        <p className="text-md text-muted-foreground">We&apos;re on a mission to make AI a practical, empowering tool for everyone.</p>
      </section>
      
      {/* Vision Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold mb-8 pb-3 border-b text-center">Our Vision</h2>
        <div className="p-6 border-l-4 border-primary bg-primary/5 rounded-r-md mb-8">
          <p className="text-xl italic text-foreground">
            Transforming AI from conversation to meaningful action, accessible to everyone.
          </p>
        </div>
        <p className="mb-8 text-lg text-center">
          UniTaskAI redefines AI assistance by focusing on tangible results. We believe AI should be a powerful, practical partner that helps you accomplish real tasks efficiently and autonomously.
        </p>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { title: "Intelligent & Practical", description: "Solves complex problems with contextual understanding and versatile tools." },
            { title: "Accessible & Affordable", description: "Brings powerful AI capabilities to users of all backgrounds, without breaking the bank." },
            { title: "Integrated & Seamless", description: "Fits naturally into your existing workflows with minimal disruption." },
            { title: "Efficient & Autonomous", description: "Takes initiative to complete tasks with minimal guidance, saving you time." },
          ].map((item) => (
            <div key={item.title} className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* The AI Capability Gap Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold mb-8 pb-3 border-b text-center">The AI Capability Gap</h2>
        <p className="mb-8 text-lg text-center">
          Today&apos;s AI market often forces a difficult choice. UniTaskAI bridges this divide:
        </p>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="p-6 rounded-xl border bg-card shadow-sm">
            <h3 className="text-2xl font-semibold mb-3 text-center">Basic AI Chatbots</h3>
            <p className="mb-3 text-center text-muted-foreground text-sm">e.g., ChatGPT, Gemini</p>
            <p className="mb-4 text-sm">
              Great for conversation, but often fall short for complex, real-world tasks due to:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Limited tool integration for autonomous actions.",
                "Costly subscriptions ($20+/month) becoming a barrier.",
                "Focus on Q&A over independent task completion."
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-1 shrink-0">✘</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="p-6 rounded-xl border bg-card shadow-sm">
            <h3 className="text-2xl font-semibold mb-3 text-center">Specialized Agent Platforms</h3>
            <p className="mb-3 text-center text-muted-foreground text-sm">e.g., Manus AI</p>
            <p className="mb-4 text-sm">
              Powerful automation, but typically inaccessible for everyday users because of:
            </p>
            <ul className="space-y-2 list-none pl-0">
              {[
                "Prohibitively high per-task or premium pricing.",
                "Steep learning curves and complex interfaces.",
                "Being overkill for many common professional or student tasks."
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="text-red-500 mt-1 shrink-0">✘</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="mt-8 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg text-center shadow">
          <h3 className="text-xl font-semibold mb-2">UniTaskAI: Bridging the Gap</h3>
          <p className="font-medium text-primary/90">
            UniTaskAI delivers advanced, tool-using AI capabilities at an affordable price, making truly practical AI assistance accessible to everyone.
          </p>
        </div>
      </section>
      
      {/* Solution Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold mb-8 pb-3 border-b text-center">Our Solution: UniTaskAI - The Accessible Agent</h2>
        <p className="mb-8 text-lg text-center">
          UniTaskAI combines powerful AI models with a suite of practical, autonomous tools. We help you accomplish real tasks, all at a price point that makes sense for everyday use.
        </p>
        
        <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-6 text-center">Integrated Tool Ecosystem</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: "Information Access", description: "Finds answers from the web in real-time, eliminating app switching." },
              { title: "Context Awareness", description: "Provides location-specific info like weather and local data." },
              { title: "Content Creation", description: "Creates and manages documents, code, and visualizations via our Artifact system." }
            ].map(tool => (
              <div key={tool.title} className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-semibold text-lg mb-2">{tool.title}</h4>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        <p className="text-center text-muted-foreground">
          Our modern interface (Next.js & shadcn/ui) offers an intuitive experience. UniTaskAI proactively suggests and uses the right tools, helping you achieve more with less effort.
        </p>
      </section>
      
      {/* Value Proposition Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold mb-8 pb-3 border-b text-center">Why Choose UniTaskAI?</h2>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          {[
            { title: "Tool-Powered Assistant", description: "Goes beyond chat to complete real tasks with autonomous tools.", icon: <BrainCircuitIcon /> },
            { title: "Flexible Intelligence", description: "Choose from multiple AI models and personas to match your specific needs.", icon: <PuzzleIcon /> },
            { title: "Artifact System", description: "Our innovative approach to organizing and displaying complex outputs with clarity.", icon: <ComponentIcon /> },
            { title: "Affordability", description: "Advanced AI capabilities at a fraction of the cost of premium subscriptions and specialized agents.", icon: <TagIcon /> }
          ].map(prop => (
            <div key={prop.title} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="mt-1 size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {prop.icon}
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{prop.title}</h3>
                <p className="text-sm text-muted-foreground">{prop.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Target Audience Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-semibold mb-8 pb-3 border-b text-center">Who We Built UniTaskAI For</h2>
        <p className="mb-8 text-lg text-center">
          UniTaskAI is designed for anyone who needs powerful, practical AI assistance without the excessive costs or complexity:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Students", description: "For research, writing aid, and learning support, all affordably." },
            { title: "Educators", description: "To streamline administrative tasks and create engaging learning materials." },
            { title: "Developers", description: "To assist with coding, debugging, and documentation, boosting productivity." },
            { title: "Professionals", description: "To automate routine tasks, analyze data, and enhance daily workflow efficiency." },
            { title: "Small Businesses", description: "For content creation, customer support, and operational improvements without high overheads." },
            { title: "Knowledge Workers", description: "Who require intelligent assistance with research, summarization, and information processing." }
          ].map(audience => (
            <div key={audience.title} className="p-6 rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-lg mb-2">{audience.title}</h3>
              <p className="text-sm text-muted-foreground">{audience.description}</p>
            </div>
          ))}
        </div>
      </section>
      
      {/* Closing Section */}
      <section className="text-center py-12 my-8 bg-gradient-to-r from-primary/80 via-primary to-primary/80 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold mb-4 text-primary-foreground">Experience AI That Does More Than Just Talk.</h2>
        <p className="text-xl text-primary-foreground/80">
          UniTaskAI: Practical AI power that works for everyone.
        </p>
        {/* Optional: Add a button here if you want a CTA, e.g., to a demo or signup */}
        {/* <button className="mt-6 px-6 py-2 bg-background text-primary rounded-md font-semibold hover:bg-background/90 transition-colors">Get Started</button> */}
      </section>
    </main>
  )
}

// Helper components for icons (replace with actual imports or definitions if you have them)
// These are placeholders to make the code runnable. 
// You should use your actual icon components (e.g., from lucide-react)

const BrainCircuitIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 5.58 2.5 2.5 0 0 0 2.96 3.08 2.5 2.5 0 0 0 4.91.05L12 20V4.5Z"/><path d="M16 8V5c0-1.1.9-2 2-2"/><path d="M12 13h4"/><path d="M12 18h6a2 2 0 0 1 2 2v1"/><path d="M12 8h8a2 2 0 0 0 2-2V5"/></svg>;
const PuzzleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.743-.95l.235-1.86a1.118 1.118 0 0 0-1.11-1.27h-3.13c-.51 0-.948.36-1.05.857l-.099.498a1.054 1.054 0 0 1-1.007.845 1.12 1.12 0 0 1-1.045-.743l-.888-2.665a1.117 1.117 0 0 0-1.058-.744 1.116 1.116 0 0 0-1.058.744l-.888 2.665a1.12 1.12 0 0 1-1.045.743 1.054 1.054 0 0 1-1.007-.845l-.1-.498a1.12 1.12 0 0 0-1.05-.857H2.87A1.118 1.118 0 0 0 1.76 13.6l.235 1.86c.059.47-.273.88-.743.95a.979.979 0 0 1-.837-.276L.804 14.523c-.47-.47-.706-1.087-.706-1.704s.235-1.233.706-1.704l1.568-1.568a1.112 1.112 0 0 0 .29-.878c-.05-.322-.248-.619-.533-.769L1.22 7.4a1.111 1.111 0 0 1-.412-1.5l.5-.867a1.12 1.12 0 0 1 1.5-.413l.961.5a1.12 1.12 0 0 0 1.554-.43l.588-1.036a1.12 1.12 0 0 1 1.517-.425l.848.495c.331.193.73.196 1.064.007l.932-.518a1.12 1.12 0 0 1 1.517.425l.588 1.036a1.12 1.12 0 0 0 1.554.43l.961-.5a1.119 1.119 0 0 1 1.5.413l.5.867a1.112 1.112 0 0 1-.412 1.5l-.909.5c-.285.157-.483.454-.533.776Z"/></svg>;
const ComponentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z"/><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z"/><path d="m18.5 8.5 3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5Z"/><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z"/></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a1.994 1.994 0 0 0 2.827 0l7.072-7.072a2 2 0 0 0 0-2.827l-8.703-8.705Z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>;