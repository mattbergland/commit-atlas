/**
 * Optional metadata section for posters showing agent/CLI activity.
 * Renders subtle, premium metadata at the bottom of poster SVGs.
 */

import type { ActivityMetrics } from "@/types/activity";
import type { ColorPalette } from "@/types/github";

interface PosterMetadataProps {
  metrics: ActivityMetrics | null;
  palette: ColorPalette;
  showAgentMetadata: boolean;
  /** SVG y position to render at */
  y: number;
  /** SVG width */
  width: number;
}

export default function PosterMetadata({
  metrics,
  palette,
  showAgentMetadata,
  y,
  width,
}: PosterMetadataProps) {
  if (!showAgentMetadata || !metrics) return null;

  // Only show if there's agent or CLI data
  const hasAgentData = metrics.agentSessions > 0 || metrics.topAgents.length > 0;
  const hasCliData = metrics.cliCommands > 0;

  if (!hasAgentData && !hasCliData) return null;

  const dimColor = `${palette.metadata}88`; // 53% opacity
  const fontSize = width * 0.012;
  const padding = width * 0.06;
  const lineHeight = fontSize * 1.8;

  // Build metadata lines
  const lines: string[] = [];

  if (hasAgentData) {
    const primaryAgent = metrics.topAgents[0];
    if (primaryAgent) {
      const agentLabel =
        primaryAgent.name === "claude_code"
          ? "Claude Code"
          : primaryAgent.name === "devin"
            ? "Devin"
            : primaryAgent.name.charAt(0).toUpperCase() +
              primaryAgent.name.slice(1);
      lines.push(`Built with ${agentLabel}`);
    }

    if (metrics.agentSessions > 0) {
      lines.push(
        `${metrics.agentSessions} agent-assisted session${metrics.agentSessions !== 1 ? "s" : ""}`
      );
    }

    const total =
      metrics.humanCommits + metrics.agentCommits + metrics.mixedCommits;
    if (total > 0) {
      const humanPct = Math.round(
        ((metrics.humanCommits + metrics.mixedCommits * 0.5) / total) * 100
      );
      lines.push(`${humanPct}% human / ${100 - humanPct}% agent`);
    }
  }

  if (hasCliData) {
    lines.push(
      `${metrics.cliCommands} CLI command${metrics.cliCommands !== 1 ? "s" : ""}`
    );
  }

  if (metrics.deepWorkDays > 0) {
    lines.push(
      `${metrics.deepWorkDays} deep work day${metrics.deepWorkDays !== 1 ? "s" : ""}`
    );
  }

  if (metrics.longestBuildStreak > 0) {
    lines.push(`${metrics.longestBuildStreak}d build streak`);
  }

  if (lines.length === 0) return null;

  // Render as a subtle line at the bottom
  const metaText = lines.join("  ·  ");

  return (
    <g>
      {/* Divider line */}
      <line
        x1={padding}
        y1={y}
        x2={width - padding}
        y2={y}
        stroke={dimColor}
        strokeWidth={0.5}
      />
      {/* Metadata text */}
      <text
        x={padding}
        y={y + lineHeight}
        fill={dimColor}
        fontSize={fontSize}
        fontFamily="'SF Mono', 'Fira Code', 'JetBrains Mono', monospace"
        letterSpacing="0.05em"
      >
        {metaText}
      </text>
    </g>
  );
}
