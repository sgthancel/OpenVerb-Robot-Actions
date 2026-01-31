// OpenVerb Robot Actions - Navigation / A* Pathfinding
import type { Vec2, WorldState, RoomId } from "./model";

interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

function heuristic(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isBlocked(pos: Vec2, world: WorldState): boolean {
  // Check static walls from grid
  if (world.grid.blocked.some((b) => b.x === pos.x && b.y === pos.y)) return true;

  // Check stationary entities (not pickable and not the robot itself)
  for (const entity of Object.values(world.entities)) {
    if (!entity.pickable && entity.pos.x === pos.x && entity.pos.y === pos.y) {
      // Exception: allow moving to the robot's own position
      if (world.robot.pos.x === pos.x && world.robot.pos.y === pos.y) continue;

      // These are solid obstacles
      const solidTypes: string[] = ["table", "shelf", "trash_bin", "fridge", "bed", "sofa", "tv", "plant", "mailbox", "car"];
      if (solidTypes.includes(entity.type) || !entity.pickable) {
        return true;
      }
    }
  }

  return false;
}

function isInBounds(pos: Vec2, world: WorldState): boolean {
  return pos.x >= 0 && pos.x < world.grid.width && pos.y >= 0 && pos.y < world.grid.height;
}

export function findPath(start: Vec2, end: Vec2, world: WorldState): Vec2[] | null {
  if (!isInBounds(end, world)) return null;

  // If target is blocked (e.g. a table or bin), find the nearest reachable neighbor
  let targetNode = end;
  if (isBlocked(end, world)) {
    const neighbors = [
      { x: end.x, y: end.y - 1 },
      { x: end.x, y: end.y + 1 },
      { x: end.x - 1, y: end.y },
      { x: end.x + 1, y: end.y },
    ];

    // Find closest non-blocked neighbor to the start position
    const reachable = neighbors
      .filter(n => isInBounds(n, world) && !isBlocked(n, world))
      .sort((a, b) => heuristic(start, a) - heuristic(start, b));

    if (reachable.length > 0) {
      targetNode = reachable[0];
    } else {
      return null;
    }
  }

  const endPos = targetNode;

  const openList: PathNode[] = [];
  const closedSet = new Set<string>();

  const startNode: PathNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, endPos),
    f: heuristic(start, endPos),
    parent: null,
  };

  openList.push(startNode);

  const directions = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
  ];

  while (openList.length > 0) {
    // Find node with lowest f score
    openList.sort((a, b) => a.f - b.f);
    const current = openList.shift()!;

    // Check if we reached the goal
    if (current.x === endPos.x && current.y === endPos.y) {
      // Reconstruct path
      const path: Vec2[] = [];
      let node: PathNode | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    closedSet.add(`${current.x},${current.y}`);

    // Explore neighbors
    for (const dir of directions) {
      const neighborPos = { x: current.x + dir.x, y: current.y + dir.y };
      const key = `${neighborPos.x},${neighborPos.y}`;

      if (
        !isInBounds(neighborPos, world) ||
        isBlocked(neighborPos, world) ||
        closedSet.has(key)
      ) {
        continue;
      }

      const g = current.g + 1;
      const h = heuristic(neighborPos, endPos);
      const f = g + h;

      const existingNode = openList.find(
        (n) => n.x === neighborPos.x && n.y === neighborPos.y
      );

      if (existingNode) {
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = f;
          existingNode.parent = current;
        }
      } else {
        openList.push({
          x: neighborPos.x,
          y: neighborPos.y,
          g,
          h,
          f,
          parent: current,
        });
      }
    }
  }

  return null; // No path found
}

export function getRoomAtPosition(pos: Vec2, world: WorldState): RoomId | null {
  for (const [roomId, room] of Object.entries(world.rooms)) {
    if (
      pos.x >= room.bounds.min.x &&
      pos.x <= room.bounds.max.x &&
      pos.y >= room.bounds.min.y &&
      pos.y <= room.bounds.max.y
    ) {
      return roomId as RoomId;
    }
  }
  return null;
}

export function getDistance(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function getEntitiesInRadius(
  center: Vec2,
  radius: number,
  world: WorldState
): string[] {
  return Object.keys(world.entities).filter((id) => {
    const entity = world.entities[id];
    return getDistance(center, entity.pos) <= radius;
  });
}
