/**
 * `commit-atlas log` command
 * Manually log an activity event or record CLI-tracked events.
 */

import { readFileSync } from "node:fs";
import chalk from "chalk";
import {
  addEvent,
  generateEventId,
  readConfig,
  type StoredEvent,
} from "../lib/store.js";
import { sanitizeCommand } from "../lib/privacy.js";
import { detectFromCommand, detectFromEnv, detectFromCommitMessage } from "../lib/agent-detect.js";
import { categorizeCommand, isMeaningfulCommand } from "../lib/categorize.js";

interface LogOptions {
  source?: string;
  eventType?: string;
  command?: string;
  agent?: string;
  repo?: string;
  branch?: string;
  filesChanged?: string;
  additions?: string;
  deletions?: string;
  duration?: string;
  cwd?: string;
  exitCode?: string;
  message?: string;
  messageFile?: string;
  quiet?: boolean;
}

export async function logCommand(options: LogOptions): Promise<void> {
  const config = readConfig();

  if (!config.trackingEnabled) {
    if (!options.quiet) {
      console.log(chalk.yellow("  Tracking is disabled. Run `commit-atlas init` to enable."));
    }
    return;
  }

  // Read message from file if --message-file was provided
  if (!options.message && options.messageFile) {
    try {
      options.message = readFileSync(options.messageFile, "utf-8").trim();
    } catch {
      // If file can't be read, continue without message
    }
  }

  // Determine the command to log
  const rawCommand = options.command ?? "";

  // For CLI-sourced events, check if the command is meaningful
  if (options.source === "cli" && rawCommand) {
    if (!isMeaningfulCommand(rawCommand)) return;
  }

  // Privacy filter the command
  const sanitized = rawCommand ? sanitizeCommand(rawCommand) : null;
  if (rawCommand && !sanitized) {
    // Command was filtered out for privacy
    return;
  }

  // Detect agent from command, environment, or explicit flag
  let agentName: string | undefined;
  let actor: "human" | "agent" | "mixed" = "human";

  if (options.agent) {
    agentName = options.agent;
    actor = "agent";
  } else {
    const envAgent = detectFromEnv();
    if (envAgent) {
      agentName = envAgent;
      actor = "agent";
    } else if (sanitized) {
      const cmdAgent = detectFromCommand(sanitized);
      if (cmdAgent) {
        agentName = cmdAgent;
        actor = "mixed";
      }
    }

    // Fallback: check commit message for agent signatures
    if (!agentName && options.message) {
      const msgAgent = detectFromCommitMessage(options.message);
      if (msgAgent) {
        agentName = msgAgent;
        actor = "mixed";
      }
    }
  }

  // Determine event type
  const eventType = options.eventType ?? (rawCommand ? "command" : "workflow");

  // Categorize command
  const commandCategory = sanitized
    ? categorizeCommand(sanitized)
    : undefined;

  // Infer repo from cwd
  const repo = options.repo ?? inferRepoName(options.cwd);
  const branch = options.branch ?? inferBranchName(options.cwd);

  const event: StoredEvent = {
    id: generateEventId(),
    timestamp: new Date().toISOString(),
    source: (options.source as StoredEvent["source"]) ?? "cli",
    repo: repo ?? undefined,
    branch: branch ?? undefined,
    actor,
    agentName,
    eventType: eventType as StoredEvent["eventType"],
    filesChanged: options.filesChanged
      ? parseInt(options.filesChanged, 10)
      : undefined,
    additions: options.additions
      ? parseInt(options.additions, 10)
      : undefined,
    deletions: options.deletions
      ? parseInt(options.deletions, 10)
      : undefined,
    command: sanitized ?? undefined,
    commandCategory,
    durationMs: options.duration
      ? parseInt(options.duration, 10) * 1000
      : undefined,
    metadata: {
      ...(options.exitCode !== undefined && {
        exitCode: parseInt(options.exitCode, 10),
      }),
      ...(options.message && { commitMessage: options.message }),
    },
  };

  addEvent(event);

  if (!options.quiet) {
    console.log(chalk.green("  Event logged successfully."));
    console.log(chalk.dim(`  ID: ${event.id}`));
    console.log(chalk.dim(`  Source: ${event.source}`));
    console.log(chalk.dim(`  Type: ${event.eventType}`));
    if (event.agentName) {
      console.log(chalk.dim(`  Agent: ${event.agentName}`));
    }
  }
}

/** Try to infer the repo name from the working directory */
function inferRepoName(cwd?: string): string | null {
  if (!cwd) return null;
  try {
    // Extract repo name from path (last directory name)
    const parts = cwd.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

/** Try to infer the branch name (placeholder — real implementation uses git) */
function inferBranchName(cwd?: string): string | null {
  void cwd;
  // In a real implementation, this would run `git rev-parse --abbrev-ref HEAD`
  // For now, return null and let the git hook provide branch info
  return null;
}
