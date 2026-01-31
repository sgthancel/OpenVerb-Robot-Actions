// OpenVerb Town - World Engine
// Pure functions for applying verbs to world state

import type {
  WorldState,
  VerbCall,
  ApplyResult,
  Entity,
  RoomId,
} from "./model";
import { findPath, getRoomAtPosition, getDistance } from "./nav";

// Deep clone helper
function cloneWorld(world: WorldState): WorldState {
  return JSON.parse(JSON.stringify(world));
}

// Verb: world.move_to
// Does NOT teleport - stores path for gradual interpolation
function applyMoveTo(
  world: WorldState,
  args: { target?: { x: number; y: number }; x?: number; y?: number }
): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  const target = args.target || (args.x !== undefined && args.y !== undefined ? { x: args.x, y: args.y } : null);

  if (!target) {
    return {
      ok: false,
      next: world,
      error: { code: "INVALID_ARGS", message: "Target position {x, y} or x/y is required" },
    };
  }

  const path = findPath(world.robot.pos, target, world);

  if (!path) {
    return {
      ok: false,
      next: world,
      error: { code: "NO_PATH", message: "Cannot find path to target" },
    };
  }

  // Store movement state - robot will interpolate along this path
  // If already moving to the same target, keep the same startedAt to avoid "freezing"
  const existingMovement = world.robot.movement;
  const isSameTarget = existingMovement &&
    existingMovement.targetPos.x === target!.x &&
    existingMovement.targetPos.y === target!.y;

  (next.robot.movement as any) = {
    path: path,
    targetPos: target!,
    startedAt: isSameTarget ? existingMovement.startedAt : Date.now(),
    speed: 1.5, // 1.5 grid units per second
  };

  next.version++;

  return {
    ok: true,
    next,
    info: {
      path,
      steps: path.length,
      estimatedDurationMs: (path.length / 3) * 1000, // Based on speed
    },
    telemetry: { latencyMs: Date.now() - startTime, steps: path.length },
  };
}

