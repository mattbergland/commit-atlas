/**
 * Git commit analysis for detecting AI agent usage from commit history.
 * Fetches recent commits via GitHub APIs and runs agent detection heuristics.
 */

import { detectAgentFromCommit } from "./agent-detection";
import type { ActivitySource } from "@/types/activity";

const GITHUB_REST = "https://api.github.com";

/** Summary of agent usage detected from commit history */
export interface AgentStats {
  /** Total commits analyzed */
  totalAnalyzed: number;
  /** Commits attributed to human-only work */
  humanCommits: number;
  /** Commits with detected agent involvement */
  agentCommits: number;
  /** Breakdown by detected agent */
  agentBreakdown: { agent: ActivitySource; label: string; count: number }[];
  /** Example commit messages that triggered detection (for transparency) */
  detectedPatterns: string[];
}

/** Agent label mapping */
const AGENT_LABELS: Record<string, string> = {
  claude_code: "Claude Code",
  devin: "Devin",
  cursor: "Cursor",
  windsurf: "Windsurf",
  copilot: "GitHub Copilot",
  github: "GitHub",
  cli: "CLI",
};

/**
 * Fetch recent push events for a user via GitHub Events API.
 * Returns commit messages from public push events (last 90 days, max 300).
 */
async function fetchCommitMessagesFromEvents(
  username: string,
  year: number,
  token?: string
): Promise<string[]> {
  const messages: string[] = [];
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `bearer ${token}`;

  try {
    // Fetch up to 3 pages of events (30 per page = 90 events)
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(
        `${GITHUB_REST}/users/${username}/events/public?per_page=30&page=${page}`,
        { headers }
      );
      if (!res.ok) break;

      const events = await res.json();
      if (!Array.isArray(events) || events.length === 0) break;

      for (const event of events) {
        if (event.type !== "PushEvent") continue;

        // Filter to the requested year
        const eventDate = new Date(event.created_at);
        if (eventDate.getFullYear() !== year) continue;

        const commits = event.payload?.commits;
        if (!Array.isArray(commits)) continue;

        for (const commit of commits) {
          if (commit.message && typeof commit.message === "string") {
            messages.push(commit.message);
          }
        }
      }
    }
  } catch {
    // Events API may fail for various reasons — non-fatal
  }

  return messages;
}

/**
 * Fetch commit messages from a user's recent repositories.
 * Fetches commits authored by the user from their most recently updated repos.
 */
async function fetchCommitMessagesFromRepos(
  username: string,
  year: number,
  token?: string
): Promise<string[]> {
  const messages: string[] = [];
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) headers.Authorization = `bearer ${token}`;

  try {
    // Get user's most recently updated repos
    const reposRes = await fetch(
      `${GITHUB_REST}/users/${username}/repos?per_page=10&sort=updated&direction=desc`,
      { headers }
    );
    if (!reposRes.ok) return messages;

    const repos = await reposRes.json();
    if (!Array.isArray(repos)) return messages;

    const since = `${year}-01-01T00:00:00Z`;
    const until = `${year}-12-31T23:59:59Z`;

    // Fetch recent commits from each repo (limit to 5 repos to stay within rate limits)
    const reposToCheck = repos.slice(0, 5);

    for (const repo of reposToCheck) {
      if (!repo.full_name) continue;

      try {
        const commitsRes = await fetch(
          `${GITHUB_REST}/repos/${repo.full_name}/commits?author=${username}&since=${since}&until=${until}&per_page=30`,
          { headers }
        );
        if (!commitsRes.ok) continue;

        const commits = await commitsRes.json();
        if (!Array.isArray(commits)) continue;

        for (const commit of commits) {
          const msg = commit.commit?.message;
          if (msg && typeof msg === "string") {
            messages.push(msg);
          }
        }
      } catch {
        // Individual repo fetch failure is non-fatal
      }
    }
  } catch {
    // Repos API failure is non-fatal
  }

  return messages;
}

/**
 * Analyze commit messages to detect agent usage.
 * Combines data from GitHub Events API and repo commit history.
 */
export async function analyzeCommits(
  username: string,
  year: number,
  token?: string
): Promise<AgentStats> {
  // Fetch commit messages from both sources in parallel
  const [eventMessages, repoMessages] = await Promise.all([
    fetchCommitMessagesFromEvents(username, year, token),
    fetchCommitMessagesFromRepos(username, year, token),
  ]);

  // Deduplicate by using a Set of messages
  const allMessages = [...new Set([...eventMessages, ...repoMessages])];

  // Run agent detection on each message
  const agentCounts: Record<string, number> = {};
  const detectedPatterns: string[] = [];
  let agentCommitCount = 0;

  for (const message of allMessages) {
    const detection = detectAgentFromCommit(message);
    if (detection) {
      agentCommitCount++;
      agentCounts[detection.agent] = (agentCounts[detection.agent] || 0) + 1;

      // Keep up to 3 example patterns (first line only, truncated)
      if (detectedPatterns.length < 3) {
        const firstLine = message.split("\n")[0].slice(0, 80);
        detectedPatterns.push(firstLine);
      }
    }
  }

  // Build agent breakdown sorted by count
  const agentBreakdown = Object.entries(agentCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([agent, count]) => ({
      agent: agent as ActivitySource,
      label: AGENT_LABELS[agent] || agent,
      count,
    }));

  return {
    totalAnalyzed: allMessages.length,
    humanCommits: allMessages.length - agentCommitCount,
    agentCommits: agentCommitCount,
    agentBreakdown,
    detectedPatterns,
  };
}
