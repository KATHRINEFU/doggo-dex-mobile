import React, { useRef } from "react";
import { toPng } from "html-to-image";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppStorePreviewProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  exportName: string;
  className?: string;
}

export function AppStorePreview({
  title,
  subtitle,
  children,
  exportName,
  className,
}: AppStorePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleExport = async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        quality: 1,
        pixelRatio: 1,
      });
      const link = document.createElement("a");
      link.download = exportName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to export image", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8 py-12">
      <button
        onClick={handleExport}
        className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90 transition-opacity"
      >
        <Download className="w-5 h-5" />
        Export {exportName}
      </button>

      {/* 
        App Store Screenshot Size for a modern 6.7" Display: 1290 x 2796.
        The browser preview is scaled down, while html-to-image captures the full
        export canvas at the native marketing dimensions.
      */}
      <div className="relative overflow-hidden w-[1290px] h-[2796px] origin-top scale-[0.28] sm:scale-[0.32] md:scale-[0.38] -mb-[2000px] sm:-mb-[1900px] md:-mb-[1750px] rounded-3xl shadow-2xl ring-1 ring-border/20 bg-background">
        <div 
          ref={containerRef}
          className={cn("w-[1290px] h-[2796px] bg-gradient-to-b from-[#0A1628] to-[#040A14] flex flex-col items-center pt-40 relative overflow-hidden", className)}
        >
          {/* Decorative background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[980px] h-[980px] bg-primary/20 blur-[140px] rounded-full pointer-events-none" />
          
          <div className="z-10 text-center px-16 max-w-[900px]">
            <h1 className="text-[96px] leading-[1.1] font-bold tracking-tight text-white mb-8">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[42px] leading-snug text-white/70 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          <div className="mt-28 z-10 w-full flex justify-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
