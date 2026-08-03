import React from "react";
import { AppStorePreview } from "./_shared/AppStorePreview";
import { DeviceMockup } from "./_shared/DeviceMockup";
import { MapPin, Trophy, Wind, Shield, Droplets } from "lucide-react";

export function MeetEveryBreedPreview() {
  return (
    <AppStorePreview
      title="Meet every breed"
      subtitle="Discover stats, lore, and global rarity"
      exportName="pawdex-meet-every-breed.png"
    >
      <DeviceMockup>
        <div className="w-full h-full bg-background overflow-hidden flex flex-col relative">
          
          {/* Header Image Area */}
          <div className="relative h-[480px] w-full shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
            
            {/* Nav */}
            <div className="absolute top-8 inset-x-8 z-20 flex justify-between items-center">
              <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </div>
              <div className="bg-blue-500/20 border border-blue-400/30 text-blue-300 px-6 py-2 rounded-full font-bold text-xl backdrop-blur-md">
                #042
              </div>
            </div>

            {/* Stylized Dog Illustration (Samoyed) */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
               <svg className="w-[320px] h-[320px] text-white drop-shadow-[0_20px_40px_rgba(255,255,255,0.3)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.5 5.5C18.3 5.5 19 6.2 19 7C19 7.4 18.8 7.7 18.5 8C19.3 8.3 20 9.2 20 10.2C20 11.2 19.3 12 18.5 12.3C18.8 12.6 19 13 19 13.5C19 14.3 18.3 15 17.5 15H17C17 17.8 14.8 20 12 20C9.2 20 7 17.8 7 15H6.5C5.7 15 5 14.3 5 13.5C5 13 5.2 12.6 5.5 12.3C4.7 12 4 11.2 4 10.2C4 9.2 4.7 8.3 5.5 8C5.2 7.7 5 7.4 5 7C5 6.2 5.7 5.5 6.5 5.5H7C7.2 3.5 8.9 2 11 2H13C15.1 2 16.8 3.5 17 5.5H17.5ZM12 18C14.2 18 16 16.2 16 14H8C8 16.2 9.8 18 12 18ZM15 7C14.4 7 14 7.4 14 8C14 8.6 14.4 9 15 9C15.6 9 16 8.6 16 8C16 7.4 15.6 7 15 7ZM9 7C8.4 7 8 7.4 8 8C8 8.6 8.4 9 9 9C9.6 9 10 8.6 10 8C10 7.4 9.6 7 9 7Z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="px-10 pb-8 flex-1 flex flex-col z-20">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-white text-[56px] font-bold tracking-tight font-serif leading-none mb-3">Samoyed</h2>
                <div className="flex items-center gap-3 text-muted-foreground text-2xl">
                  <MapPin className="w-6 h-6" />
                  <span>Siberia</span>
                </div>
              </div>
              <div className="bg-[#60A5FA]/10 border border-[#60A5FA]/30 text-[#60A5FA] px-5 py-2 rounded-2xl font-bold text-xl flex items-center gap-2">
                <Wind className="w-5 h-5" />
                Uncommon
              </div>
            </div>

            <p className="text-white/80 text-[26px] leading-relaxed mb-10">
              Known for their "Sammy smile," these fluffy, white dogs were bred to pull sleds, herd reindeer, and keep their owners warm.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6 mb-10">
              <div className="bg-card rounded-[32px] p-6 border border-white/5">
                <div className="flex items-center gap-3 text-primary mb-3">
                  <Trophy className="w-7 h-7" />
                  <span className="font-bold text-xl tracking-wide uppercase">PLAYFULNESS</span>
                </div>
                <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[85%] rounded-full" />
                </div>
              </div>
              
              <div className="bg-card rounded-[32px] p-6 border border-white/5">
                <div className="flex items-center gap-3 text-[#A78BFA] mb-3">
                  <Shield className="w-7 h-7" />
                  <span className="font-bold text-xl tracking-wide uppercase">PROTECTION</span>
                </div>
                <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#A78BFA] w-[40%] rounded-full" />
                </div>
              </div>

              <div className="bg-card rounded-[32px] p-6 border border-white/5">
                <div className="flex items-center gap-3 text-[#34D399] mb-3">
                  <Wind className="w-7 h-7" />
                  <span className="font-bold text-xl tracking-wide uppercase">ENERGY</span>
                </div>
                <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#34D399] w-[95%] rounded-full" />
                </div>
              </div>

              <div className="bg-card rounded-[32px] p-6 border border-white/5">
                <div className="flex items-center gap-3 text-[#FBBF24] mb-3">
                  <Droplets className="w-7 h-7" />
                  <span className="font-bold text-xl tracking-wide uppercase">GROOMING</span>
                </div>
                <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FBBF24] w-[100%] rounded-full" />
                </div>
              </div>
            </div>

            {/* Discovery Status */}
            <div className="bg-card rounded-[36px] p-8 border border-white/5 flex items-center justify-between mt-auto mb-6">
              <div>
                <div className="text-white/50 text-xl font-semibold mb-2 uppercase tracking-wider">Discovery Status</div>
                <div className="text-white text-3xl font-bold">Captured 3 times</div>
              </div>
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
            </div>

          </div>
        </div>
      </DeviceMockup>
    </AppStorePreview>
  );
}
