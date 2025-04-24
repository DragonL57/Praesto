import { MessageSquare, Code, Search, FileText } from 'lucide-react';

const features = [
  {
    name: 'Intelligent Chat',
    description:
      'Engage in natural conversations, ask questions, and get instant assistance.',
    icon: MessageSquare,
  },
  {
    name: 'Code Generation & Assistance',
    description:
      'Generate code snippets, debug issues, and understand complex algorithms.',
    icon: Code,
  },
  {
    name: 'Web Search Integration',
    description:
      'Access up-to-date information from the web directly within your chat.',
    icon: Search,
  },
  {
    name: 'Text Analysis & Summarization',
    description:
      'Summarize long documents, analyze text sentiment, and extract key information.',
    icon: FileText,
  },
  // Add more features relevant to UniTaskAI if applicable
];

export default function Features() {
  return (
    <section className="container space-y-16 py-24 md:py-32">
      <div className="mx-auto max-w-[58rem] text-center">
        <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-5xl">
          Features Built for You
        </h2>
        <p className="mt-4 text-muted-foreground sm:text-lg">
          UniTaskAI combines multiple powerful AI capabilities into one seamless
          experience.
        </p>
      </div>
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="relative overflow-hidden rounded-lg border bg-background p-8"
          >
            <div className="flex items-center gap-4">
              <feature.icon className="h-8 w-8 text-primary" />
              <h3 className="font-bold">{feature.name}</h3>
            </div>
            <p className="mt-2 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
