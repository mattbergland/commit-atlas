"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { parseUsername } from "@/lib/username";
import { ArrowRight, Sparkles, Mountain, Grid3X3, Route, Map, Shapes, CircleDot, Music, Flower2, Search, Palette, Download } from "lucide-react";
import BloomReveal from "@/components/BloomReveal";

export default function LandingPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [timeframe, setTimeframe] = useState<"year" | "month">("year");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [error, setError] = useState("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const username = parseUsername(input);
    if (!username) {
      setError("Please enter a valid GitHub username or profile URL");
      return;
    }
    setError("");
    const params = new URLSearchParams({ username, year: String(year) });
    if (timeframe === "month") params.set("month", String(month));
    router.push(`/generate?${params.toString()}`);
  };

  const handleDemo = () => {
    const params = new URLSearchParams({
      demo: "true",
      year: String(year),
    });
    if (timeframe === "month") params.set("month", String(month));
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="px-6 py-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <span className="font-semibold tracking-widest text-xs uppercase">
            Commit Atlas
          </span>
          <button
            onClick={handleDemo}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Try Demo
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative">
        {/* Bloom art reveal layer — hidden until cursor hovers */}
        <BloomReveal />

        <div className="mx-auto max-w-2xl w-full text-center space-y-10 relative z-10">
          {/* Tagline */}
          <div className="space-y-4">
            <p className="text-xs tracking-[0.3em] uppercase text-muted-foreground font-medium">
              Your code, as art
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              Turn your GitHub
              <br />
              into a poster
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              Generate beautiful, mid-century modern inspired posters from your
              GitHub contribution history. Art-first. Premium enough to hang.
            </p>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError("");
                }}
                placeholder="github.com/username or just username"
                className="w-full rounded-xl border border-border bg-card px-5 py-4 text-base placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
              >
                Generate
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-left">{error}</p>
            )}

            {/* Timeframe controls */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                <button
                  type="button"
                  onClick={() => setTimeframe("year")}
                  className={`rounded-md px-4 py-1.5 text-sm transition-all cursor-pointer ${
                    timeframe === "year"
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Full Year
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe("month")}
                  className={`rounded-md px-4 py-1.5 text-sm transition-all cursor-pointer ${
                    timeframe === "month"
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Month
                </button>
              </div>

              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              {timeframe === "month" && (
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-foreground/10"
                >
                  {months.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </form>

          {/* Demo link */}
          <button
            onClick={handleDemo}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Or try with demo data
          </button>

          {/* How It Works */}
          <div className="pt-16 space-y-8">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                How it works
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                Three simple steps
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  icon: <Search className="w-5 h-5" />,
                  title: "Enter your GitHub",
                  desc: "Paste a profile URL or username. We fetch your contribution history automatically.",
                },
                {
                  step: "2",
                  icon: <Palette className="w-5 h-5" />,
                  title: "Customize your poster",
                  desc: "Choose from 8 art styles and 11 palettes. Adjust text, stats, and agent activity.",
                },
                {
                  step: "3",
                  icon: <Download className="w-5 h-5" />,
                  title: "Export & print",
                  desc: "Download as high-res PNG or PDF. Print-ready at 300 DPI.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-foreground/5 border border-border flex items-center justify-center text-foreground">
                    {item.icon}
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Style previews */}
          <div className="pt-16 space-y-8">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                8 poster styles
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                Art-first, data-driven
              </h2>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[
                {
                  icon: <Mountain className="w-5 h-5" />,
                  label: "Horizon",
                  desc: "Layered landscape",
                },
                {
                  icon: <Grid3X3 className="w-5 h-5" />,
                  label: "Grid Modern",
                  desc: "Geometric blocks",
                },
                {
                  icon: <Route className="w-5 h-5" />,
                  label: "Path",
                  desc: "Journey line",
                },
                {
                  icon: <Map className="w-5 h-5" />,
                  label: "Atlas",
                  desc: "Topographic map",
                },
                {
                  icon: <Shapes className="w-5 h-5" />,
                  label: "Fragments",
                  desc: "Bauhaus shapes",
                },
                {
                  icon: <CircleDot className="w-5 h-5" />,
                  label: "Concerto",
                  desc: "Curved forms",
                },
                {
                  icon: <Music className="w-5 h-5" />,
                  label: "Rhythm",
                  desc: "Circle & line",
                },
                {
                  icon: <Flower2 className="w-5 h-5" />,
                  label: "Bloom",
                  desc: "Organic petals",
                },
              ].map((style) => (
                <div
                  key={style.label}
                  className="text-center space-y-2 text-muted-foreground"
                >
                  <div className="mx-auto w-12 h-12 rounded-lg border border-border flex items-center justify-center">
                    {style.icon}
                  </div>
                  <p className="text-xs font-medium text-foreground">
                    {style.label}
                  </p>
                  <p className="text-[11px]">{style.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Example poster gallery */}
          <div className="pt-16 space-y-8">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-medium">
                Examples
              </p>
              <h2 className="text-xl font-semibold tracking-tight">
                See what&apos;s possible
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { variant: "horizon", palette: "Desert Dusk", user: "octocat" },
                { variant: "fragments", palette: "Bauhaus Red", user: "torvalds" },
                { variant: "atlas", palette: "Nordic Frost", user: "gaearon" },
                { variant: "rhythm", palette: "Bauhaus Blue", user: "sindresorhus" },
              ].map((example) => (
                <button
                  key={example.variant}
                  onClick={handleDemo}
                  className="group relative aspect-[3/4] rounded-lg border border-border overflow-hidden cursor-pointer hover:border-foreground/30 transition-all hover:shadow-lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-muted/80 flex items-center justify-center">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-foreground capitalize">
                        {example.variant}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {example.palette}
                      </p>
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="text-[10px] text-muted-foreground/70">Click to try demo</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-border/50">
        <div className="mx-auto max-w-5xl flex items-center justify-between text-xs text-muted-foreground">
          <span>Commit Atlas</span>
          <span>Your code, visualized</span>
        </div>
      </footer>
    </div>
  );
}