// Verb: world.pick
function applyPick(world: WorldState, args: { entityId: string }): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  if (next.robot.carrying) {
    return {
      ok: false,
      next: world,
      error: { code: "HANDS_FULL", message: "Robot is already carrying something" },
    };
  }

  const entity = next.entities[args.entityId];
  if (!entity) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_FOUND", message: `Entity ${args.entityId} not found` },
    };
  }

  if (!entity.pickable) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_PICKABLE", message: `Entity ${entity.name} cannot be picked up` },
    };
  }

  const distance = getDistance(next.robot.pos, entity.pos);
  if (distance > 2) {
    return {
      ok: false,
      next: world,
      error: { code: "TOO_FAR", message: "Entity is too far to pick up" },
    };
  }

  // Pick up the entity
  next.robot.carrying = args.entityId;

  // Remove from any container
  for (const e of Object.values(next.entities)) {
    if (e.contains?.includes(args.entityId)) {
      e.contains = e.contains.filter((id) => id !== args.entityId);
    }
  }

  // Clear parentId
  entity.parentId = undefined;

  next.version++;

  return {
    ok: true,
    next,
    info: { pickedUp: entity.name },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Verb: world.place
function applyPlace(
  world: WorldState,
  args: { entityId: string; destination: { x: number; y: number } | { targetId: string } }
): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  if (next.robot.carrying !== args.entityId) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_CARRYING", message: "Robot is not carrying this entity" },
    };
  }

  const entity = next.entities[args.entityId];
  if (!entity) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_FOUND", message: `Entity ${args.entityId} not found` },
    };
  }

  let targetPos: { x: number; y: number } | null = null;
  let targetContainer: Entity | null = null;

  // Handle both nested and flat arguments
  const a = args as any;
  const dest = a.destination || { targetId: a.targetId, x: a.x, y: a.y };

  if (dest && "targetId" in dest && dest.targetId) {
    const target = next.entities[dest.targetId];
    if (!target) {
      return {
        ok: false,
        next: world,
        error: { code: "TARGET_NOT_FOUND", message: `Target ${dest.targetId} not found` },
      };
    }
    if (!target.container) {
      return {
        ok: false,
        next: world,
        error: { code: "NOT_CONTAINER", message: `${target.name} is not a container` },
      };
    }
    targetPos = target.pos;
    targetContainer = target;
  } else if (dest && "x" in dest && "y" in dest && dest.x !== undefined && dest.y !== undefined) {
    targetPos = { x: dest.x, y: dest.y };
  }

  if (!targetPos) {
    return {
      ok: false,
      next: world,
      error: { code: "INVALID_DESTINATION", message: "Destination targetId or x/y is required" },
    };
  }

  const distance = getDistance(next.robot.pos, targetPos);
  if (distance > 2) {
    return {
      ok: false,
      next: world,
      error: { code: "TOO_FAR", message: "Target is too far" },
    };
  }

  // Place the entity
  entity.pos = targetPos;
  entity.room = getRoomAtPosition(targetPos, next) || entity.room;
  next.robot.carrying = null;

  if (targetContainer) {
    targetContainer.contains = targetContainer.contains || [];
    targetContainer.contains.push(args.entityId);
    entity.parentId = targetContainer.id;
  } else {
    entity.parentId = undefined;
  }

  next.version++;

  return {
    ok: true,
    next,
    info: { placed: entity.name, at: targetPos },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Verb: world.toggle
function applyToggle(
  world: WorldState,
  args: { entityId: string; state: boolean }
): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  const entity = next.entities[args.entityId];
  if (!entity) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_FOUND", message: `Entity ${args.entityId} not found` },
    };
  }

  if (!entity.toggleable) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_TOGGLEABLE", message: `${entity.name} cannot be toggled` },
    };
  }

  const distance = getDistance(next.robot.pos, entity.pos);
  if (distance > 3) {
    return {
      ok: false,
      next: world,
      error: { code: "TOO_FAR", message: "Entity is too far to toggle" },
    };
  }

  entity.isOn = args.state;
  next.version++;

  return {
    ok: true,
    next,
    info: { toggled: entity.name, state: args.state },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Verb: world.open
function applyOpen(world: WorldState, args: { entityId: string }): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  const entity = next.entities[args.entityId];
  if (!entity) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_FOUND", message: `Entity ${args.entityId} not found` },
    };
  }

  if (!entity.openable) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_OPENABLE", message: `${entity.name} cannot be opened` },
    };
  }

  const distance = getDistance(next.robot.pos, entity.pos);
  if (distance > 2) {
    return {
      ok: false,
      next: world,
      error: { code: "TOO_FAR", message: "Entity is too far to open" },
    };
  }

  entity.isOpen = true;
  next.version++;

  return {
    ok: true,
    next,
    info: { opened: entity.name },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Verb: world.close
function applyClose(world: WorldState, args: { entityId: string }): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  const entity = next.entities[args.entityId];
  if (!entity) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_FOUND", message: `Entity ${args.entityId} not found` },
    };
  }

  if (!entity.openable) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_OPENABLE", message: `${entity.name} cannot be closed` },
    };
  }

  const distance = getDistance(next.robot.pos, entity.pos);
  if (distance > 2) {
    return {
      ok: false,
      next: world,
      error: { code: "TOO_FAR", message: "Entity is too far to close" },
    };
  }

  entity.isOpen = false;
  next.version++;

  return {
    ok: true,
    next,
    info: { closed: entity.name },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Verb: world.clean
function applyClean(world: WorldState, args: { targetId: string }): ApplyResult {
  const next = cloneWorld(world);
  const startTime = Date.now();

  const entity = next.entities[args.targetId];
  if (!entity) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_FOUND", message: `Entity ${args.targetId} not found` },
    };
  }

  if (!entity.isDirty) {
    return {
      ok: false,
      next: world,
      error: { code: "NOT_DIRTY", message: `${entity.name} is not dirty` },
    };
  }

  const distance = getDistance(next.robot.pos, entity.pos);
  if (distance > 2) {
    return {
      ok: false,
      next: world,
      error: { code: "TOO_FAR", message: "Entity is too far to clean" },
    };
  }

  entity.isDirty = false;
  next.version++;

  return {
    ok: true,
    next,
    info: { cleaned: entity.name },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Verb: world.scan
function applyScan(
  world: WorldState,
  args: { radius?: number; includeTypes?: string[] }
): ApplyResult {
  const startTime = Date.now();
  const radius = args.radius || 8;

  const nearbyEntities = Object.values(world.entities).filter((entity) => {
    const distance = getDistance(world.robot.pos, entity.pos);
    if (distance > radius) return false;
    if (args.includeTypes && args.includeTypes.length > 0) {
      return args.includeTypes.includes(entity.type);
    }
    return true;
  });

  return {
    ok: true,
    next: world,
    info: {
      entities: nearbyEntities.map((e) => ({
        id: e.id,
        type: e.type,
        name: e.name,
        pos: e.pos,
        room: e.room,
        distance: getDistance(world.robot.pos, e.pos),
      })),
    },
    telemetry: { latencyMs: Date.now() - startTime },
  };
}

// Main verb execution function
export function applyVerb(world: WorldState, call: VerbCall): ApplyResult {
  switch (call.verb) {
    case "world.move_to":
      return applyMoveTo(world, call.args as { target: { x: number; y: number } });
    case "world.pick":
      return applyPick(world, call.args as { entityId: string });
    case "world.place":
      return applyPlace(
        world,
        call.args as any
      );
    case "world.toggle":
      return applyToggle(world, call.args as { entityId: string; state: boolean });
    case "world.open":
      return applyOpen(world, call.args as { entityId: string });
    case "world.close":
      return applyClose(world, call.args as { entityId: string });
    case "world.clean":
      return applyClean(world, call.args as { targetId: string });
    case "world.scan":
      return applyScan(
        world,
        call.args as { radius?: number; includeTypes?: string[] }
      );
    case "world.get_state":
      return {
        ok: true,
        next: world,
        info: { world },
        telemetry: { latencyMs: 0 },
      };
    default:
      return {
        ok: false,
        next: world,
        error: { code: "UNKNOWN_VERB", message: `Unknown verb: ${call.verb}` },
      };
  }
}

// Get room for policy checks
export function isEnteringRoom(
  currentRoom: RoomId,
  targetPos: { x: number; y: number },
  world: WorldState
): RoomId | null {
  const targetRoom = getRoomAtPosition(targetPos, world);
  if (targetRoom && targetRoom !== currentRoom) {
    return targetRoom;
  }
  return null;
}

// Tick robot movement - call this to update robot position along path
// Returns true if movement is still in progress, false if complete
export function tickMovement(world: WorldState): { next: WorldState; isMoving: boolean } {
  if (!world.robot.movement) {
    return { next: world, isMoving: false };
  }

  const next = cloneWorld(world);
  const movement = next.robot.movement!;
  const elapsed = (Date.now() - movement.startedAt) / 1000; // seconds
  const distanceTraveled = elapsed * movement.speed;

  // Calculate position along path
  let accumulatedDistance = 0;
  let currentSegmentStart = movement.path[0];

  for (let i = 1; i < movement.path.length; i++) {
    const segmentEnd = movement.path[i];
    const segmentLength = getDistance(currentSegmentStart, segmentEnd);

    if (accumulatedDistance + segmentLength >= distanceTraveled) {
      // Robot is within this segment
      const segmentProgress = (distanceTraveled - accumulatedDistance) / segmentLength;
      const clampedProgress = Math.min(1, Math.max(0, segmentProgress));

      next.robot.pos = {
        x: currentSegmentStart.x + (segmentEnd.x - currentSegmentStart.x) * clampedProgress,
        y: currentSegmentStart.y + (segmentEnd.y - currentSegmentStart.y) * clampedProgress,
      };
      next.robot.room = getRoomAtPosition(next.robot.pos, next) || next.robot.room;

      return { next, isMoving: true };
    }

    accumulatedDistance += segmentLength;
    currentSegmentStart = segmentEnd;
  }

  // Movement complete - snap to final position and clear movement
  next.robot.pos = movement.targetPos;
  next.robot.room = getRoomAtPosition(movement.targetPos, next) || next.robot.room;
  next.robot.movement = undefined;
  next.version++;

  return { next, isMoving: false };
}

// Complete movement immediately (for testing or skipping animation)
export function completeMovement(world: WorldState): WorldState {
  if (!world.robot.movement) {
    return world;
  }

  const next = cloneWorld(world);
  next.robot.pos = next.robot.movement!.targetPos;
  next.robot.room = getRoomAtPosition(next.robot.pos, next) || next.robot.room;
  next.robot.movement = undefined;
  next.version++;

  return next;
}
