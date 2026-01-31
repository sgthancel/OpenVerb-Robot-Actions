// GET world state snapshot - also ticks movement animation
import { NextResponse } from "next/server";
import { getWorldState, setWorldState, getStepCount, getRuntimeMs } from "@/src/store/worldStore";
import { tickMovement } from "@/src/world/engine";
import { evaluateSuccess } from "@/src/world/success";
import { TASKS } from "@/src/world/tasks";
import { getEvents } from "@/src/openverb/runtime/events";

export async function GET() {
  let world = getWorldState();

  // Tick robot movement if in progress
  if (world.robot.movement) {
    const { next, isMoving } = tickMovement(world);
    world = next;
    setWorldState(world);
  }

  // Evaluate success if there's an active task
  let success = null;
  if (world.pilot.taskId) {
    const task = TASKS.find(t => t.id === world.pilot.taskId);
    if (task) {
      success = evaluateSuccess(world, task.success);
    }
  }

  // Get recent events
  const events = getEvents({ limit: 50 });

  return NextResponse.json({
    world,
    stepCount: getStepCount(),
    runtimeMs: getRuntimeMs(),
    isMoving: !!world.robot.movement,
    success,
    events,
  });
}
