import { useState, useEffect } from 'react';
import { ArrowRight, Camera, Trophy, Medal, Map, ShieldCheck, Download, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/images/poster-lifestyle-hero.jpg';
import scanImage from '@/assets/images/01-scan.jpg';
import dexImage from '@/assets/images/02-dex.jpg';
import rankImage from '@/assets/images/04-rank.jpg';

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Simple mount animation for now since we don't have framer-motion fully set up in the prompt
    // Just a nice fade-up on mount
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 px-4 md:px-6 container mx-auto flex flex-col-reverse md:flex-row items-center gap-12 md:gap-8">
        
        {/* Decorative background blob */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/50 rounded-full blur-[100px] -z-10 opacity-60 mix-blend-multiply" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-yellow-100/50 rounded-full blur-[80px] -z-10 opacity-60 mix-blend-multiply" />
        
        <div className="flex-1 space-y-8 text-center md:text-left z-10">
          <AnimatedSection delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-sm font-semibold mb-2 shadow-sm border border-sky-200">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-500" />
              <span>The ultimate dog-spotting adventure</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight">
              Make every walk a <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-700">discovery.</span>
            </h1>
          </AnimatedSection>
          
          <AnimatedSection delay={300}>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0">
              Point your camera at a dog and get a breed match in about a second. Confident matches are handled by the on-device model; harder ones get a secure cloud check. Collect every find in your Doggo Dex, grow your XP, earn badges, and climb the global ranks.
            </p>
          </AnimatedSection>
          
          <AnimatedSection delay={500} className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
            <Button 
              size="lg" 
              className="w-full sm:w-auto h-14 px-8 rounded-full text-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 bg-primary hover:bg-primary/90 text-primary-foreground group"
              onClick={() => alert('App Store link coming soon!')}
              data-testid="button-download-hero"
            >
              <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Download for iOS
            </Button>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              On-device AI first
            </p>
          </AnimatedSection>
        </div>

        <AnimatedSection delay={200} className="flex-1 relative z-10 w-full max-w-lg mx-auto">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-100 rotate-2 hover:rotate-0 transition-transform duration-500">
            <img 
              src={heroImage} 
              alt="Woman smiling at a golden retriever in the park while holding her phone" 
              className="w-full h-full object-cover"
            />
            {/* Overlay badge */}
            <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-xl flex items-center gap-4 transform -rotate-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 leading-tight">Golden Retriever Spotted!</p>
                <p className="text-sm font-medium text-emerald-600">+50 XP added to Dex</p>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </section>

      {/* Social Proof / Stats */}
      <section className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-800">
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl font-display font-bold text-sky-400">100+</p>
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Breeds to Find</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl font-display font-bold text-sky-400">&lt;1s</p>
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">On-device Scan</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl font-display font-bold text-sky-400">4</p>
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Rarity Tiers</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl md:text-4xl font-display font-bold text-sky-400">10</p>
              <p className="text-slate-400 font-medium text-sm uppercase tracking-wider">Photos Per Breed, On Device</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Scan */}
      <section className="py-24 px-4 md:px-6 container mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 relative">
          <div className="relative max-w-[300px] mx-auto">
            {/* Phone Frame mock */}
            <div className="absolute inset-0 border-[12px] border-slate-900 rounded-[2.5rem] shadow-2xl z-20 pointer-events-none"></div>
            <img 
              src={scanImage} 
              alt="App interface showing a scan of a Golden Retriever puppy with 98% match" 
              className="w-full h-auto rounded-[2.5rem] shadow-xl relative z-10"
            />
            {/* Decorative element */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 z-0 animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-sky-100 text-sky-600 mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">Point. Snap.<br/>Identified.</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            See a cute dog but don't know the breed? Just point your camera. Our on-device model identifies over 100 breeds in about a second. When it isn't confident enough, PawDex sends that photo to our secure service for a second opinion, so you still get an answer.
          </p>
          <ul className="space-y-4 pt-4">
            {[
              "Confident matches run fully on your device",
              "Low-confidence scans get a secure cloud check",
              "Real-time confidence scores"
            ].map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="font-medium text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Feature 2: Dex */}
      <section className="py-24 px-4 md:px-6 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="flex-1 relative">
            <div className="relative max-w-[300px] mx-auto">
              <div className="absolute inset-0 border-[12px] border-slate-900 rounded-[2.5rem] shadow-2xl z-20 pointer-events-none"></div>
              <img 
                src={dexImage} 
                alt="Doggo Dex collection showing collected breeds like Golden Retriever and Siberian Husky" 
                className="w-full h-auto rounded-[2.5rem] shadow-xl relative z-10"
              />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-sky-400 rounded-full mix-blend-multiply filter blur-2xl opacity-50 z-0"></div>
            </div>
          </div>
          
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 mb-2">
              <Map className="w-6 h-6" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">Build your<br/>Doggo Dex.</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Every successful scan adds a new breed to your collection. From Common Labradors to Legendary Afghan Hounds, how many can you spot in the wild?
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-3 h-3 rounded-full bg-green-500 mb-2"></div>
                <p className="font-bold text-slate-900">Common</p>
                <p className="text-sm text-slate-500">Everyday favorites</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-3 h-3 rounded-full bg-purple-500 mb-2"></div>
                <p className="font-bold text-slate-900">Rare</p>
                <p className="text-sm text-slate-500">Harder to find</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-3 h-3 rounded-full bg-blue-500 mb-2"></div>
                <p className="font-bold text-slate-900">Uncommon</p>
                <p className="text-sm text-slate-500">Keep your eyes peeled</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mb-2"></div>
                <p className="font-bold text-slate-900">Legendary</p>
                <p className="text-sm text-slate-500">The ultimate catch</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Rank */}
      <section className="py-24 px-4 md:px-6 container mx-auto flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 relative">
          <div className="relative max-w-[300px] mx-auto">
            <div className="absolute inset-0 border-[12px] border-slate-900 rounded-[2.5rem] shadow-2xl z-20 pointer-events-none"></div>
            <img 
              src={rankImage} 
              alt="Leaderboard showing top collectors worldwide" 
              className="w-full h-auto rounded-[2.5rem] shadow-xl relative z-10"
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 z-0"></div>
          </div>
        </div>
        
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-100 text-amber-600 mb-2">
            <Trophy className="w-6 h-6" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground">Climb the<br/>Leaderboard.</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Earn XP for every new scan, complete daily streaks, and unlock unique AI-generated badges. Compete with dog lovers locally and globally to become the ultimate Doggo Master.
          </p>
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Medal className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Weekly Challenges</p>
                <p className="text-sm text-slate-600">Find 5 Terriers to earn bonus XP</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Global Ranking</p>
                <p className="text-sm text-slate-600">See how you stack up worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary z-0"></div>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-900 rounded-full mix-blend-overlay filter blur-3xl opacity-30 translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="container mx-auto relative z-10 text-center max-w-3xl">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6">Ready for your next walk?</h2>
          <p className="text-xl text-sky-100 mb-10 leading-relaxed max-w-2xl mx-auto">
            Join thousands of dog lovers who are turning their daily walks into an exciting collectible adventure.
          </p>
          <Button 
            size="lg" 
            className="h-16 px-10 rounded-full text-xl shadow-2xl hover:shadow-sky-900/50 hover:scale-105 transition-all bg-white text-primary hover:bg-slate-50 group"
            onClick={() => alert('App Store link coming soon!')}
            data-testid="button-download-bottom"
          >
            <Download className="w-6 h-6 mr-3 text-primary group-hover:-translate-y-1 transition-transform" />
            Get PawDex for Free
          </Button>
          <p className="text-sm text-sky-200 mt-6">
            Available on iOS. Requires iPhone 11 or newer for on-device AI features.
          </p>
        </div>
      </section>
    </div>
  );
}
