// OpenVerb Robot Actions - Pilot Contract
// Interfaces for AI pilots (OpenAI, local heuristic, etc.)

import type { Observation, VerbName } from "@/src/world/model";

export type PilotInput = {
  goal: string;
  observation: Observation;
  policySummary: {
    mode: "supervised" | "autonomous";
    pendingConfirmation?: { reason: string; verb: string };
    denyRooms?: string[];
    budgets?: { remainingSteps: number; remainingMs: number };
  };
  memory?: {
    lastActions: Array<{ verb: string; ok: boolean; error?: string }>;
  };
  allowedVerbs: { name: VerbName; description: string }[];
};

export type PilotOutput =
  | { type: "act"; verb: VerbName; args: Record<string, unknown>; rationale?: string }
  | { type: "done"; summary: string }
  | { type: "ask_user"; question: string };

export interface Pilot {
  name: string;
  plan(input: PilotInput): Promise<PilotOutput>;
}

// Available verbs with descriptions
export const VERB_DESCRIPTIONS: { name: VerbName; description: string }[] = [
  { name: "world.move_to", description: "Move robot: { x, y } or { target: { x, y } }" },
  { name: "world.pick", description: "Pick up entity: { entityId }" },
  { name: "world.place", description: "Place entity: { entityId, targetId } or { entityId, x, y }" },
  { name: "world.toggle", description: "Toggle light/faucet: { entityId, state: boolean }" },
  { name: "world.open", description: "Open door/fridge: { entityId }" },
  { name: "world.close", description: "Close door/fridge: { entityId }" },
  { name: "world.clean", description: "Clean dirty spot: { targetId }" },
  { name: "world.scan", description: "Scan nearby: { radius?, includeTypes? }" },
  { name: "world.observe", description: "Observe surroundings: { radius? }" },
  { name: "world.get_state", description: "Get full world state" },
];
