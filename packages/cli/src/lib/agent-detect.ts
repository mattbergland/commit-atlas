/**
 * Agent detection heuristics for the CLI tool.
 * Detects Claude Code, Devin, Cursor, Windsurf from environment and commands.
 */

type AgentSource = "claude_code" | "devin" | "cursor" | "windsurf";

/** Environment variable indicators for agents */
const ENV_INDICATORS: { key: string; agent: AgentSource }[] = [
  { key: "CLAUDE_CODE", agent: "claude_code" },
  { key: "CLAUDE_SESSION", agent: "claude_code" },
  { key: "CURSOR_SESSION", agent: "cursor" },
  { key: "CURSOR_TRACE_ID", agent: "cursor" },
  { key: "WINDSURF_SESSION", agent: "windsurf" },
  { key: "DEVIN_SESSION", agent: "devin" },
  { key: "DEVIN_ENV", agent: "devin" },
];

/** Command patterns that suggest agent usage */
const COMMAND_PATTERNS: { pattern: RegExp; agent: AgentSource }[] = [
  { pattern: /\bclaude\b/i, agent: "claude_code" },
  { pattern: /\banthropic\b/i, agent: "claude_code" },
  { pattern: /\bcursor\b/i, agent: "cursor" },
  { pattern: /\bwindsurf\b/i, agent: "windsurf" },
  { pattern: /\bcascade\b/i, agent: "windsurf" },
  { pattern: /\bdevin\b/i, agent: "devin" },
];

/** Commit message patterns that suggest agent involvement */
const COMMIT_PATTERNS: { pattern: RegExp; agent: AgentSource }[] = [
  { pattern: /co-authored-by:.*claude/i, agent: "claude_code" },
  { pattern: /\[claude\]/i, agent: "claude_code" },
  { pattern: /co-authored-by:.*devin/i, agent: "devin" },
  { pattern: /\[devin\]/i, agent: "devin" },
  { pattern: /\[cursor\]/i, agent: "cursor" },
  { pattern: /\[windsurf\]/i, agent: "windsurf" },
];

/** Detect agent from environment variables */
export function detectFromEnv(): AgentSource | null {
  for (const { key, agent } of ENV_INDICATORS) {
    if (process.env[key]) return agent;
  }
  return null;
}

/** Detect agent from a command string */
export function detectFromCommand(command: string): AgentSource | null {
  for (const { pattern, agent } of COMMAND_PATTERNS) {
    if (pattern.test(command)) return agent;
  }
  return null;
}

/** Detect agent from a commit message */
export function detectFromCommitMessage(
  message: string
): AgentSource | null {
  for (const { pattern, agent } of COMMIT_PATTERNS) {
    if (pattern.test(message)) return agent;
  }
  return null;
}

/** Get human-readable agent name */
export function getAgentLabel(agent: AgentSource): string {
  const labels: Record<AgentSource, string> = {
    claude_code: "Claude Code",
    devin: "Devin",
    cursor: "Cursor",
    windsurf: "Windsurf",
  };
  return labels[agent];
}
