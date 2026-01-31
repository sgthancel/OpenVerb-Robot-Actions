// OpenVerb Runtime - Policy Engine
// Policy evaluation + confirmation gates + budgets

import type { RoomId } from "@/src/world/model";

export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string; requiresConfirmation?: boolean };

export type OpenVerbPolicy = {
  mode: "demo" | "supervised" | "autonomous";
  confirmRooms: RoomId[];
  confirmVerbs: string[];
  denyVerbs: string[];
  denyRooms: RoomId[];
  budgets: {
    maxSteps: number;
    maxRuntimeMs: number;
  };
  rateLimits: Record<string, { perMinute: number }>;
};

export const DEFAULT_POLICY: OpenVerbPolicy = {
  mode: "supervised",
  confirmRooms: ["bedroom"],
  confirmVerbs: ["world.open", "world.close"],
  denyVerbs: ["world.destroy", "world.delete"],
  denyRooms: [],
  budgets: {
    maxSteps: 200,
    maxRuntimeMs: 60_000,
  },
  rateLimits: {
    "world.toggle": { perMinute: 120 },
    "world.move_to": { perMinute: 60 },
  },
};

// Rate limit tracking (in-memory for demo)
const rateLimitState: Record<string, { count: number; windowStart: number }> = {};

export function checkPolicy(
  verb: string,
  args: Record<string, unknown>,
  policy: OpenVerbPolicy,
  context: {
    currentRoom: RoomId;
    targetRoom?: RoomId | null;
    stepCount: number;
    runtimeMs: number;
  }
): PolicyDecision {
  // Check denied verbs
  if (policy.denyVerbs.some((pattern) => verb.startsWith(pattern.replace("*", "")))) {
    return { allow: false, reason: `Verb "${verb}" is denied by policy` };
  }

  // Check denied rooms
  if (context.targetRoom && policy.denyRooms.includes(context.targetRoom)) {
    return { allow: false, reason: `Entry to "${context.targetRoom}" is denied` };
  }

  // Check budget: steps
  if (context.stepCount >= policy.budgets.maxSteps) {
    return { allow: false, reason: "Step budget exceeded" };
  }

  // Check budget: runtime
  if (context.runtimeMs >= policy.budgets.maxRuntimeMs) {
    return { allow: false, reason: "Runtime budget exceeded" };
  }

  // Check rate limits
  if (policy.rateLimits[verb]) {
    const limit = policy.rateLimits[verb];
    const now = Date.now();
    const state = rateLimitState[verb] || { count: 0, windowStart: now };

    // Reset window if needed
    if (now - state.windowStart > 60_000) {
      state.count = 0;
      state.windowStart = now;
    }

    if (state.count >= limit.perMinute) {
      return { allow: false, reason: `Rate limit exceeded for "${verb}"` };
    }

    // Update rate limit state
    state.count++;
    rateLimitState[verb] = state;
  }

  // Check confirmation rooms
  if (context.targetRoom && policy.confirmRooms.includes(context.targetRoom)) {
    return {
      allow: false,
      reason: `Entering "${context.targetRoom}" requires confirmation`,
      requiresConfirmation: true,
    };
  }

  // Check confirmation verbs
  if (policy.confirmVerbs.includes(verb)) {
    return {
      allow: false,
      reason: `Verb "${verb}" requires confirmation`,
      requiresConfirmation: true,
    };
  }

  return { allow: true };
}

export function resetRateLimits() {
  for (const key of Object.keys(rateLimitState)) {
    delete rateLimitState[key];
  }
}
