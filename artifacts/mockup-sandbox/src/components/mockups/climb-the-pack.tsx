import React from "react";
import { AppStorePreview } from "./_shared/AppStorePreview";
import { DeviceMockup } from "./_shared/DeviceMockup";
import { Trophy, Medal, Star, ChevronUp, Globe2 } from "lucide-react";

export function ClimbThePackPreview() {
  return (
    <AppStorePreview
      title="Climb the pack"
      subtitle="Compete with collectors worldwide"
      exportName="pawdex-climb-the-pack.png"
    >
      <DeviceMockup>
        <div className="w-full h-full bg-background overflow-hidden flex flex-col relative px-8">
          
          <div className="pt-12 pb-10">
            <h2 className="text-[52px] font-bold text-white font-serif tracking-tight mb-2">Leaderboard</h2>
            <div className="flex items-center gap-3 text-primary text-2xl font-medium">
              <Globe2 className="w-7 h-7" />
              <span>Global Rankings</span>
            </div>
          </div>

          {/* Podium */}
          <div className="flex items-end justify-center gap-4 h-[320px] mb-12">
            
            {/* Rank 2 */}
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full border-4 border-[#A3A3A3] overflow-hidden mb-4 bg-card relative">
                 <div className="absolute inset-0 flex items-center justify-center bg-[#A3A3A3]/20">
                   <span className="text-4xl font-bold text-[#A3A3A3]">E</span>
                 </div>
              </div>
              <div className="bg-card w-36 h-[160px] rounded-t-[32px] border-t-4 border-[#A3A3A3] flex flex-col items-center pt-6">
                <span className="text-[#A3A3A3] font-black text-5xl mb-2">2</span>
                <span className="text-white/80 font-medium text-xl">Elena</span>
                <span className="text-white font-bold text-2xl mt-1">2,410</span>
              </div>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                  <Trophy className="w-16 h-16 text-[#FBBF24] drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" fill="#FBBF24" />
                </div>
                <div className="w-36 h-36 rounded-full border-4 border-[#FBBF24] overflow-hidden bg-card relative shadow-[0_0_40px_rgba(251,191,36,0.3)]">
                   <div className="absolute inset-0 flex items-center justify-center bg-[#FBBF24]/20">
                     <span className="text-6xl font-bold text-[#FBBF24]">M</span>
                   </div>
                </div>
              </div>
              <div className="bg-gradient-to-t from-primary/40 to-primary/10 w-44 h-[220px] rounded-t-[40px] border-t-4 border-[#FBBF24] flex flex-col items-center pt-8">
                <span className="text-[#FBBF24] font-black text-7xl mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">1</span>
                <span className="text-white font-bold text-2xl">Marcus</span>
                <span className="text-white font-black text-3xl mt-1 text-[#FBBF24]">2,850</span>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full border-4 border-[#B45309] overflow-hidden mb-4 bg-card relative">
                 <div className="absolute inset-0 flex items-center justify-center bg-[#B45309]/20">
                   <span className="text-4xl font-bold text-[#B45309]">S</span>
                 </div>
              </div>
              <div className="bg-card w-36 h-[120px] rounded-t-[32px] border-t-4 border-[#B45309] flex flex-col items-center pt-6">
                <span className="text-[#B45309] font-black text-4xl mb-2">3</span>
                <span className="text-white/80 font-medium text-xl">Sarah</span>
                <span className="text-white font-bold text-2xl mt-1">2,105</span>
              </div>
            </div>

          </div>

          {/* List */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            {[
              { rank: 4, name: "David Chen", score: 1980, change: "up" },
              { rank: 5, name: "Jessica L.", score: 1845, change: "down" },
              { rank: 6, name: "Tom", score: 1720, change: "up" },
            ].map((user) => (
              <div key={user.rank} className="bg-card rounded-[32px] p-6 flex items-center gap-6 border border-white/5">
                <span className="text-white/40 font-bold text-3xl w-12 text-center">{user.rank}</span>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-white">
                  {user.name.charAt(0)}
                </div>
                <span className="text-white font-medium text-2xl flex-1">{user.name}</span>
                <div className="flex flex-col items-end">
                  <span className="text-white font-bold text-2xl">{user.score}</span>
                  <div className="flex items-center gap-1 text-primary text-lg">
                    <ChevronUp className="w-5 h-5" />
                    <span>12</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Current User Fixed at Bottom */}
          <div className="absolute bottom-[160px] inset-x-8 bg-primary rounded-[36px] p-6 flex items-center gap-6 shadow-[0_20px_40px_rgba(90,200,250,0.3)] border border-white/20 z-30">
            <span className="text-white/80 font-bold text-3xl w-12 text-center">42</span>
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-xl font-bold text-primary">
              Y
            </div>
            <span className="text-white font-bold text-2xl flex-1">You</span>
            <div className="flex flex-col items-end">
              <span className="text-white font-black text-2xl">840</span>
              <div className="flex items-center gap-1 text-white/80 text-lg">
                <ChevronUp className="w-5 h-5" />
                <span>4</span>
              </div>
            </div>
          </div>

        </div>
      </DeviceMockup>
    </AppStorePreview>
  );
}
