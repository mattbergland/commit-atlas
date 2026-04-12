"use client";

import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Camera,
  PenLine,
  Loader2,
  X,
  Plus,
  HelpCircle,
} from "lucide-react";
import type { AgentStats } from "@/lib/commit-analysis";

/** Agent options for manual entry */
const AGENT_OPTIONS = [
  { value: "claude_code", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "copilot", label: "GitHub Copilot" },
  { value: "windsurf", label: "Windsurf" },
  { value: "devin", label: "Devin" },
] as const;

/** Help text for finding stats in each tool */
const STATS_HELP: Record<string, string> = {
  claude_code: "Run 'claude usage' or check console.anthropic.com → Usage",
  cursor: "Settings → Usage or billing dashboard",
  copilot: "github.com → Settings → Copilot → Usage",
  windsurf: "Settings → Account → Usage stats",
  devin: "app.devin.ai → Sessions dashboard",
};

interface ManualAgentEntry {
  agent: string;
  sessions: string;
}

interface AgentStatsInputProps {
  onStatsChange: (stats: AgentStats | null) => void;
  currentStats: AgentStats | null;
}

export default function AgentStatsInput({
  onStatsChange,
  currentStats,
}: AgentStatsInputProps) {
  const [mode, setMode] = useState<"screenshot" | "manual">("screenshot");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    null
  );
  const [manualEntries, setManualEntries] = useState<ManualAgentEntry[]>([
    { agent: "claude_code", sessions: "" },
  ]);
  const [showHelp, setShowHelp] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotUpload = async (file: File) => {
    setError(null);
    setIsAnalyzing(true);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setScreenshotPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("screenshot", file);

      const res = await fetch("/api/analyze-screenshot", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.success && json.data && json.data.length > 0) {
        // Convert extracted data to AgentStats format
        const agentCounts: Record<string, number> = {};
        let totalSessions = 0;

        for (const item of json.data) {
          const toolKey = normalizeToolName(item.toolName);
          const count =
            item.sessions || item.completions || item.linesGenerated || 1;
          agentCounts[toolKey] = (agentCounts[toolKey] || 0) + count;
          totalSessions += count;
        }

        const agentBreakdown = Object.entries(agentCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([agent, count]) => ({
            agent: agent as AgentStats["agentBreakdown"][0]["agent"],
            label: getAgentLabel(agent),
            count,
          }));

        const stats: AgentStats = {
          totalAnalyzed: totalSessions,
          humanCommits: 0,
          agentCommits: totalSessions,
          agentBreakdown,
          detectedPatterns: [`Extracted from screenshot: ${json.data.map((d: { toolName: string }) => d.toolName).join(", ")}`],
        };

        onStatsChange(stats);
      } else {
        setError(
          json.error ||
            "Could not detect any agent stats. Try a clearer screenshot or use manual entry."
        );
      }
    } catch {
      setError("Failed to analyze screenshot. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleScreenshotUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      handleScreenshotUpload(file);
    }
  };

  const handleManualApply = () => {
    const agentCounts: Record<string, number> = {};
    let totalSessions = 0;

    for (const entry of manualEntries) {
      const count = parseInt(entry.sessions);
      if (count > 0 && entry.agent) {
        agentCounts[entry.agent] = (agentCounts[entry.agent] || 0) + count;
        totalSessions += count;
      }
    }

    if (totalSessions === 0) {
      onStatsChange(null);
      return;
    }

    const agentBreakdown = Object.entries(agentCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([agent, count]) => ({
        agent: agent as AgentStats["agentBreakdown"][0]["agent"],
        label: getAgentLabel(agent),
        count,
      }));

    const stats: AgentStats = {
      totalAnalyzed: totalSessions,
      humanCommits: 0,
      agentCommits: totalSessions,
      agentBreakdown,
      detectedPatterns: ["Manually entered"],
    };

    onStatsChange(stats);
  };

  const addManualEntry = () => {
    // Find first unused agent
    const usedAgents = new Set(manualEntries.map((e) => e.agent));
    const nextAgent =
      AGENT_OPTIONS.find((a) => !usedAgents.has(a.value))?.value ||
      "claude_code";
    setManualEntries([...manualEntries, { agent: nextAgent, sessions: "" }]);
  };

  const removeManualEntry = (index: number) => {
    if (manualEntries.length <= 1) return;
    setManualEntries(manualEntries.filter((_, i) => i !== index));
  };

  const updateManualEntry = (
    index: number,
    field: keyof ManualAgentEntry,
    value: string
  ) => {
    const updated = [...manualEntries];
    updated[index] = { ...updated[index], [field]: value };
    setManualEntries(updated);
  };

  const handleClear = () => {
    onStatsChange(null);
    setScreenshotPreview(null);
    setError(null);
    setManualEntries([{ agent: "claude_code", sessions: "" }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
          Agent Stats
        </Label>
        {currentStats && (
          <button
            onClick={handleClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <button
          onClick={() => setMode("screenshot")}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all cursor-pointer ${
            mode === "screenshot"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Camera className="w-3 h-3" />
          Screenshot
        </button>
        <button
          onClick={() => setMode("manual")}
          className={`flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-all cursor-pointer ${
            mode === "manual"
              ? "bg-background text-foreground shadow-sm font-medium"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenLine className="w-3 h-3" />
          Manual
        </button>
      </div>

      {/* Screenshot mode */}
      {mode === "screenshot" && (
        <div className="space-y-2">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-all cursor-pointer ${
              isAnalyzing
                ? "border-foreground/30 bg-muted"
                : screenshotPreview
                  ? "border-foreground/20 bg-muted/50"
                  : "border-border hover:border-foreground/30 hover:bg-muted/50"
            }`}
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Analyzing screenshot…
                </span>
              </div>
            ) : screenshotPreview ? (
              <div className="w-full space-y-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={screenshotPreview}
                    alt="Uploaded screenshot"
                    className="w-full rounded-md object-contain max-h-32"
                  />
                <p className="text-xs text-center text-muted-foreground">
                  Click to upload a different screenshot
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-2">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">
                    Drop a screenshot here
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    or click to browse
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Upload a screenshot of your agent&apos;s stats page (Claude Code
            usage, Cursor dashboard, etc.) and we&apos;ll extract the data
            automatically.
          </p>
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="space-y-3">
          {manualEntries.map((entry, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <select
                  value={entry.agent}
                  onChange={(e) =>
                    updateManualEntry(index, "agent", e.target.value)
                  }
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                >
                  {AGENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  placeholder="Sessions"
                  value={entry.sessions}
                  onChange={(e) =>
                    updateManualEntry(index, "sessions", e.target.value)
                  }
                  className="w-24 text-xs h-7"
                />
                <button
                  onClick={() =>
                    setShowHelp(showHelp === entry.agent ? null : entry.agent)
                  }
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Where to find stats"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                {manualEntries.length > 1 && (
                  <button
                    onClick={() => removeManualEntry(index)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {showHelp === entry.agent && STATS_HELP[entry.agent] && (
                <p className="text-[10px] text-muted-foreground pl-1 italic">
                  {STATS_HELP[entry.agent]}
                </p>
              )}
            </div>
          ))}

          <div className="flex gap-2">
            {manualEntries.length < AGENT_OPTIONS.length && (
              <button
                onClick={addManualEntry}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add agent
              </button>
            )}
          </div>

          <button
            onClick={handleManualApply}
            className="w-full rounded-lg bg-foreground text-background px-3 py-2 text-xs font-medium transition-all hover:opacity-90 cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-md px-2 py-1.5">
          {error}
        </p>
      )}
    </div>
  );
}

/** Normalize tool names from screenshot extraction to our internal keys */
function normalizeToolName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("claude")) return "claude_code";
  if (lower.includes("cursor")) return "cursor";
  if (lower.includes("copilot")) return "copilot";
  if (lower.includes("windsurf") || lower.includes("cascade"))
    return "windsurf";
  if (lower.includes("devin")) return "devin";
  return "claude_code"; // Default fallback
}

/** Get display label for an agent key */
function getAgentLabel(agent: string): string {
  const labels: Record<string, string> = {
    claude_code: "Claude Code",
    cursor: "Cursor",
    copilot: "GitHub Copilot",
    windsurf: "Windsurf",
    devin: "Devin",
  };
  return labels[agent] || agent;
}
