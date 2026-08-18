import { Link } from 'wouter';
import { Mail, MapPin } from 'lucide-react';
import logoImage from '@/assets/images/logo.png';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-slate-950 text-slate-200 py-12 md:py-16 border-t border-slate-800">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 inline-flex" data-testid="link-footer-logo">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center overflow-hidden">
                <img src={logoImage} alt="Doggo Dex logo" className="w-full h-full object-cover" />
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-white">Doggo Dex</span>
            </Link>
            <p className="text-slate-400 max-w-sm mt-4 text-sm md:text-base leading-relaxed">
              Every walk is an adventure. Point your camera, collect the breed, and build the ultimate Doggo Dex.
            </p>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-lg text-white">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-privacy">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors text-sm opacity-50 cursor-not-allowed" aria-disabled="true">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-display font-semibold text-lg text-white">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a href="mailto:yuehaofu208@gmail.com" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm" data-testid="link-footer-email">
                  <Mail className="w-4 h-4" />
                  <span>contact: yuehaofu208@gmail.com</span>
                </a>
              </li>
              <li className="flex items-start gap-2 text-slate-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Made for dog lovers everywhere.</span>
              </li>
            </ul>
          </div>
          
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <p>© {currentYear} Doggo Dex. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Powered by on-device AI.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
