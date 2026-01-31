// POST confirm pending policy gate
import { NextResponse } from "next/server";
import {
  getWorldState,
  setWorldState,
  getStepCount,
  getRuntimeMs,
  incrementStepCount,
} from "@/src/store/worldStore";
import {
  confirmPendingAction,
  clearPendingConfirmation,
  executeVerb,
} from "@/src/openverb/runtime/executor";
import type { VerbName } from "@/src/world/model";

export async function POST(request: Request) {
  const body = await request.json();
  const { allow } = body;

  const world = getWorldState();

  // Check if there's a pending confirmation
  const pending = confirmPendingAction(world);
  if (!pending.confirmed || !pending.verb) {
    return NextResponse.json({
      ok: false,
      error: { code: "NO_PENDING", message: "No pending confirmation" },
    });
  }

  // Clear the pending confirmation
  let newWorld = clearPendingConfirmation(world);

  if (allow) {
    // Execute the previously blocked verb
    const result = executeVerb(
      newWorld,
      {
        verb: pending.verb as VerbName,
        args: pending.args as Record<string, unknown>,
      },
      {
        confirmed: true,
        stepCount: getStepCount(),
        runtimeMs: getRuntimeMs(),
      }
    );

    incrementStepCount();
    setWorldState(result.world);

    return NextResponse.json({
      ok: result.ok,
      world: result.world,
      result: result.result,
      error: result.error,
    });
  }

  // User denied - just clear the confirmation
  setWorldState(newWorld);

  return NextResponse.json({
    ok: true,
    world: newWorld,
    cancelled: true,
  });
}
