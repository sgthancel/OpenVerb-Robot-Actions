// GET demo tasks
import { NextResponse } from "next/server";
import { TASKS } from "@/src/world/tasks";

export async function GET() {
  return NextResponse.json({
    tasks: TASKS,
  });
}
