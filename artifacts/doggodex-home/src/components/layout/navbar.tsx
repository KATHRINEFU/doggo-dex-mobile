import { Link } from 'wouter';
import { PawPrint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/images/logo.png';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95" data-testid="link-home-logo">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden shadow-sm">
            <img src={logoImage} alt="Doggo Dex logo" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-foreground">Doggo Dex</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link href="/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          <Button 
            className="rounded-full px-6 font-semibold shadow-sm hover:shadow-md transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
            data-testid="button-download-nav"
            onClick={() => alert('App Store link coming soon!')}
          >
            <PawPrint className="w-4 h-4 mr-2" />
            Get the App
          </Button>
        </div>
      </div>
    </header>
  );
}
