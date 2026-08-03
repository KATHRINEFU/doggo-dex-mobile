import React from 'react';
import { Home, Grid, Award, User, Maximize2, ArrowUp, PawPrint } from 'lucide-react';

export function GoldenHourFieldGuide() {
  return (
    <div className="min-h-screen w-full bg-[#1A1817] flex items-center justify-center p-4 sm:p-8 font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap');

        .font-serif {
          font-family: 'Playfair Display', serif;
        }
        .font-sans {
          font-family: 'DM Sans', sans-serif;
        }

        .bg-golden-hour {
          background: linear-gradient(160deg, #FDB777 0%, #FD9346 30%, #D4512A 65%, #6B200C 100%);
        }

        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E");
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-16px) scale(1.02); }
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }

        @keyframes gentle-drift {
          0%, 100% { transform: rotate(0deg) translateX(0px); }
          50% { transform: rotate(2deg) translateX(4px); }
        }

        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-pulse-ring {
          animation: pulse-ring 3s ease-in-out infinite;
        }

        .animate-drift {
          animation: gentle-drift 8s ease-in-out infinite;
        }
      `}} />

      <div className="relative w-[450px] h-[910px] bg-stone-950 overflow-hidden shadow-[0_20px_80px_-15px_rgba(0,0,0,1)] rounded-[44px] ring-[12px] ring-stone-900 flex flex-col isolation-auto">
        
        {/* Viewfinder Background */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-golden-hour" />
          <div className="absolute inset-0 noise-overlay mix-blend-overlay" />
          
          {/* Viewfinder reticle elements */}
          <div className="absolute inset-6 border-[1.5px] border-white/20 rounded-[32px] mix-blend-overlay" />
          <div className="absolute inset-0 flex items-center justify-center opacity-20 mix-blend-overlay">
            <div className="w-[1px] h-full bg-white/40" />
            <div className="h-[1px] w-full bg-white/40 absolute" />
          </div>
          
          {/* Sun flare */}
          <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-[#FDB777]/30 blur-[80px] rounded-full mix-blend-screen" />
        </div>

        {/* Top HUD */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-14 pb-2">
          {/* Trainer Badge */}
          <div className="flex items-center gap-3 bg-[#4A1A05]/40 backdrop-blur-md border border-white/10 rounded-full pl-1.5 pr-5 py-1.5 shadow-lg">
            <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-[#FDB777] shadow-inner bg-stone-200">
              <img 
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop" 
                alt="Trainer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-[#FDFBF7] text-[13px] font-bold font-serif tracking-wide leading-tight drop-shadow-md">
                Lv. 7 Kathrine
              </div>
            </div>
          </div>

          {/* Logo Mark */}
          <div className="w-[42px] h-[42px] bg-[#4A1A05]/40 backdrop-blur-md rounded-full border border-white/10 flex items-center justify-center shadow-lg">
            <PawPrint className="text-[#FDB777] w-5 h-5 drop-shadow-md" />
          </div>
        </div>

        {/* Center Encounter Zone */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <div className="relative flex flex-col items-center animate-float">
            {/* Glowing Ring */}
            <div className="absolute inset-0 m-auto w-[200px] h-[200px] rounded-full border-[2px] border-[#FDB777] shadow-[0_0_40px_rgba(253,183,119,0.5)] animate-pulse-ring" />
            <div className="absolute inset-0 m-auto w-[170px] h-[170px] rounded-full border border-[#FDB777]/50 border-dashed animate-drift" />
            
            {/* Floating Dog */}
            <div className="relative z-10 text-[140px] leading-none drop-shadow-[0_20px_30px_rgba(107,32,12,0.6)] select-none mt-2">
              🐕
            </div>
          </div>
          
          {/* Shadow Puddle */}
          <div className="mt-8 w-[100px] h-[14px] bg-[#3A1005]/40 rounded-[100%] blur-[4px]" />
        </div>

        {/* Bottom Area */}
        <div className="relative z-20 px-5 pb-[110px]">
          <div className="bg-[#FAF6F0]/85 backdrop-blur-2xl rounded-[32px] p-6 shadow-[0_16px_40px_rgba(74,26,5,0.4)] border border-white/40 relative overflow-hidden">
            <div className="absolute inset-0 noise-overlay opacity-30 mix-blend-overlay pointer-events-none" />
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex-1">
                <div className="text-[11px] font-bold text-[#8C6B52] tracking-[0.15em] mb-1.5 uppercase">
                  COLLECTION PROGRESS
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[54px] font-serif text-[#4A2C1D] leading-[1.1] tracking-tight">34</span>
                  <span className="text-[22px] font-serif text-[#A68A76]">/ 144</span>
                </div>
                <div className="text-[13px] text-[#8C6B52] mt-0.5 font-medium">
                  Breeds Collected
                </div>
                
                {/* Progress Bar */}
                <div className="h-1 w-full bg-[#EADFCB]/60 rounded-full mt-5 overflow-hidden shadow-inner border border-white/20">
                  <div className="h-full bg-gradient-to-r from-[#FDB777] to-[#D4512A] rounded-full w-[23.6%] shadow-[0_0_10px_rgba(212,81,42,0.5)]" />
                </div>
              </div>
              
              <div className="w-[52px] h-[52px] bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center border border-white/60 text-[#A65D32] shadow-sm ml-4 mt-2">
                <Maximize2 strokeWidth={2.5} size={22} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-7 mb-1 relative z-10">
              <ArrowUp size={14} className="text-[#D4512A]" strokeWidth={3} />
              <span className="text-[13px] text-[#A65D32] font-medium tracking-wide">
                Tap the ball to scan a dog
              </span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="absolute bottom-8 left-0 right-0 px-5 z-30">
          <div className="relative bg-[#FAF6F0]/90 backdrop-blur-2xl border border-white/50 h-[72px] rounded-full shadow-[0_12px_40px_rgba(74,26,5,0.3)] flex items-center px-2">
            
            {/* Scan Button (Center) */}
            <div className="absolute left-1/2 -top-7 -translate-x-1/2 z-40">
              <button className="relative w-[72px] h-[72px] bg-gradient-to-b from-[#FFA751] to-[#E65C00] rounded-full shadow-[0_10px_24px_rgba(230,92,0,0.5)] border-[4px] border-[#FAF6F0] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-300 overflow-hidden">
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/40 to-transparent" />
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[30px] h-[12px] bg-white/40 rounded-full blur-[1.5px]" />
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[40px] h-[16px] bg-black/20 rounded-full blur-[3px]" />
                <PawPrint size={30} strokeWidth={2.5} className="text-white drop-shadow-md relative z-10" />
              </button>
            </div>

            <div className="flex-1 flex justify-around pr-[42px] h-full">
              <button className="relative flex flex-col items-center justify-center h-full w-[50px] text-[#8C3A1C]">
                <Home size={24} strokeWidth={2.5} />
                <div className="w-1.5 h-1.5 bg-[#8C3A1C] rounded-full absolute bottom-2" />
              </button>
              <button className="relative flex flex-col items-center justify-center h-full w-[50px] text-[#BBA594] hover:text-[#8C6B52] transition-colors">
                <Grid size={24} strokeWidth={2.5} />
              </button>
            </div>
            
            <div className="w-[84px] shrink-0" /> {/* Spacer */}
            
            <div className="flex-1 flex justify-around pl-[42px] h-full">
              <button className="relative flex flex-col items-center justify-center h-full w-[50px] text-[#BBA594] hover:text-[#8C6B52] transition-colors">
                <Award size={24} strokeWidth={2.5} />
              </button>
              <button className="relative flex flex-col items-center justify-center h-full w-[50px] text-[#BBA594] hover:text-[#8C6B52] transition-colors">
                <User size={24} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
