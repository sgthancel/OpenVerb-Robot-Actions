// POST goal + observation -> next action
import { NextResponse } from "next/server";
import { getWorldState, getStepCount, getRuntimeMs } from "@/src/store/worldStore";
import { buildObservation } from "@/src/world/observe";
import { createAIPilot } from "@/src/pilot/aiPilot";
import { createHeuristicPilot } from "@/src/pilot/heuristicPilot";
import { VERB_DESCRIPTIONS, type PilotInput } from "@/src/pilot/contract";
import { DEFAULT_POLICY } from "@/src/openverb/runtime/policy";
import { createEvent } from "@/src/openverb/runtime/events";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    goal,
    observation: providedObservation,
    memory,
    useAI = false,
    model = "openai/gpt-4o-mini",
  } = body;

  const world = getWorldState();

  // Build observation if not provided
  const observation = providedObservation || buildObservation(world, { radius: 15 });

  // Prepare pilot input
  const pilotInput: PilotInput = {
    goal,
    observation,
    policySummary: {
      mode: DEFAULT_POLICY.mode === "demo" ? "supervised" : DEFAULT_POLICY.mode,
      pendingConfirmation: world.policy.pendingConfirmation
        ? {
            reason: world.policy.pendingConfirmation.reason,
            verb: world.policy.pendingConfirmation.verb,
          }
        : undefined,
      denyRooms: DEFAULT_POLICY.denyRooms,
      budgets: {
        remainingSteps: DEFAULT_POLICY.budgets.maxSteps - getStepCount(),
        remainingMs: DEFAULT_POLICY.budgets.maxRuntimeMs - getRuntimeMs(),
      },
    },
    memory: memory || { lastActions: [] },
    allowedVerbs: VERB_DESCRIPTIONS,
  };

  // Create pilot based on flag
  const pilot = useAI ? createAIPilot(model) : createHeuristicPilot();

  try {
    // Get next action from pilot
    const output = await pilot.plan(pilotInput);

    // Emit event based on output type
    if (output.type === "act") {
      createEvent("pilot.act", {
        goal,
        chosen: { verb: output.verb, args: output.args },
        rationale: output.rationale,
      });
    } else if (output.type === "done") {
      createEvent("pilot.done", {
        goal,
        summary: output.summary,
      });
    }

    return NextResponse.json({
      ok: true,
      pilotName: pilot.name,
      output,
    });
  } catch (error) {
    createEvent("error", {
      message: error instanceof Error ? error.message : "Unknown pilot error",
      context: { goal, pilotName: pilot.name },
    });

    return NextResponse.json({
      ok: false,
      error: {
        code: "PILOT_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}
