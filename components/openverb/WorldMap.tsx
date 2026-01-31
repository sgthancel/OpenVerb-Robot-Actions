"use client";

import React from "react"

import { useCallback, useMemo } from "react";
import type { WorldState, Entity, RoomId } from "@/src/world/model";

interface WorldMapProps {
  world: WorldState;
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string) => void;
  overlays?: {
    path?: { x: number; y: number }[];
    target?: { x: number; y: number };
  };
}

// Color scheme for rooms
const ROOM_COLORS: Record<RoomId, string> = {
  kitchen: "#1a3a2e",
  living: "#1a2a3e",
  hallway: "#2a2a3e",
  bedroom: "#3a1a2e",
  yard: "#1a3a1a",
  porch: "#2a3a2a",
};

// Entity type icons/colors
const ENTITY_COLORS: Record<string, string> = {
  robot: "#00ff88",
  trash: "#ffaa00",
  dish: "#ffffff",
  cup: "#aaddff",
  package: "#cc8844",
  book: "#8866cc",
  table: "#665544",
  shelf: "#554433",
  trash_bin: "#444444",
  door: "#886644",
  light: "#ffff00",
  faucet: "#4488ff",
  dirty_spot: "#664422",
  fridge: "#aaaaaa",
};

const CELL_SIZE = 20;

export function WorldMap({
  world,
  selectedEntityId,
  onSelectEntity,
  overlays,
}: WorldMapProps) {
  const { grid, rooms, robot, entities } = world;

  // Group entities by position for rendering
  const entitiesByPos = useMemo(() => {
    const map = new Map<string, Entity[]>();
    for (const entity of Object.values(entities)) {
      const key = `${entity.pos.x},${entity.pos.y}`;
      const list = map.get(key) || [];
      list.push(entity);
      map.set(key, list);
    }
    return map;
  }, [entities]);

  // Check if position is blocked
  const isBlocked = useCallback(
    (x: number, y: number) => {
      return grid.blocked.some((b) => b.x === x && b.y === y);
    },
    [grid.blocked]
  );

  // Get room at position
  const getRoomAt = useCallback(
    (x: number, y: number): RoomId | null => {
      for (const [roomId, room] of Object.entries(rooms)) {
        if (
          x >= room.bounds.min.x &&
          x <= room.bounds.max.x &&
          y >= room.bounds.min.y &&
          y <= room.bounds.max.y
        ) {
          return roomId as RoomId;
        }
      }
      return null;
    },
    [rooms]
  );

  // Handle entity click
  const handleCellClick = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;
      const entitiesAtPos = entitiesByPos.get(key);
      if (entitiesAtPos && entitiesAtPos.length > 0 && onSelectEntity) {
        onSelectEntity(entitiesAtPos[0].id);
      }
    },
    [entitiesByPos, onSelectEntity]
  );

  // Render cells
  const cells = useMemo(() => {
    const result: React.ReactNode[] = [];

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const room = getRoomAt(x, y);
        const blocked = isBlocked(x, y);
        const key = `${x},${y}`;
        const entitiesAtPos = entitiesByPos.get(key) || [];
        const isRobot = robot.pos.x === x && robot.pos.y === y;
        const isPath = overlays?.path?.some((p) => p.x === x && p.y === y);
        const isTarget = overlays?.target?.x === x && overlays?.target?.y === y;

        // Determine background color
        let bgColor = room ? ROOM_COLORS[room] : "#111";
        if (blocked) bgColor = "#333";
        if (isPath) bgColor = "rgba(0, 255, 136, 0.2)";
        if (isTarget) bgColor = "rgba(255, 136, 0, 0.4)";

        // Check for selected entity
        const hasSelected = entitiesAtPos.some((e) => e.id === selectedEntityId);

        result.push(
          <div
            key={key}
            className="relative cursor-pointer transition-all hover:brightness-125"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              backgroundColor: bgColor,
              border: hasSelected ? "2px solid #00ff88" : "1px solid rgba(255,255,255,0.05)",
            }}
            onClick={() => handleCellClick(x, y)}
            title={entitiesAtPos.map((e) => e.name).join(", ")}
          >
            {/* Render entity */}
            {entitiesAtPos.length > 0 && !isRobot && (
              <div
                className="absolute inset-1 rounded-sm"
                style={{
                  backgroundColor: ENTITY_COLORS[entitiesAtPos[0].type] || "#888",
                  opacity: entitiesAtPos[0].type === "dirty_spot" ? 0.6 : 1,
                }}
              />
            )}

            {/* Render light indicator */}
            {entitiesAtPos.some((e) => e.type === "light" && e.isOn) && (
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  backgroundColor: "rgba(255, 255, 0, 0.3)",
                  boxShadow: "0 0 10px rgba(255, 255, 0, 0.5)",
                }}
              />
            )}

            {/* Render robot */}
            {isRobot && (
              <div className="absolute inset-0.5 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/50">
                <div className="w-2 h-2 rounded-full bg-background" />
              </div>
            )}

            {/* Carrying indicator */}
            {isRobot && robot.carrying && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
                style={{
                  backgroundColor: ENTITY_COLORS[entities[robot.carrying]?.type] || "#888",
                }}
              />
            )}
          </div>
        );
      }
    }

    return result;
  }, [
    grid,
    getRoomAt,
    isBlocked,
    entitiesByPos,
    robot,
    entities,
    overlays,
    selectedEntityId,
    handleCellClick,
  ]);

  return (
    <div className="overflow-auto bg-card rounded-lg p-4">
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: `repeat(${grid.width}, ${CELL_SIZE}px)`,
        }}
      >
        {cells}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Robot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTITY_COLORS.trash }} />
          <span>Trash</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTITY_COLORS.package }} />
          <span>Package</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTITY_COLORS.light }} />
          <span>Light</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ENTITY_COLORS.book }} />
          <span>Book</span>
        </div>
      </div>
    </div>
  );
}
