"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section className="w-full py-20 md:py-32 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)_/_4rem_4rem]" />
      <div className="absolute -top-24 -left-24 size-64 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 size-64 bg-white/10 rounded-full blur-3xl" />

      <div className="container px-4 md:px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-6 text-center"
        >
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium mb-2">
            <Zap className="size-4" />
            <span>AI-Powered Productivity</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Your AI Productivity Revolution Starts Here
          </h2>
          <p className="mx-auto max-w-[700px] text-primary-foreground/80 md:text-xl">
            Join thousands of professionals who are saving 20+ hours weekly with UniTaskAI. 
            Write content, generate code, analyze data, and automate tasks—all through simple conversation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Link href="/register" passHref>
              <Button size="lg" variant="secondary" className="rounded-full h-12 px-8 text-base">
                Try UniTaskAI Free
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/chat" passHref>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full h-12 px-8 text-base bg-transparent border-white text-white hover:bg-white/10"
              >
                Experience the AI
              </Button>
            </Link>
          </div>
          <p className="text-sm text-primary-foreground/80 mt-4">
            No credit card required. Unlimited AI chats. Start creating immediately.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
