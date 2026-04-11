/**
 * Local storage for Commit Atlas CLI.
 * Events and config are stored in ~/.commit-atlas/
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Activity source types */
type ActivitySource =
  | "github"
  | "cursor"
  | "windsurf"
  | "devin"
  | "claude_code"
  | "cli";

/** Actor types */
type ActorType = "human" | "agent" | "mixed";

/** Event types */
type ActivityEventType =
  | "commit"
  | "pr"
  | "session_start"
  | "session_end"
  | "command"
  | "workflow";

/** Command category */
type CommandCategory =
  | "build"
  | "test"
  | "deploy"
  | "edit"
  | "git"
  | "other";

/** A stored activity event */
export interface StoredEvent {
  id: string;
  timestamp: string;
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

/** CLI configuration */
export interface CliConfig {
  trackingEnabled: boolean;
  shellHooksInstalled: boolean;
  gitHooksInstalled: boolean;
  serverUrl?: string;
  localOnly: boolean;
}

const CONFIG_DIR = join(homedir(), ".commit-atlas");
const EVENTS_FILE = join(CONFIG_DIR, "events.json");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: CliConfig = {
  trackingEnabled: true,
  shellHooksInstalled: false,
  gitHooksInstalled: false,
  localOnly: true,
};

/** Ensure the config directory exists */
export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/** Read the CLI configuration */
export function readConfig(): CliConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as CliConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Write the CLI configuration */
export function writeConfig(config: CliConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

/** Read all stored events */
export function readEvents(): StoredEvent[] {
  ensureConfigDir();
  if (!existsSync(EVENTS_FILE)) {
    return [];
  }
  try {
    const raw = readFileSync(EVENTS_FILE, "utf-8");
    return JSON.parse(raw) as StoredEvent[];
  } catch {
    return [];
  }
}

/** Add an event to the local store */
export function addEvent(event: StoredEvent): void {
  const events = readEvents();
  events.push(event);
  writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

/** Clear all stored events */
export function clearEvents(): void {
  ensureConfigDir();
  writeFileSync(EVENTS_FILE, "[]");
}

/** Generate a unique event ID */
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Get the config directory path */
export function getConfigDir(): string {
  return CONFIG_DIR;
}
