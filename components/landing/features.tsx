'use client';

import { motion } from 'framer-motion';
import {
  Code,
  FileText,
  Database,
  Zap,
  MessageSquare,
  Lightbulb,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const featuresData = [
  {
    title: 'AI Content Creation',
    description:
      'Generate high-quality blog posts, marketing copy, emails, and creative content in seconds with advanced AI assistance.',
    icon: <FileText className="size-5" />,
  },
  {
    title: 'Code Generation',
    description:
      'Turn your ideas into working code across multiple programming languages with intelligent code snippets and explanations.',
    icon: <Code className="size-5" />,
  },
  {
    title: 'Data Analysis',
    description:
      'Extract insights from your data with AI-powered charts, trends identification, and natural language queries.',
    icon: <Database className="size-5" />,
  },
  {
    title: 'Task Automation',
    description:
      'Automate repetitive workflows and processes with no-code AI solutions that save time and reduce errors.',
    icon: <Zap className="size-5" />,
  },
  {
    title: 'Smart Chat Interface',
    description:
      'Engage with our advanced AI through a conversational interface that understands context and remembers your preferences.',
    icon: <MessageSquare className="size-5" />,
  },
  {
    title: 'Idea Generation',
    description:
      'Overcome creative blocks with AI-powered brainstorming for new business ideas, strategies, and solutions.',
    icon: <Lightbulb className="size-5" />,
  },
];

export function Features() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <section id="features" className="w-full py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
        >
          <Badge
            className="rounded-full px-4 py-1.5 text-sm font-medium"
            variant="secondary"
          >
            AI Superpowers
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            One AI, Unlimited Possibilities
          </h2>
          <p className="max-w-[800px] text-muted-foreground md:text-lg">
            UniTaskAI transforms how you work with AI-powered tools that adapt
            to your needs. Whether you&apos;re drafting content, coding, or
            analyzing data, our platform amplifies your capabilities.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {featuresData.map((feature) => (
            <motion.div key={`feature-${feature.title}`} variants={item}>
              <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-md hover:border-primary/20">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="size-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
