"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  X,
  Plus,
  HelpCircle,
} from "lucide-react";
import type { AgentStats } from "@/lib/commit-analysis";

/** Per-agent field definitions — based on real stats pages */
const AGENT_CONFIGS = [
  {
    value: "windsurf" as const,
    label: "Windsurf",
    fields: [
      { key: "sessions", label: "Conversations", placeholder: "e.g. 27" },
      { key: "linesOfCode", label: "Lines written", placeholder: "e.g. 57019" },
      { key: "messages", label: "Messages sent", placeholder: "e.g. 516" },
    ],
    help: "windsurf.com → Profile → Account Activity. Look for Total Cascade conversations, Total lines of code written, and Total messages sent.",
  },
  {
    value: "devin" as const,
    label: "Devin",
    fields: [
      { key: "sessions", label: "Sessions", placeholder: "e.g. 21" },
      { key: "prsCreated", label: "PRs created", placeholder: "e.g. 10" },
      { key: "bugsFound", label: "Bugs found", placeholder: "e.g. 209" },
    ],
    help: "app.devin.ai → Settings → Analytics → Activity. Look for Number of sessions, PRs created, and Bugs found.",
  },
  {
    value: "cursor" as const,
    label: "Cursor",
    fields: [
      { key: "sessions", label: "Sessions", placeholder: "e.g. 50" },
      { key: "linesOfCode", label: "Lines generated", placeholder: "e.g. 12000" },
    ],
    help: "Cursor → Settings → Usage. Look for total sessions and lines of code generated.",
  },
  {
    value: "claude_code" as const,
    label: "Claude Code",
    fields: [
      { key: "sessions", label: "Sessions", placeholder: "e.g. 30" },
      { key: "messages", label: "Messages", placeholder: "e.g. 500" },
    ],
    help: "Run 'claude usage' in terminal or check console.anthropic.com → Usage for session and message counts.",
  },
  {
    value: "copilot" as const,
    label: "GitHub Copilot",
    fields: [
      { key: "sessions", label: "Sessions", placeholder: "e.g. 100" },
      { key: "linesOfCode", label: "Lines accepted", placeholder: "e.g. 5000" },
    ],
    help: "github.com → Settings → Copilot → Usage. Look for total suggestions accepted and lines of code.",
  },
];

type AgentValue = (typeof AGENT_CONFIGS)[number]["value"];

interface ManualAgentEntry {
  agent: AgentValue;
  values: Record<string, string>;
}

interface AgentStatsInputProps {
  onStatsChange: (stats: AgentStats | null) => void;
  currentStats: AgentStats | null;
}

export default function AgentStatsInput({
  onStatsChange,
  currentStats,
}: AgentStatsInputProps) {
  const [entries, setEntries] = useState<ManualAgentEntry[]>([]);
  const [expandedHelp, setExpandedHelp] = useState<string | null>(null);

  const getAgentConfig = (agent: string) =>
    AGENT_CONFIGS.find((a) => a.value === agent);

  const applyStats = (updatedEntries: ManualAgentEntry[]) => {
    const agentCounts: Record<string, number> = {};
    let totalSessions = 0;

    for (const entry of updatedEntries) {
      const agentConf = getAgentConfig(entry.agent);
      if (!agentConf) continue;

      let count = 0;
      const sessionsVal = parseInt(entry.values["sessions"] || "0");
      if (sessionsVal > 0) {
        count = sessionsVal;
      } else {
        // Use first non-empty numeric field
        for (const field of agentConf.fields) {
          const val = parseInt(entry.values[field.key] || "0");
          if (val > 0) {
            count = val;
            break;
          }
        }
      }

      if (count > 0) {
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
        label: getAgentConfig(agent)?.label || agent,
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

  const addAgent = (agent: AgentValue) => {
    const updated = [...entries, { agent, values: {} }];
    setEntries(updated);
  };

  const removeAgent = (index: number) => {
    const updated = entries.filter((_, i) => i !== index);
    setEntries(updated);
    applyStats(updated);
  };

  const updateValue = (index: number, key: string, value: string) => {
    const updated = [...entries];
    updated[index] = {
      ...updated[index],
      values: { ...updated[index].values, [key]: value },
    };
    setEntries(updated);
    applyStats(updated);
  };

  const handleClear = () => {
    onStatsChange(null);
    setEntries([]);
    setExpandedHelp(null);
  };

  const usedAgents = new Set(entries.map((e) => e.agent));
  const availableAgents = AGENT_CONFIGS.filter((a) => !usedAgents.has(a.value));

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

      {/* Agent entries */}
      {entries.map((entry, index) => {
        const agentConfig = getAgentConfig(entry.agent);
        if (!agentConfig) return null;

        return (
          <div
            key={`${entry.agent}-${index}`}
            className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
          >
            {/* Agent header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                {agentConfig.label}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setExpandedHelp(
                      expandedHelp === entry.agent ? null : entry.agent
                    )
                  }
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Where to find these stats"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => removeAgent(index)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Help text */}
            {expandedHelp === entry.agent && (
              <p className="text-[10px] text-muted-foreground leading-relaxed italic bg-background/50 rounded px-2 py-1.5">
                {agentConfig.help}
              </p>
            )}

            {/* Input fields */}
            <div className="grid grid-cols-2 gap-2">
              {agentConfig.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">
                    {field.label}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder={field.placeholder}
                    value={entry.values[field.key] || ""}
                    onChange={(e) =>
                      updateValue(index, field.key, e.target.value)
                    }
                    className="text-xs h-7"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Add agent buttons */}
      {availableAgents.length > 0 && (
        <div className="space-y-1">
          {entries.length === 0 ? (
            <p className="text-[10px] text-muted-foreground mb-2">
              Add your AI coding tool stats to enrich your poster. Find these numbers in each tool&apos;s settings or usage page.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {availableAgents.map((agent) => (
              <button
                key={agent.value}
                onClick={() => addAgent(agent.value)}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-[10px] text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-all cursor-pointer"
              >
                <Plus className="w-2.5 h-2.5" />
                {agent.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
