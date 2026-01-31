// POST execute a verb
import { NextResponse } from "next/server";
import {
  getWorldState,
  setWorldState,
  getStepCount,
  getRuntimeMs,
  incrementStepCount,
} from "@/src/store/worldStore";
import { executeVerb } from "@/src/openverb/runtime/executor";
import { buildObservation } from "@/src/world/observe";
import type { VerbName } from "@/src/world/model";

export async function POST(request: Request) {
  const body = await request.json();
  const { verb, args, traceId, stepId, confirmed } = body;

  const world = getWorldState();

  // Handle observe verb specially (doesn't change state)
  if (verb === "world.observe") {
    const observation = buildObservation(world, args || {});
    return NextResponse.json({
      ok: true,
      verb: "world.observe",
      observation,
      world,
    });
  }

  // Execute the verb
  const result = executeVerb(
    world,
    {
      verb: verb as VerbName,
      args: args || {},
      stepId,
    },
    {
      traceId,
      stepId,
      confirmed,
      stepCount: getStepCount(),
      runtimeMs: getRuntimeMs(),
    }
  );

  incrementStepCount();

  // Update world state
  setWorldState(result.world);

  // Extract path for movement animation
  const movementInfo = result.world.robot.movement;
  const path = movementInfo?.path?.map((p) => [p.x, p.y] as [number, number]) || null;
  const estimatedDurationMs = movementInfo 
    ? (movementInfo.path.length / movementInfo.speed) * 1000 
    : 0;

  return NextResponse.json({
    ok: result.ok,
    verb,
    world: result.world,
    result: result.result,
    blocked: result.blocked,
    error: result.error,
    telemetry: result.telemetry,
    // Movement data for client animation
    path,
    estimatedDurationMs,
    isMoving: !!movementInfo,
  });
}
