// GET recent events
import { NextResponse } from "next/server";
import { getEvents } from "@/src/openverb/runtime/events";
import type { RobotEventType } from "@/src/world/model";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
  const types = searchParams.get("types")?.split(",") as RobotEventType[] | undefined;
  const since = searchParams.get("since") || undefined;

  const events = getEvents({ limit, types, since });

  return NextResponse.json({
    events,
  });
}
