/**
 * Agent attribution logic — classifies activity as human, agent, or mixed.
 */

import type { ActivityEvent, ActorType, ActivitySource } from "@/types/activity";

/** Time window (ms) for considering events as part of the same session */
const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

/** Classify the actor type for a commit based on surrounding activity */
export function classifyCommitActor(
  commitTimestamp: string,
  events: ActivityEvent[]
): ActorType {
  const commitTime = new Date(commitTimestamp).getTime();

  // Check if there are agent sessions around this commit
  const nearbyAgentEvents = events.filter((e) => {
    if (e.actor !== "agent") return false;
    const eventTime = new Date(e.timestamp).getTime();
    return Math.abs(eventTime - commitTime) < SESSION_WINDOW_MS;
  });

  if (nearbyAgentEvents.length > 0) {
    // If there are also human events nearby, it's mixed
    const nearbyHumanEvents = events.filter((e) => {
      if (e.actor !== "human") return false;
      const eventTime = new Date(e.timestamp).getTime();
      return Math.abs(eventTime - commitTime) < SESSION_WINDOW_MS;
    });

    return nearbyHumanEvents.length > 0 ? "mixed" : "agent";
  }

  return "human";
}

/** Classify all events and return attribution summary */
export function computeAttribution(events: ActivityEvent[]): {
  human: number;
  agent: number;
  mixed: number;
  bySource: Record<ActivitySource, number>;
} {
  const result = {
    human: 0,
    agent: 0,
    mixed: 0,
    bySource: {
      github: 0,
      cursor: 0,
      windsurf: 0,
      devin: 0,
      claude_code: 0,
      cli: 0,
    } as Record<ActivitySource, number>,
  };

  for (const event of events) {
    result[event.actor]++;
    result.bySource[event.source]++;
  }

  return result;
}

/** Get the human vs agent ratio as a formatted string */
export function getHumanAgentRatio(events: ActivityEvent[]): string {
  const attribution = computeAttribution(events);
  const total = attribution.human + attribution.agent + attribution.mixed;
  if (total === 0) return "No data";

  const humanPct = Math.round(
    ((attribution.human + attribution.mixed * 0.5) / total) * 100
  );
  const agentPct = 100 - humanPct;

  return `${humanPct}% human / ${agentPct}% agent`;
}

/** Get the primary agent used (most common agent source) */
export function getPrimaryAgent(
  events: ActivityEvent[]
): ActivitySource | null {
  const agentSources: ActivitySource[] = [
    "cursor",
    "windsurf",
    "devin",
    "claude_code",
  ];

  const counts = agentSources.map((source) => ({
    source,
    count: events.filter((e) => e.source === source).length,
  }));

  const top = counts.sort((a, b) => b.count - a.count)[0];
  return top && top.count > 0 ? top.source : null;
}

/** Filter events by source and activity config */
export function filterEventsByConfig(
  events: ActivityEvent[],
  config: {
    sourceFilter: ActivitySource | "all";
    includeAgentActivity: boolean;
    includeCliActivity: boolean;
  }
): ActivityEvent[] {
  return events.filter((event) => {
    // Source filter
    if (config.sourceFilter !== "all" && event.source !== config.sourceFilter) {
      return false;
    }

    // Agent activity toggle
    if (!config.includeAgentActivity && event.actor === "agent") {
      return false;
    }

    // CLI activity toggle
    if (!config.includeCliActivity && event.source === "cli") {
      return false;
    }

    return true;
  });
}
