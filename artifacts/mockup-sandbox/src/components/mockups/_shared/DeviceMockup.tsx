import React from "react";
import { cn } from "@/lib/utils";
import { Home, Compass, User, ScanLine, Signal, Wifi, Battery } from "lucide-react";

interface DeviceMockupProps {
  children: React.ReactNode;
  className?: string;
}

export function DeviceMockup({ children, className }: DeviceMockupProps) {
  return (
    <div className="relative z-10 w-[740px] h-[1600px] rounded-[96px] bg-black p-[24px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8),inset_0_0_0_4px_#333] border-4 border-[#111]">
      {/* Inner Screen */}
      <div className={cn("relative w-full h-full rounded-[72px] overflow-hidden bg-background", className)}>
        
        {/* Status Bar */}
        <div className="absolute top-0 inset-x-0 h-[80px] z-50 flex items-center justify-between px-10 pointer-events-none">
          <div className="text-white font-semibold text-2xl tracking-tight mt-2">
            9:41
          </div>
          
          {/* Dynamic Island */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[240px] h-[56px] bg-black rounded-[28px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" />
          
          <div className="flex items-center gap-3 mt-2 text-white">
            <Signal className="w-6 h-6" fill="currentColor" />
            <Wifi className="w-6 h-6" />
            <Battery className="w-8 h-8" />
          </div>
        </div>

        {/* App Content */}
        <div className="w-full h-full pt-[80px] pb-[140px] overflow-hidden">
          {children}
        </div>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 inset-x-0 h-[160px] bg-background/80 backdrop-blur-3xl border-t border-white/10 z-40 flex items-start justify-between px-16 pt-8">
          <div className="flex flex-col items-center gap-1 text-white">
            <Home className="w-10 h-10" />
          </div>
          <div className="flex flex-col items-center gap-1 text-white/40">
            <Compass className="w-10 h-10" />
          </div>
          
          {/* Central Scan Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-10">
            <div className="w-32 h-32 rounded-full p-[4px] bg-gradient-to-b from-primary to-secondary shadow-[0_0_40px_rgba(90,200,250,0.4)]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center border border-white/20">
                <ScanLine className="w-14 h-14 text-primary" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1 text-white/40 ml-16">
            <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-1 text-white/40">
            <User className="w-10 h-10" />
          </div>

          {/* Home Indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[240px] h-[8px] bg-white rounded-full" />
        </div>
        
      </div>
    </div>
  );
}
