import React from "react";
import { AppStorePreview } from "./_shared/AppStorePreview";
import { DeviceMockup } from "./_shared/DeviceMockup";
import { Search, Filter, Shield, Wind, Sparkles } from "lucide-react";

export function BuildYourDoggoDexPreview() {
  return (
    <AppStorePreview
      title="Build your Doggo Dex"
      subtitle="Complete your collection of 340+ breeds"
      exportName="pawdex-build-your-doggo-dex.png"
    >
      <DeviceMockup>
        <div className="w-full h-full bg-background overflow-hidden flex flex-col px-8 pt-10">
          
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[52px] font-bold text-white font-serif tracking-tight">Doggo Dex</h2>
            <div className="w-14 h-14 rounded-full bg-card border border-white/10 flex items-center justify-center">
              <Search className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Progress */}
          <div className="bg-card rounded-[40px] p-8 border border-white/5 mb-10 shadow-lg">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-white/50 text-xl font-medium mb-1 uppercase tracking-wider">Overall Progress</div>
                <div className="text-white text-[44px] font-bold leading-none">42 <span className="text-white/30 text-3xl">/ 340</span></div>
              </div>
              <div className="bg-primary/20 text-primary px-4 py-2 rounded-xl font-bold text-xl">
                12%
              </div>
            </div>
            <div className="h-5 w-full bg-black/40 rounded-full overflow-hidden mb-8">
              <div className="h-full bg-gradient-to-r from-primary to-secondary w-[12%] rounded-full" />
            </div>

            {/* Rarity Breakdown */}
            <div className="flex justify-between">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#34D399] mb-2" />
                <span className="text-white font-bold text-2xl">24</span>
                <span className="text-white/40 text-sm font-medium">Common</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#60A5FA] mb-2" />
                <span className="text-white font-bold text-2xl">12</span>
                <span className="text-white/40 text-sm font-medium">Uncommon</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#A78BFA] mb-2 shadow-[0_0_10px_#A78BFA]" />
                <span className="text-white font-bold text-2xl">5</span>
                <span className="text-white/40 text-sm font-medium">Rare</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-[#FBBF24] mb-2 shadow-[0_0_15px_#FBBF24]" />
                <span className="text-white font-bold text-2xl">1</span>
                <span className="text-white/40 text-sm font-medium">Legendary</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-8 overflow-x-auto pb-4 no-scrollbar">
            <div className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-bold text-xl whitespace-nowrap">
              All Breeds
            </div>
            <div className="bg-card text-white/70 px-6 py-3 rounded-full font-bold text-xl border border-white/5 whitespace-nowrap flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FBBF24]" /> Legendary
            </div>
            <div className="bg-card text-white/70 px-6 py-3 rounded-full font-bold text-xl border border-white/5 whitespace-nowrap flex items-center gap-2">
              <Wind className="w-5 h-5 text-[#34D399]" /> Working Group
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 grid grid-cols-2 gap-6 overflow-hidden">
            
            {/* Card 1: Siberian Husky (Rare) */}
            <div className="bg-gradient-to-br from-[#A78BFA]/20 to-card rounded-[32px] p-6 border border-[#A78BFA]/30 relative overflow-hidden h-[240px]">
              <div className="absolute top-4 right-4 bg-[#A78BFA] text-background px-3 py-1 rounded-lg font-bold text-sm">#084</div>
              <h3 className="text-white font-bold text-2xl mt-4 mb-1">Siberian Husky</h3>
              <p className="text-[#A78BFA] font-semibold text-lg">Rare</p>
              
              <div className="absolute -bottom-6 -right-6 w-40 h-40 opacity-50">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
                  <path d="M12 2C8.69 2 6 4.69 6 8C6 9.66 6.67 11.16 7.74 12.26L6.5 16H5C3.9 16 3 16.9 3 18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18C21 16.9 20.1 16 19 16H17.5L16.26 12.26C17.33 11.16 18 9.66 18 8C18 4.69 15.31 2 12 2Z" />
                </svg>
              </div>
            </div>

            {/* Card 2: Golden Retriever (Common) */}
            <div className="bg-gradient-to-br from-[#34D399]/10 to-card rounded-[32px] p-6 border border-[#34D399]/20 relative overflow-hidden h-[240px]">
              <div className="absolute top-4 right-4 bg-card text-white/50 px-3 py-1 rounded-lg font-bold text-sm border border-white/10">#012</div>
              <h3 className="text-white font-bold text-2xl mt-4 mb-1">Golden Retriever</h3>
              <p className="text-[#34D399] font-semibold text-lg">Common</p>
              
              <div className="absolute -bottom-6 -right-6 w-40 h-40 opacity-40">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full text-white">
                  <path d="M12 2C8.69 2 6 4.69 6 8C6 9.66 6.67 11.16 7.74 12.26L6.5 16H5C3.9 16 3 16.9 3 18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18C21 16.9 20.1 16 19 16H17.5L16.26 12.26C17.33 11.16 18 9.66 18 8C18 4.69 15.31 2 12 2Z" />
                </svg>
              </div>
            </div>
            
            {/* Card 3: Uncollected */}
            <div className="bg-card/50 rounded-[32px] p-6 border border-white/5 relative overflow-hidden h-[240px] flex items-center justify-center">
              <div className="absolute top-4 right-4 bg-black/40 text-white/30 px-3 py-1 rounded-lg font-bold text-sm">#013</div>
              <div className="text-white/20">
                <Search className="w-16 h-16" />
              </div>
            </div>
            
            {/* Card 4: Uncollected */}
            <div className="bg-card/50 rounded-[32px] p-6 border border-white/5 relative overflow-hidden h-[240px] flex items-center justify-center">
              <div className="absolute top-4 right-4 bg-black/40 text-white/30 px-3 py-1 rounded-lg font-bold text-sm">#014</div>
              <div className="text-white/20">
                <Search className="w-16 h-16" />
              </div>
            </div>

          </div>

        </div>
      </DeviceMockup>
    </AppStorePreview>
  );
}
