// POST reset world
import { NextResponse } from "next/server";
import { resetWorldState, resetStepCount } from "@/src/store/worldStore";
import { clearEvents } from "@/src/openverb/runtime/events";
import { resetRateLimits } from "@/src/openverb/runtime/policy";

export async function POST() {
  const world = resetWorldState();
  resetStepCount();
  clearEvents();
  resetRateLimits();
  
  return NextResponse.json({
    ok: true,
    world,
  });
}
