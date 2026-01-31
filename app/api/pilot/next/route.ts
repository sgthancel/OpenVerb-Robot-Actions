// POST goal + observation -> next action
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getWorldState, getStepCount, getRuntimeMs } from "@/src/store/worldStore";
import { buildObservation } from "@/src/world/observe";
import { createAIPilot } from "@/src/pilot/aiPilot";
import { createHeuristicPilot } from "@/src/pilot/heuristicPilot";
import { VERB_DESCRIPTIONS, type PilotInput } from "@/src/pilot/contract";
import { DEFAULT_POLICY } from "@/src/openverb/runtime/policy";
import { createEvent } from "@/src/openverb/runtime/events";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const body = await request.json();
  const {
    goal,
    observation: providedObservation,
    memory,
    useAI = false,
    model = "openai/gpt-4o-mini",
  } = body;

  // 1. Input Validation
  if (goal && typeof goal === "string" && goal.length > 200) {
    return NextResponse.json({
      ok: false,
      error: { code: "INPUT_TOO_LONG", message: "Goal too long (max 200 chars)" }
    }, { status: 400 });
  }

  // 2. Model Whitelist
  const ALLOWED_MODELS = ["openai/gpt-4o-mini", "openai/gpt-4o"];
  if (useAI && !ALLOWED_MODELS.includes(model)) {
    return NextResponse.json({
      ok: false,
      error: { code: "INVALID_MODEL", message: "Invalid model selected" }
    }, { status: 400 });
  }

  if (useAI) {
    // 3. Rate Limiting (Throttle)
    const lastRequest = cookieStore.get("last_pilot_request");
    const now = Date.now();
    if (lastRequest) {
      const lastTime = parseInt(lastRequest.value);
      if (now - lastTime < 2000) { // 2 seconds
        return NextResponse.json({
          ok: false,
          error: { code: "RATE_LIMIT", message: "Pilot is thinking... please wait." }
        }, { status: 429 });
      }
    }

    // 4. Usage Cap
    const usage = cookieStore.get("pilot_usage_count");
    const count = usage ? parseInt(usage.value) : 0;
    if (count >= 100) {
      return NextResponse.json({
        ok: false,
        error: { code: "USAGE_LIMIT", message: "Daily AI pilot limit reached (100 steps)." }
      }, { status: 403 });
    }

    // Set Cookies
    cookieStore.set("last_pilot_request", now.toString(), { httpOnly: true, sameSite: "strict" });
    cookieStore.set("pilot_usage_count", (count + 1).toString(), { httpOnly: true, sameSite: "strict", maxAge: 86400 });
  }

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
