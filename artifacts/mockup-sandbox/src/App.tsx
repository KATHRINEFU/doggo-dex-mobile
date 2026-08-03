import { useEffect, useState, type ComponentType } from "react";

import { modules as discoveredModules } from "./.generated/mockup-components";
import { Download, ChevronRight, Smartphone } from "lucide-react";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) {
          return;
        }
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return null;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function Gallery() {
  const previews = [
    { id: "capture-next-breed", name: "Capture Next Breed", desc: "AR Camera & Scanning" },
    { id: "meet-every-breed", name: "Meet Every Breed", desc: "Breed Details & Lore" },
    { id: "climb-the-pack", name: "Climb the Pack", desc: "Global Leaderboards" },
    { id: "build-your-doggo-dex", name: "Build your Dex", desc: "Collection & Progress" },
  ];

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 text-primary mb-6">
            <Smartphone className="w-10 h-10" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            PawDex Campaign Previews
          </h1>
          <p className="text-xl text-white/60">
            App Store marketing assets generator
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {previews.map((preview) => (
            <a key={preview.id} href={`${getBasePath()}/preview/${preview.id}`} className="block">
              <div className="bg-[#0F203A] border border-white/10 rounded-3xl p-8 hover:bg-[#152B4D] hover:border-primary/50 transition-all cursor-pointer group flex flex-col justify-between h-full min-h-[200px]">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                    {preview.name}
                  </h2>
                  <p className="text-white/50 text-lg">
                    {preview.desc}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-8">
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Download className="w-5 h-5" />
                    <span>Export ready</span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-background transition-colors text-white">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname } = window.location;
  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const previewPath = getPreviewPath();

  if (previewPath) {
    return (
      <div className="min-h-screen bg-[#0A1628]">
        {/* Simple back button for easy navigation */}
        <div className="fixed top-4 left-4 z-50">
          <a href={getBasePath() || "/"} className="block">
             <div className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-black/80 transition cursor-pointer border border-white/10">
               ← Back to Gallery
             </div>
          </a>
        </div>
        <PreviewRenderer
          componentPath={previewPath}
          modules={discoveredModules}
        />
      </div>
    );
  }

  return <Gallery />;
}

export default App;
