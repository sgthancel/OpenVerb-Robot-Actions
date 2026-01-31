// OpenVerb Runtime - Verb Executor
// Executes verbs against world engine with policy checks

import type { WorldState, VerbCall, ApplyResult, RoomId } from "@/src/world/model";
import { applyVerb, isEnteringRoom } from "@/src/world/engine";
import { checkPolicy, type OpenVerbPolicy, DEFAULT_POLICY } from "./policy";
import { createEvent } from "./events";

export interface ExecuteOptions {
  traceId?: string;
  stepId?: string;
  confirmed?: boolean;
  policy?: OpenVerbPolicy;
  stepCount?: number;
  runtimeMs?: number;
}

export interface ExecuteResult {
  ok: boolean;
  world: WorldState;
  result?: ApplyResult;
  blocked?: {
    reason: string;
    confirmationId?: string;
    requiresConfirmation?: boolean;
  };
  error?: { code: string; message: string };
  telemetry?: { latencyMs: number; steps?: number };
}

export function executeVerb(
  world: WorldState,
  call: VerbCall,
  options: ExecuteOptions = {}
): ExecuteResult {
  const { policy = DEFAULT_POLICY, stepCount = 0, runtimeMs = 0, confirmed = false } = options;

  // Emit verb.started event
  createEvent("verb.started", {
    verb: call.verb,
    args: call.args,
    stepId: options.stepId,
  });

  // Check if this is a move and if entering a new room
  let targetRoom: RoomId | null = null;
  if (call.verb === "world.move_to" && call.args.target) {
    const target = call.args.target as { x: number; y: number };
    targetRoom = isEnteringRoom(world.robot.room, target, world);
  }

  // Check policy (skip if already confirmed)
  if (!confirmed) {
    const policyDecision = checkPolicy(call.verb, call.args, policy, {
      currentRoom: world.robot.room,
      targetRoom,
      stepCount,
      runtimeMs,
    });

    if (!policyDecision.allow) {
      // Generate confirmation ID if needed
      const confirmationId = policyDecision.requiresConfirmation
        ? `conf_${Date.now()}`
        : undefined;

      // Emit policy.blocked event
      createEvent("policy.blocked", {
        verb: call.verb,
        args: call.args,
        reason: policyDecision.reason,
        confirmationId,
        requiresConfirmation: policyDecision.requiresConfirmation,
      });

      // Store pending confirmation in world state if needed
      let newWorld = world;
      if (policyDecision.requiresConfirmation && confirmationId) {
        newWorld = {
          ...world,
          policy: {
            ...world.policy,
            pendingConfirmation: {
              id: confirmationId,
              reason: policyDecision.reason,
              verb: call.verb,
              args: call.args,
            },
          },
        };
      }

      return {
        ok: false,
        world: newWorld,
        blocked: {
          reason: policyDecision.reason,
          confirmationId,
          requiresConfirmation: policyDecision.requiresConfirmation,
        },
      };
    }
  }

  // Execute the verb
  const result = applyVerb(world, call);

  // Emit verb.finished event
  createEvent("verb.finished", {
    verb: call.verb,
    args: call.args,
    result: { ok: result.ok, error: result.error },
    telemetry: result.telemetry,
  });

  if (!result.ok) {
    return {
      ok: false,
      world: result.next,
      result,
      error: result.error,
    };
  }

  return {
    ok: true,
    world: result.next,
    result,
    telemetry: result.telemetry,
  };
}

// Confirm a pending action
export function confirmPendingAction(world: WorldState): {
  confirmed: boolean;
  verb?: string;
  args?: unknown;
} {
  const pending = world.policy.pendingConfirmation;
  if (!pending) {
    return { confirmed: false };
  }

  return {
    confirmed: true,
    verb: pending.verb,
    args: pending.args,
  };
}

// Clear pending confirmation
export function clearPendingConfirmation(world: WorldState): WorldState {
  return {
    ...world,
    policy: {
      ...world.policy,
      pendingConfirmation: undefined,
    },
  };
}
