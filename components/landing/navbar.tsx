import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react'; // Placeholder icon

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold">UniTaskAI</span>
        </Link>
        {/* Restored flex-1 and added placeholder links to match template structure */}
        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          <Link href="/about" className="transition-colors hover:text-primary">
            About
          </Link>
          {/* Placeholder Link 1 */}
          <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            Placeholder 1
          </Link>
          {/* Placeholder Link 2 */}
          <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            Placeholder 2
          </Link>
        </nav>
        {/* Added placeholder buttons to match template structure */}
        <div className="flex items-center space-x-4">
          {/* Placeholder Icon Button */}
          <Button variant="ghost" size="icon" disabled>
            <Github className="h-4 w-4" />{' '}
            {/* Using Github as placeholder icon */}
            <span className="sr-only">Placeholder Icon</span>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Sign Up</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
