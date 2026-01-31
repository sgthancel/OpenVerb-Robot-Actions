// POST choose a task -> returns task + resets world
import { NextResponse } from "next/server";
import { TASKS } from "@/src/world/tasks";
import { getWorldState, resetStepCount, updatePilotSettings } from "@/src/store/worldStore";
import { clearEvents, createEvent } from "@/src/openverb/runtime/events";
import { resetRateLimits } from "@/src/openverb/runtime/policy";

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId } = body;

  // Find the task
  const task = TASKS.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({
      ok: false,
      error: { code: "NOT_FOUND", message: `Task ${taskId} not found` },
    });
  }

  // Update task ID on current world state and ACTIVATE autopilot
  updatePilotSettings({ taskId: task.id, goal: task.goal, isRunning: true });
  resetStepCount();
  resetRateLimits();

  // Emit goal.set event
  createEvent("goal.set", {
    goal: task.goal,
    taskId: task.id,
  });

  return NextResponse.json({
    ok: true,
    task,
    world: getWorldState(),
  });
}
