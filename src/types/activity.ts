/** Sources of coding activity */
export type ActivitySource =
  | "github"
  | "cursor"
  | "windsurf"
  | "devin"
  | "claude_code"
  | "copilot"
  | "cli";

/** Who performed the activity */
export type ActorType = "human" | "agent" | "mixed";

/** Type of activity event */
export type ActivityEventType =
  | "commit"
  | "pr"
  | "session_start"
  | "session_end"
  | "command"
  | "workflow";

/** Command category for CLI events */
export type CommandCategory =
  | "build"
  | "test"
  | "deploy"
  | "edit"
  | "git"
  | "other";

/** A single normalized activity event */
export interface ActivityEvent {
  id: string;
  timestamp: string; // ISO 8601
  source: ActivitySource;
  repo?: string;
  branch?: string;
  actor: ActorType;
  agentName?: string;
  eventType: ActivityEventType;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  command?: string;
  commandCategory?: CommandCategory;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

/** Aggregated activity metrics for poster display */
export interface ActivityMetrics {
  totalSessions: number;
  cliCommands: number;
  agentSessions: number;
  deepWorkDays: number;
  longestBuildStreak: number;
  humanCommits: number;
  agentCommits: number;
  mixedCommits: number;
  topAgents: { name: string; sessions: number }[];
  topCommands: { command: string; count: number }[];
  sourceSummary: { source: ActivitySource; count: number }[];
}

/** Configuration for activity display on posters */
export interface ActivityConfig {
  sourceFilter: ActivitySource | "all";
  includeAgentActivity: boolean;
  includeCliActivity: boolean;
  showAgentMetadata: boolean;
}

/** Default activity configuration */
export const DEFAULT_ACTIVITY_CONFIG: ActivityConfig = {
  sourceFilter: "all",
  includeAgentActivity: true,
  includeCliActivity: true,
  showAgentMetadata: true,
};

/** All available source filter options */
export const SOURCE_FILTER_OPTIONS: {
  value: ActivitySource | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "github", label: "GitHub" },
  { value: "cli", label: "CLI" },
  { value: "claude_code", label: "Claude Code" },
  { value: "cursor", label: "Cursor" },
  { value: "windsurf", label: "Windsurf" },
  { value: "devin", label: "Devin" },
  { value: "copilot", label: "GitHub Copilot" },
];
