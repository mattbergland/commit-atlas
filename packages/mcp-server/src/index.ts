#!/usr/bin/env node

/**
 * Commit Atlas MCP Server
 *
 * Provides tools for Cursor, Windsurf, and other MCP-compatible clients
 * to record agent sessions, CLI events, and builds.
 *
 * Tools:
 *   - record_agent_session: Record an agent coding session
 *   - record_cli_event: Record a CLI/terminal event
 *   - record_build: Record a build/test/deploy event
 *   - generate_poster_payload: Generate poster data from recorded events
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Types (self-contained to avoid cross-package deps)
interface StoredEvent {
  id: string;
  timestamp: string;
  source: string;
  repo?: string;
  branch?: string;
  actor: string;
  agentName?: string;
  eventType: string;
  filesChanged?: number;
  additions?: number;
  deletions?: number;
  command?: string;
  commandCategory?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

// Storage helpers
const CONFIG_DIR = join(homedir(), ".commit-atlas");
const EVENTS_FILE = join(CONFIG_DIR, "events.json");

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function readEvents(): StoredEvent[] {
  ensureConfigDir();
  if (!existsSync(EVENTS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(EVENTS_FILE, "utf-8")) as StoredEvent[];
  } catch {
    return [];
  }
}

function addEvent(event: StoredEvent): void {
  const events = readEvents();
  events.push(event);
  writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

function generateId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Create MCP server
const server = new Server(
  {
    name: "commit-atlas",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "record_agent_session",
      description:
        "Record an AI agent coding session (start or end). Use this when an agent begins or finishes working on code.",
      inputSchema: {
        type: "object" as const,
        properties: {
          action: {
            type: "string",
            enum: ["start", "end"],
            description: "Whether the session is starting or ending",
          },
          agentName: {
            type: "string",
            enum: ["cursor", "windsurf", "devin", "claude_code"],
            description: "Name of the AI agent",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          branch: {
            type: "string",
            description: "Branch name",
          },
          filesChanged: {
            type: "number",
            description: "Number of files changed (for session end)",
          },
          additions: {
            type: "number",
            description: "Lines added (for session end)",
          },
          deletions: {
            type: "number",
            description: "Lines deleted (for session end)",
          },
        },
        required: ["action", "agentName"],
      },
    },
    {
      name: "record_cli_event",
      description:
        "Record a CLI/terminal event. Use this to track meaningful development commands.",
      inputSchema: {
        type: "object" as const,
        properties: {
          command: {
            type: "string",
            description:
              "The command that was executed (sensitive parts will be masked)",
          },
          category: {
            type: "string",
            enum: ["build", "test", "deploy", "edit", "git", "other"],
            description: "Category of the command",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          branch: {
            type: "string",
            description: "Branch name",
          },
          durationMs: {
            type: "number",
            description: "Duration in milliseconds",
          },
          exitCode: {
            type: "number",
            description: "Command exit code",
          },
        },
        required: ["command"],
      },
    },
    {
      name: "record_build",
      description:
        "Record a build, test, or deploy event. Use this to track CI/CD and build activity.",
      inputSchema: {
        type: "object" as const,
        properties: {
          buildType: {
            type: "string",
            enum: ["build", "test", "deploy"],
            description: "Type of build activity",
          },
          repo: {
            type: "string",
            description: "Repository name",
          },
          branch: {
            type: "string",
            description: "Branch name",
          },
          success: {
            type: "boolean",
            description: "Whether the build succeeded",
          },
          durationMs: {
            type: "number",
            description: "Duration in milliseconds",
          },
          command: {
            type: "string",
            description: "The build command that was run",
          },
        },
        required: ["buildType"],
      },
    },
    {
      name: "generate_poster_payload",
      description:
        "Generate a poster data payload from recorded events. Returns metrics and event summaries for poster generation.",
      inputSchema: {
        type: "object" as const,
        properties: {
          repo: {
            type: "string",
            description:
              "Filter events by repository name (optional, returns all if not specified)",
          },
          since: {
            type: "string",
            description:
              "Filter events after this date (ISO 8601, optional)",
          },
        },
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "record_agent_session": {
      const typedArgs = args as {
        action: string;
        agentName: string;
        repo?: string;
        branch?: string;
        filesChanged?: number;
        additions?: number;
        deletions?: number;
      };
      const event: StoredEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: typedArgs.agentName,
        repo: typedArgs.repo,
        branch: typedArgs.branch,
        actor: "agent",
        agentName: typedArgs.agentName,
        eventType:
          typedArgs.action === "start" ? "session_start" : "session_end",
        filesChanged: typedArgs.filesChanged,
        additions: typedArgs.additions,
        deletions: typedArgs.deletions,
      };
      addEvent(event);
      return {
        content: [
          {
            type: "text",
            text: `Agent session ${typedArgs.action}ed. Event ID: ${event.id}`,
          },
        ],
      };
    }

    case "record_cli_event": {
      const typedArgs = args as {
        command: string;
        category?: string;
        repo?: string;
        branch?: string;
        durationMs?: number;
        exitCode?: number;
      };
      const event: StoredEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: "cli",
        repo: typedArgs.repo,
        branch: typedArgs.branch,
        actor: "human",
        eventType: "command",
        command: typedArgs.command,
        commandCategory: typedArgs.category,
        durationMs: typedArgs.durationMs,
        metadata: typedArgs.exitCode !== undefined
          ? { exitCode: typedArgs.exitCode }
          : undefined,
      };
      addEvent(event);
      return {
        content: [
          {
            type: "text",
            text: `CLI event recorded. Event ID: ${event.id}`,
          },
        ],
      };
    }

    case "record_build": {
      const typedArgs = args as {
        buildType: string;
        repo?: string;
        branch?: string;
        success?: boolean;
        durationMs?: number;
        command?: string;
      };
      const event: StoredEvent = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        source: "cli",
        repo: typedArgs.repo,
        branch: typedArgs.branch,
        actor: "human",
        eventType: "workflow",
        command: typedArgs.command,
        commandCategory: typedArgs.buildType,
        durationMs: typedArgs.durationMs,
        metadata: {
          buildType: typedArgs.buildType,
          success: typedArgs.success,
        },
      };
      addEvent(event);
      return {
        content: [
          {
            type: "text",
            text: `Build event recorded. Event ID: ${event.id}`,
          },
        ],
      };
    }

    case "generate_poster_payload": {
      const typedArgs = args as {
        repo?: string;
        since?: string;
      };
      let events = readEvents();

      // Filter by repo
      if (typedArgs.repo) {
        events = events.filter((e) => e.repo === typedArgs.repo);
      }

      // Filter by date
      if (typedArgs.since) {
        const sinceDate = new Date(typedArgs.since).getTime();
        events = events.filter(
          (e) => new Date(e.timestamp).getTime() >= sinceDate
        );
      }

      // Compute metrics
      const totalEvents = events.length;
      const commits = events.filter((e) => e.eventType === "commit").length;
      const sessions = events.filter(
        (e) =>
          e.eventType === "session_start" || e.eventType === "session_end"
      ).length;
      const commands = events.filter((e) => e.eventType === "command").length;
      const agentEvents = events.filter((e) => e.actor === "agent").length;
      const humanEvents = events.filter((e) => e.actor === "human").length;

      const mixedEvents = events.filter((e) => e.actor === "mixed").length;
      const humanPct = totalEvents > 0
        ? Math.round(((humanEvents + mixedEvents * 0.5) / totalEvents) * 100)
        : 0;

      const payload = {
        totalEvents,
        commits,
        sessions: Math.floor(sessions / 2), // start + end = 1 session
        commands,
        agentEvents,
        humanEvents,
        humanAgentRatio:
          totalEvents > 0
            ? `${humanPct}% human / ${100 - humanPct}% agent`
            : "No data",
        events: events.slice(-100), // Last 100 events
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
          },
        ],
        isError: true,
      };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
