'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const testimonialsData = [
  {
    quote:
      'UniTaskAI has transformed our content strategy. We create blog posts and marketing emails in minutes that used to take our team days. The quality is consistently impressive.',
    author: 'Sarah Johnson',
    role: 'Content Marketing Manager, TechGrowth',
    rating: 5,
  },
  {
    quote:
      'As a developer, I was skeptical about AI coding tools, but UniTaskAI has become my secret weapon. It helps me prototype faster and solves bugs that would have taken hours to track down.',
    author: 'Michael Chen',
    role: 'Senior Developer, CodeStack',
    rating: 5,
  },
  {
    quote:
      'The data analysis capabilities are incredible. We can ask questions about our metrics in plain English and get instant visualizations and insights. Game-changer for our quarterly reports.',
    author: 'Emily Rodriguez',
    role: 'Data Analyst, InsightFlow',
    rating: 5,
  },
  {
    quote:
      'As a solopreneur, UniTaskAI feels like having a full team at my fingertips. I use it for everything from drafting proposals to building landing pages and analyzing customer feedback.',
    author: 'David Kim',
    role: 'Founder, LaunchPad',
    rating: 5,
  },
  {
    quote:
      "Our creative team uses UniTaskAI for brainstorming sessions. The ideas it generates have led to some of our most successful campaigns. It's like having an extra creative director.",
    author: 'Lisa Patel',
    role: 'Creative Director, Spark Agency',
    rating: 5,
  },
  {
    quote:
      'UniTaskAI has reduced our research time by 70%. Whether we need market analysis or competitive insights, the AI delivers high-quality information that we can trust and act on.',
    author: 'James Wilson',
    role: 'Strategy Consultant, FutureEdge',
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="w-full py-20 md:py-32">
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
            Success Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            AI That Delivers Results
          </h2>
          <p className="max-w-[800px] text-muted-foreground md:text-lg">
            See how professionals across industries are using UniTaskAI to
            transform their work and achieve more in less time.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonialsData.map((testimonial, i) => (
            <motion.div
              key={`testimonial-${testimonial.author}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
            >
              <Card className="h-full overflow-hidden border-border/40 bg-gradient-to-b from-background to-muted/10 backdrop-blur transition-all hover:shadow-md">
                <CardContent className="p-6 flex flex-col h-full">
                  <div className="flex mb-4">
                    {Array(testimonial.rating)
                      .fill(0)
                      .map((_, j) => (
                        <Star
                          key={`star-${testimonial.author}-${j}`}
                          className="size-4 text-yellow-500 fill-yellow-500"
                        />
                      ))}
                  </div>
                  <p className="text-lg mb-6 grow">{testimonial.quote}</p>
                  <div className="flex items-center gap-4 mt-auto pt-4 border-t border-border/40">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center text-foreground font-medium">
                      {testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
