// OpenVerb Runtime - Event System
// Event types + event emitter/store

import type { RobotEvent, RobotEventType } from "@/src/world/model";

// In-memory event store (for demo purposes)
let events: RobotEvent[] = [];
let eventId = 0;

export function createEvent(
  type: RobotEventType,
  payload: unknown
): RobotEvent {
  const event: RobotEvent = {
    id: `evt_${++eventId}`,
    type,
    ts: new Date().toISOString(),
    payload,
  };
  events.push(event);

  // Keep only last 100 events
  if (events.length > 100) {
    events = events.slice(-100);
  }

  return event;
}

export function getEvents(
  options: {
    limit?: number;
    types?: RobotEventType[];
    since?: string;
  } = {}
): RobotEvent[] {
  let filtered = [...events];

  if (options.types && options.types.length > 0) {
    filtered = filtered.filter((e) => options.types!.includes(e.type));
  }

  if (options.since) {
    filtered = filtered.filter((e) => e.ts > options.since!);
  }

  if (options.limit) {
    filtered = filtered.slice(-options.limit);
  }

  return filtered;
}

export function clearEvents() {
  events = [];
  eventId = 0;
}

// Event payloads for type safety
export interface GoalSetPayload {
  goal: string;
  taskId?: string;
}

export interface PilotActPayload {
  goal: string;
  chosen: { verb: string; args: unknown };
  rationale?: string;
}

export interface PilotDonePayload {
  goal: string;
  summary: string;
}

export interface VerbStartedPayload {
  verb: string;
  args: unknown;
  stepId?: string;
}

export interface VerbFinishedPayload {
  verb: string;
  args: unknown;
  result: { ok: boolean; error?: { code: string; message: string } };
  telemetry?: { latencyMs: number; steps?: number };
}

export interface PolicyBlockedPayload {
  verb: string;
  args: unknown;
  reason: string;
  confirmationId?: string;
  requiresConfirmation?: boolean;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  context?: unknown;
}
