"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import {
  GitHubData,
  PosterConfig,
  GitHubApiResponse,
} from "@/types/github";
import type { AgentStats } from "@/lib/commit-analysis";
import { PALETTES } from "@/lib/palettes";
import { generateMockData } from "@/lib/mock-data";
import { filterByMonth, calculateLongestStreak, calculateCurrentStreak } from "@/lib/streaks";
import { exportToPng, exportToPdf } from "@/lib/export";
import PosterRenderer from "@/components/posters/PosterRenderer";
import PosterControls from "@/components/PosterControls";
import { ArrowLeft, Loader2, AlertCircle, Sparkles } from "lucide-react";

const VARIANT_ORDER: PosterConfig["variant"][] = ["horizon", "grid", "path", "atlas", "fragments", "concerto", "rhythm"];

function GeneratePageInner() {
  const searchParams = useSearchParams();
  const usernameParam = searchParams.get("username") || "";
  const yearParam = searchParams.get("year") || String(new Date().getFullYear());
  const monthParam = searchParams.get("month") || "";
  const demoParam = searchParams.get("demo") === "true";

  const [githubData, setGithubData] = useState<GitHubData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [userAgentStats, setUserAgentStats] = useState<AgentStats | null>(null);
  const [hasUserSelectedVariant, setHasUserSelectedVariant] = useState(false);

  const posterRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<PosterConfig>({
    variant: "horizon",
    palette: PALETTES[0],
    size: "18x24",
    title: "",
    subtitle: "",
    showStats: true,
    showLanguages: true,
    showAgentMetadata: true,
    sourceFilter: "all",
    includeAgentActivity: true,
    includeCliActivity: true,
  });

  const fetchData = useCallback(async () => {
    const username = usernameParam.trim();
    if (!username && !demoParam) return;

    setLoading(true);
    setError(null);
    if (demoParam && !username) {
      const year = parseInt(yearParam);
      const month = monthParam ? parseInt(monthParam) : undefined;
      let mockData = generateMockData("octocat", year);
      if (month) {
        const filtered = filterByMonth(mockData.contributions, year, month);
        mockData = {
          ...mockData,
          contributions: filtered,
          totalContributions: filtered.reduce((s, d) => s + d.count, 0),
          activeDays: filtered.filter((d) => d.count > 0).length,
          longestStreak: calculateLongestStreak(filtered),
          currentStreak: calculateCurrentStreak(filtered),
          month,
        };
      }
      setGithubData(mockData);
      setIsDemo(true);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ username });
      params.set("year", yearParam);
      if (monthParam) params.set("month", monthParam);

      const res = await fetch(`/api/github?${params.toString()}`);
      const json: GitHubApiResponse = await res.json();

      if (json.success && json.data) {
        let finalData = json.data;
        if (monthParam) {
          const month = parseInt(monthParam);
          const filtered = filterByMonth(
            finalData.contributions,
            parseInt(yearParam),
            month
          );
          finalData = {
            ...finalData,
            contributions: filtered,
            totalContributions: filtered.reduce((s, d) => s + d.count, 0),
            activeDays: filtered.filter((d) => d.count > 0).length,
            longestStreak: calculateLongestStreak(filtered),
            currentStreak: calculateCurrentStreak(filtered),
            month,
          };
        }
        setGithubData(finalData);
        setIsDemo(json.isDemo || false);
      } else {
        setError(json.error || "Failed to fetch data");
        // Offer demo fallback
        const year = parseInt(yearParam);
        const month = monthParam ? parseInt(monthParam) : undefined;
        let mockData = generateMockData(username, year);
        if (month) {
          const filtered = filterByMonth(mockData.contributions, year, month);
          mockData = {
            ...mockData,
            contributions: filtered,
            totalContributions: filtered.reduce((s, d) => s + d.count, 0),
            activeDays: filtered.filter((d) => d.count > 0).length,
            longestStreak: calculateLongestStreak(filtered),
            currentStreak: calculateCurrentStreak(filtered),
            month,
          };
        }
        setGithubData(mockData);
        setIsDemo(true);
      }
    } catch {
      setError("Network error. Showing demo data instead.");
      const year = parseInt(yearParam);
      const mockData = generateMockData(usernameParam || "octocat", year);
      setGithubData(mockData);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  }, [usernameParam, yearParam, monthParam, demoParam]);

  // Fetch on mount
  const hasInitialized = useRef(false);
  if (!hasInitialized.current) {
    hasInitialized.current = true;
    if (typeof window !== "undefined") {
      fetchData();
    }
  }

  const handleExportPng = async () => {
    if (!posterRef.current || !githubData) return;
    setIsExporting(true);
    try {
      const filename = `commit-atlas-${githubData.username}-${githubData.year}`;
      await exportToPng(posterRef.current, config.size, filename);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!posterRef.current || !githubData) return;
    setIsExporting(true);
    try {
      const filename = `commit-atlas-${githubData.username}-${githubData.year}`;
      await exportToPdf(posterRef.current, config.size, filename);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  // Auto-cycle poster variants until user selects one
  useEffect(() => {
    if (hasUserSelectedVariant || !githubData) return;
    const interval = setInterval(() => {
      setConfig((prev) => {
        const currentIdx = VARIANT_ORDER.indexOf(prev.variant);
        const nextIdx = (currentIdx + 1) % VARIANT_ORDER.length;
        return { ...prev, variant: VARIANT_ORDER[nextIdx] };
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [hasUserSelectedVariant, githubData]);

  const handleVariantSelect = (variant: PosterConfig["variant"]) => {
    setHasUserSelectedVariant(true);
    setConfig((prev) => ({ ...prev, variant }));
  };

  const handleAgentStatsChange = (stats: AgentStats | null) => {
    setUserAgentStats(stats);
    // Also update githubData so the poster and info card reflect the change
    if (githubData) {
      setGithubData({ ...githubData, agentStats: stats || undefined });
    }
  };

  const handleSaveConfig = () => {
    const configJson = JSON.stringify(
      {
        ...config,
        palette: config.palette.id,
        username: githubData?.username,
        year: githubData?.year,
        month: githubData?.month,
      },
      null,
      2
    );
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `commit-atlas-config-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Link
            href="/"
            className="font-semibold tracking-widest text-xs uppercase text-foreground"
          >
            Commit Atlas
          </Link>
          <div className="w-16" />
        </div>
      </header>

      {/* Loading state */}
      {loading && !githubData && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Fetching GitHub data…
            </p>
          </div>
        </div>
      )}

      {/* Main workspace */}
      {(githubData || loading) && (
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Demo / error banner */}
          {isDemo && error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Using demo data</p>
                <p className="text-amber-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {isDemo && !error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
              <p>
                Showing demo data. The poster art is generated from simulated
                contribution patterns.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Poster preview */}
            <div className="lg:col-span-8 flex items-start justify-center">
              {githubData && (
                <div className="w-full max-w-[600px] sticky top-8 space-y-4">
                  <div className="rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] ring-1 ring-black/5 overflow-hidden">
                    <PosterRenderer
                      ref={posterRef}
                      data={githubData}
                      config={config}
                    />
                  </div>

                  {/* Agent stats summary */}
                  {(userAgentStats || githubData.agentStats)?.agentCommits != null &&
                    (userAgentStats || githubData.agentStats)!.agentCommits > 0 && (
                    <div className="rounded-lg border border-border bg-card p-4 text-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-medium text-xs tracking-widest uppercase text-muted-foreground">
                          {userAgentStats ? "Agent Stats" : "Agent Activity Detected"}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(userAgentStats || githubData.agentStats)!.agentBreakdown.map((agent) => (
                          <div key={agent.agent} className="flex items-center justify-between">
                            <span className="text-foreground">{agent.label}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {agent.count} session{agent.count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {loading && !githubData && (
                <div className="w-full max-w-[600px] aspect-[3/4] rounded-sm bg-muted animate-pulse flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Controls sidebar */}
            <div className="lg:col-span-4">
              {githubData && (
                <div className="sticky top-8">
                  <div className="rounded-lg border border-border bg-card p-6">
                    <PosterControls
                      config={config}
                      onChange={setConfig}
                      onExportPng={handleExportPng}
                      onExportPdf={handleExportPdf}
                      onSaveConfig={handleSaveConfig}
                      isExporting={isExporting}
                      agentStats={userAgentStats || githubData?.agentStats || null}
                      onAgentStatsChange={handleAgentStatsChange}
                      onVariantSelect={handleVariantSelect}
                      isCycling={!hasUserSelectedVariant}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <GeneratePageInner />
    </Suspense>
  );
}
