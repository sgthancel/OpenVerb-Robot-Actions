// OpenVerb Robot Actions - World State Store
// In-memory store for the world state (server-side)

import type { WorldState } from "@/src/world/model";
import { createInitialWorld } from "@/src/world/init";

// Global world state (server-side)
let worldState: WorldState = createInitialWorld();

// Execution tracking
let stepCount = 0;
let startTime = Date.now();

export function getWorldState(): WorldState {
  return worldState;
}

export function setWorldState(state: WorldState): void {
  worldState = state;
}

export function resetWorldState(): WorldState {
  worldState = createInitialWorld();
  stepCount = 0;
  startTime = Date.now();
  return worldState;
}

export function getStepCount(): number {
  return stepCount;
}

export function incrementStepCount(): void {
  stepCount++;
}

export function resetStepCount(): void {
  stepCount = 0;
  startTime = Date.now();
}

export function getRuntimeMs(): number {
  return Date.now() - startTime;
}

export function resetRuntime(): void {
  startTime = Date.now();
}

export function updatePilotSettings(settings: Partial<{ useAI: boolean; isRunning: boolean; taskId: string | null; goal: string | null }>): void {
  worldState = {
    ...worldState,
    pilot: {
      ...worldState.pilot,
      ...settings,
    },
  };
}
