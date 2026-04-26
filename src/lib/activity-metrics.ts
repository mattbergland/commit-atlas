/**
 * Compute activity metrics from combined event data.
 */

import type {
  ActivityEvent,
  ActivityMetrics,
  ActivitySource,
} from "@/types/activity";

/** Time window (ms) for grouping events into sessions */
const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

/** Minimum events in a day to qualify as "deep work" */
const DEEP_WORK_THRESHOLD = 10;

/** Compute all activity metrics from a set of events */
export function computeActivityMetrics(
  events: ActivityEvent[]
): ActivityMetrics {
  if (events.length === 0) {
    return {
      totalSessions: 0,
      cliCommands: 0,
      agentSessions: 0,
      deepWorkDays: 0,
      longestBuildStreak: 0,
      humanCommits: 0,
      agentCommits: 0,
      mixedCommits: 0,
      topAgents: [],
      topCommands: [],
      sourceSummary: [],
    };
  }

  // Sort events by timestamp
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Count sessions (groups of events within SESSION_GAP_MS)
  let totalSessions = 1;
  let agentSessions = 0;
  let currentSessionHasAgent = sorted[0].actor === "agent";

  for (let i = 1; i < sorted.length; i++) {
    const gap =
      new Date(sorted[i].timestamp).getTime() -
      new Date(sorted[i - 1].timestamp).getTime();

    if (gap > SESSION_GAP_MS) {
      totalSessions++;
      if (currentSessionHasAgent) agentSessions++;
      currentSessionHasAgent = sorted[i].actor === "agent";
    } else if (sorted[i].actor === "agent") {
      currentSessionHasAgent = true;
    }
  }
  if (currentSessionHasAgent) agentSessions++;

  // CLI commands count
  const cliCommands = events.filter(
    (e) => e.source === "cli" && e.eventType === "command"
  ).length;

  // Commit attribution counts
  const commits = events.filter((e) => e.eventType === "commit");
  const humanCommits = commits.filter((e) => e.actor === "human").length;
  const agentCommits = commits.filter((e) => e.actor === "agent").length;
  const mixedCommits = commits.filter((e) => e.actor === "mixed").length;

  // Deep work days
  const eventsByDay = new Map<string, number>();
  for (const event of events) {
    const day = event.timestamp.slice(0, 10); // YYYY-MM-DD
    eventsByDay.set(day, (eventsByDay.get(day) ?? 0) + 1);
  }
  const deepWorkDays = Array.from(eventsByDay.values()).filter(
    (count) => count >= DEEP_WORK_THRESHOLD
  ).length;

  // Longest build streak (consecutive days with build/test/deploy events)
  const buildDays = new Set<string>();
  for (const event of events) {
    if (
      event.commandCategory === "build" ||
      event.commandCategory === "test" ||
      event.commandCategory === "deploy"
    ) {
      buildDays.add(event.timestamp.slice(0, 10));
    }
  }
  const longestBuildStreak = computeLongestStreak(Array.from(buildDays));

  // Top agents
  const agentCounts = new Map<string, number>();
  for (const event of events) {
    if (event.agentName) {
      agentCounts.set(
        event.agentName,
        (agentCounts.get(event.agentName) ?? 0) + 1
      );
    }
  }
  const topAgents = Array.from(agentCounts.entries())
    .map(([name, sessions]) => ({ name, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 5);

  // Top commands
  const commandCounts = new Map<string, number>();
  for (const event of events) {
    if (event.command) {
      // Extract base command (first word)
      const baseCmd = event.command.split(/\s+/)[0];
      commandCounts.set(baseCmd, (commandCounts.get(baseCmd) ?? 0) + 1);
    }
  }
  const topCommands = Array.from(commandCounts.entries())
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Source summary
  const sourceCounts = new Map<ActivitySource, number>();
  for (const event of events) {
    sourceCounts.set(
      event.source,
      (sourceCounts.get(event.source) ?? 0) + 1
    );
  }
  const sourceSummary = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSessions,
    cliCommands,
    agentSessions,
    deepWorkDays,
    longestBuildStreak,
    humanCommits,
    agentCommits,
    mixedCommits,
    topAgents,
    topCommands,
    sourceSummary,
  };
}

/** Compute longest streak of consecutive days */
function computeLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const sorted = dates.sort();
  let longest = 1;
  let current = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else if (diffDays > 1) {
      current = 1;
    }
  }

  return longest;
}
