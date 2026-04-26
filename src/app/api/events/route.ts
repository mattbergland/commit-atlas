/**
 * API route for receiving and querying activity events.
 *
 * POST /api/events — Submit a new activity event
 * GET  /api/events — Query stored events (with optional filters)
 */

import { NextRequest, NextResponse } from "next/server";
import type { ActivityEvent, ActivitySource } from "@/types/activity";

// In-memory event store (for MVP — replace with DB for production)
const MAX_EVENTS = 10_000;
const eventStore: ActivityEvent[] = [];

/** Validate an incoming activity event */
function validateEvent(
  data: Record<string, unknown>
): ActivityEvent | null {
  const validSources = [
    "github",
    "cursor",
    "windsurf",
    "devin",
    "claude_code",
    "copilot",
    "cli",
  ];
  const validActors = ["human", "agent", "mixed"];
  const validEventTypes = [
    "commit",
    "pr",
    "session_start",
    "session_end",
    "command",
    "workflow",
  ];

  if (!data.source || !validSources.includes(data.source as string)) {
    return null;
  }
  if (!data.actor || !validActors.includes(data.actor as string)) {
    return null;
  }
  if (
    !data.eventType ||
    !validEventTypes.includes(data.eventType as string)
  ) {
    return null;
  }

  return {
    id:
      (data.id as string) ??
      `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: (data.timestamp as string) ?? new Date().toISOString(),
    source: data.source as ActivitySource,
    repo: data.repo as string | undefined,
    branch: data.branch as string | undefined,
    actor: data.actor as ActivityEvent["actor"],
    agentName: data.agentName as string | undefined,
    eventType: data.eventType as ActivityEvent["eventType"],
    filesChanged: data.filesChanged as number | undefined,
    additions: data.additions as number | undefined,
    deletions: data.deletions as number | undefined,
    command: data.command as string | undefined,
    commandCategory: data.commandCategory as
      | ActivityEvent["commandCategory"]
      | undefined,
    durationMs: data.durationMs as number | undefined,
    metadata: data.metadata as Record<string, unknown> | undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Basic auth check: require API key if EVENTS_API_KEY is configured
    const requiredKey = process.env.EVENTS_API_KEY;
    if (requiredKey) {
      const authHeader = request.headers.get("authorization");
      const providedKey = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
      if (providedKey !== requiredKey) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const body = await request.json();

    // Support single event or batch import
    const events: Record<string, unknown>[] = Array.isArray(body)
      ? body
      : [body];

    const validated: ActivityEvent[] = [];
    const errors: string[] = [];

    for (let i = 0; i < events.length; i++) {
      const event = validateEvent(events[i]);
      if (event) {
        validated.push(event);
      } else {
        errors.push(`Event at index ${i} is invalid`);
      }
    }

    // Store validated events, capping batch to MAX_EVENTS and evicting oldest
    const toStore = validated.length > MAX_EVENTS ? validated.slice(-MAX_EVENTS) : validated;
    const spaceLeft = MAX_EVENTS - eventStore.length;
    if (spaceLeft < toStore.length) {
      const evictCount = toStore.length - spaceLeft;
      eventStore.splice(0, evictCount);
    }
    eventStore.push(...toStore);

    return NextResponse.json({
      success: true,
      imported: validated.length,
      errors: errors.length > 0 ? errors : undefined,
      total: eventStore.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Auth check: require API key if EVENTS_API_KEY is configured
  const requiredKey = process.env.EVENTS_API_KEY;
  if (requiredKey) {
    const authHeader = request.headers.get("authorization");
    const providedKey = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (providedKey !== requiredKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  const { searchParams } = new URL(request.url);

  let filtered = [...eventStore];

  // Filter by source
  const source = searchParams.get("source");
  if (source) {
    filtered = filtered.filter((e) => e.source === source);
  }

  // Filter by actor
  const actor = searchParams.get("actor");
  if (actor) {
    filtered = filtered.filter((e) => e.actor === actor);
  }

  // Filter by repo
  const repo = searchParams.get("repo");
  if (repo) {
    filtered = filtered.filter((e) => e.repo === repo);
  }

  // Filter by date range
  const since = searchParams.get("since");
  if (since) {
    const sinceTime = new Date(since).getTime();
    filtered = filtered.filter(
      (e) => new Date(e.timestamp).getTime() >= sinceTime
    );
  }

  const until = searchParams.get("until");
  if (until) {
    const untilTime = new Date(until).getTime();
    filtered = filtered.filter(
      (e) => new Date(e.timestamp).getTime() <= untilTime
    );
  }

  // Limit results
  const limit = searchParams.get("limit");
  if (limit) {
    filtered = filtered.slice(0, parseInt(limit, 10));
  }

  return NextResponse.json({
    events: filtered,
    total: filtered.length,
  });
}
