// POST check success criteria for current task
import { NextResponse } from "next/server";
import { getWorldState } from "@/src/store/worldStore";
import { TASKS } from "@/src/world/tasks";
import { evaluateSuccess } from "@/src/world/success";

export async function POST(request: Request) {
  const body = await request.json();
  const { taskId } = body;

  const task = TASKS.find((t) => t.id === taskId);
  if (!task) {
    return NextResponse.json({
      ok: false,
      error: { code: "NOT_FOUND", message: `Task ${taskId} not found` },
    });
  }

  const world = getWorldState();
  const result = evaluateSuccess(world, task.success);

  return NextResponse.json({
    ok: true,
    taskId,
    ...result,
  });
}
