import React from "react";
import { AppStorePreview } from "./_shared/AppStorePreview";
import { DeviceMockup } from "./_shared/DeviceMockup";
import { Scan, Focus, Sparkles } from "lucide-react";

export function CaptureNextBreedPreview() {
  return (
    <AppStorePreview
      title="Capture the next breed"
      subtitle="Discover and scan dogs in the real world"
      exportName="pawdex-capture-next-breed.png"
    >
      <DeviceMockup>
        {/* AR Camera View Simulation */}
        <div className="relative w-full h-full bg-[#1A2E20] overflow-hidden">
          {/* Faux camera background (park/nature feel but abstract) */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E4A35] to-[#0A1610] opacity-80" />
          <div className="absolute inset-0 blur-3xl opacity-50 bg-[radial-gradient(circle_at_50%_40%,#34D399,transparent_70%)]" />
          
          {/* Top AR UI */}
          <div className="absolute top-8 inset-x-8 flex justify-between items-center z-20">
            <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white font-medium text-2xl tracking-wide">AR SCAN ACTIVE</span>
            </div>
            <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Center Scan Reticle and Dog */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex flex-col items-center z-20">
            <div className="relative w-[500px] h-[500px] flex items-center justify-center">
              {/* Scan bracket corners */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-8 border-l-8 border-primary rounded-tl-3xl opacity-80" />
              <div className="absolute top-0 right-0 w-16 h-16 border-t-8 border-r-8 border-primary rounded-tr-3xl opacity-80" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-8 border-l-8 border-primary rounded-bl-3xl opacity-80" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-8 border-r-8 border-primary rounded-br-3xl opacity-80" />

              {/* Scanning Laser */}
              <div className="absolute top-0 inset-x-0 h-2 bg-primary shadow-[0_0_20px_#5AC8FA] translate-y-[250px]" />

              {/* Dog Silhouette/Illustration */}
              <svg className="w-[360px] h-[360px] text-white opacity-90 drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.69 2 6 4.69 6 8C6 9.66 6.67 11.16 7.74 12.26L6.5 16H5C3.9 16 3 16.9 3 18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18C21 16.9 20.1 16 19 16H17.5L16.26 12.26C17.33 11.16 18 9.66 18 8C18 4.69 15.31 2 12 2ZM10.5 8C10.5 7.17 11.17 6.5 12 6.5C12.83 6.5 13.5 7.17 13.5 8C13.5 8.83 12.83 9.5 12 9.5C11.17 9.5 10.5 8.83 10.5 8ZM8.5 15L9.5 11.5L8.2 10.2C8.07 10 8 9.76 8 9.5C8 9.24 8.07 9 8.2 8.8L9.5 7.5L10.7 8.7C11.08 9.08 11.54 9.27 12 9.27C12.46 9.27 12.92 9.08 13.3 8.7L14.5 7.5L15.8 8.8C15.93 9 16 9.24 16 9.5C16 9.76 15.93 10 15.8 10.2L14.5 11.5L15.5 15H8.5Z" />
              </svg>
            </div>
            
            {/* Scan Progress */}
            <div className="mt-20 w-[400px]">
              <div className="flex justify-between text-white mb-4">
                <span className="font-semibold text-2xl">Analyzing Breed...</span>
                <span className="font-bold text-2xl text-primary">82%</span>
              </div>
              <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div className="h-full bg-primary w-[82%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/30 animate-[pulse_1s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </DeviceMockup>
    </AppStorePreview>
  );
}
