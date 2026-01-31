// OpenVerb Robot Actions - Observation Builder
// Builds what the pilot is allowed to "see"

import type { WorldState, Observation, ObservationEntity } from "./model";
import { getDistance } from "./nav";

export interface ObserveParams {
  radius?: number;
  includeRooms?: boolean;
  includeEntities?: boolean;
  includeBlocked?: boolean;
  includeTypes?: string[];
}

export function buildObservation(
  world: WorldState,
  params: ObserveParams = {}
): Observation {
  const {
    radius = 10,
    includeRooms = true,
    includeEntities = true,
    includeBlocked = true,
    includeTypes = [],
  } = params;

  // Get entities within radius
  const visibleEntities: ObservationEntity[] = [];

  if (includeEntities) {
    for (const entity of Object.values(world.entities)) {
      // Filter out entities that are inside a container
      if (entity.parentId) continue;

      const distance = getDistance(world.robot.pos, entity.pos);
      if (distance <= radius) {
        // Filter by type if specified
        if (includeTypes.length > 0 && !includeTypes.includes(entity.type)) {
          continue;
        }

        visibleEntities.push({
          id: entity.id,
          type: entity.type,
          name: entity.name,
          pos: entity.pos,
          room: entity.room,
          state: {
            isOpen: entity.isOpen,
            isOn: entity.isOn,
            isDirty: entity.isDirty,
            containsCount: entity.contains?.length,
            pickable: entity.pickable,
            container: entity.container,
            parentId: entity.parentId,
          },
        });
      }
    }
  }

  // Get blocked tiles within radius
  const visibleBlocked = includeBlocked
    ? world.grid.blocked.filter(
      (b) => getDistance(world.robot.pos, b) <= radius
    )
    : [];

  // Build observation
  const observation: Observation = {
    ts: new Date().toISOString(),
    robot: {
      pos: world.robot.pos,
      room: world.robot.room,
      carrying: world.robot.carrying,
      batteryPct: world.robot.batteryPct,
    },
    blocked: visibleBlocked,
    entities: visibleEntities,
  };

  // Include room info if requested
  if (includeRooms) {
    observation.rooms = Object.fromEntries(
      Object.entries(world.rooms).map(([id, room]) => [
        id,
        { name: room.name, bounds: room.bounds },
      ])
    );
  }

  return observation;
}
