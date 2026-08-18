import { Link } from "wouter";
import { Dog } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-background px-4">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
        <Dog className="w-12 h-12 text-slate-400" />
      </div>
      <h1 className="text-4xl md:text-5xl font-display font-bold text-slate-900 mb-4 text-center">
        404 - Doggo not found
      </h1>
      <p className="text-lg text-slate-500 max-w-md text-center mb-8">
        Looks like this page ran away. Let's get you back to the trail.
      </p>
      <Link href="/">
        <Button size="lg" className="rounded-full shadow-sm hover:shadow-md transition-all">
          Back to Home
        </Button>
      </Link>
    </div>
  );
}
