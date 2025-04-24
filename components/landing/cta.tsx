import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CTA() {
  return (
    <section className="border-t">
      <div className="container flex flex-col items-center gap-4 py-24 text-center md:py-32">
        <h2 className="font-bold text-3xl leading-[1.1] sm:text-3xl md:text-5xl">
          Ready to boost your productivity?
        </h2>
        <p className="max-w-2xl leading-normal text-muted-foreground sm:text-xl sm:leading-8">
          Sign up for UniTaskAI today and experience the power of an integrated
          AI assistant. Get started for free.
        </p>
        <Button size="lg" className="mt-4" asChild>
          <Link href="/register">Get Started Today</Link>
        </Button>
      </div>
    </section>
  );
}
