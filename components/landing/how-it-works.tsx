"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

const steps = [
  {
    step: "01",
    title: "Start a Conversation",
    description: "Simply tell UniTaskAI what you need in plain language – from writing content to generating code or analyzing data.",
  },
  {
    step: "02",
    title: "Get AI-Generated Results",
    description: "Watch as our advanced AI instantly creates high-quality content, functional code, or insightful analytics based on your request.",
  },
  {
    step: "03",
    title: "Edit & Export",
    description: "Refine the results with follow-up prompts, then export to your preferred format or integrate directly with your workflow.",
  },
]

export function HowItWorks() {
  return (
    <section className="w-full py-20 md:py-32 bg-muted/30 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 size-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)_/_4rem_4rem] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)_/_4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]"></div>

      <div className="container px-4 md:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
        >
          <Badge className="rounded-full px-4 py-1.5 text-sm font-medium" variant="secondary">
            Your AI Workflow
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">From Prompt to Perfect in Minutes</h2>
          <p className="max-w-[800px] text-muted-foreground md:text-lg">
            UniTaskAI transforms complex tasks into simple conversations. No technical expertise required – just describe what you need and watch it happen.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-12 relative">
          <div className="hidden md:block absolute top-1/2 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -translate-y-1/2 z-0"></div>

          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative z-10 flex flex-col items-center text-center space-y-4"
            >
              <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold shadow-lg">
                {step.step}
              </div>
              <h3 className="text-xl font-bold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
