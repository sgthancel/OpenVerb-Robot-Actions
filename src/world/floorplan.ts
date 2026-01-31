// Architectural Floor Plan Definition
// Defines walls, surfaces, fixtures, and furniture with real-world positioning

import type { RoomId, Vec2 } from "./model";

export type SurfaceType = 
  | "hardwood" 
  | "tile" 
  | "carpet" 
  | "concrete" 
  | "grass" 
  | "patio_stone";

export type WallSegment = {
  from: Vec2;
  to: Vec2;
  thickness: number;
  hasDoor?: { position: number; width: number; id: string };
  hasWindow?: { position: number; width: number };
};

export type RoomDefinition = {
  id: RoomId;
  name: string;
  polygon: Vec2[]; // clockwise vertices defining room shape
  surface: SurfaceType;
  label: { x: number; y: number }; // label position
};

export type FixtureDefinition = {
  id: string;
  type: "counter" | "island" | "bathtub" | "shower" | "toilet" | "sink" | "closet" | "stairs";
  polygon: Vec2[];
  room: RoomId;
};

export type FurnitureDefinition = {
  id: string;
  type: string;
  shape: "rect" | "circle" | "L";
  pos: Vec2;
  size: { w: number; h: number };
  rotation?: number;
  room: RoomId;
};

// Floor plan in architectural units (1 unit = 1 foot)
// Total property: 60ft x 48ft
export const FLOOR_PLAN = {
  // Overall dimensions
  width: 60,
  height: 48,
  scale: 12, // pixels per foot
  
  // Exterior walls
  exteriorWalls: [
    // Main house outline
    { from: { x: 8, y: 8 }, to: { x: 52, y: 8 }, thickness: 0.5 },
    { from: { x: 52, y: 8 }, to: { x: 52, y: 36 }, thickness: 0.5 },
    { from: { x: 52, y: 36 }, to: { x: 8, y: 36 }, thickness: 0.5 },
    { from: { x: 8, y: 36 }, to: { x: 8, y: 8 }, thickness: 0.5 },
  ] as WallSegment[],
  
  // Interior walls
  interiorWalls: [
    // Kitchen/Living divider (partial wall with opening)
    { from: { x: 28, y: 8 }, to: { x: 28, y: 18 }, thickness: 0.33 },
    // Hallway walls
    { from: { x: 36, y: 22 }, to: { x: 52, y: 22 }, thickness: 0.33 },
    { from: { x: 36, y: 22 }, to: { x: 36, y: 36 }, thickness: 0.33, hasDoor: { position: 8, width: 3, id: "door_bedroom" } },
    // Bathroom wall
    { from: { x: 44, y: 22 }, to: { x: 44, y: 36 }, thickness: 0.33, hasDoor: { position: 4, width: 2.5, id: "door_bathroom" } },
  ] as WallSegment[],
  
  // Room definitions
  rooms: [
    {
      id: "kitchen" as RoomId,
      name: "Kitchen",
      polygon: [
        { x: 8, y: 8 },
        { x: 28, y: 8 },
        { x: 28, y: 22 },
        { x: 8, y: 22 },
      ],
      surface: "tile" as SurfaceType,
      label: { x: 18, y: 15 },
    },
    {
      id: "living" as RoomId,
      name: "Living Room",
      polygon: [
        { x: 28, y: 8 },
        { x: 52, y: 8 },
        { x: 52, y: 22 },
        { x: 28, y: 22 },
      ],
      surface: "hardwood" as SurfaceType,
      label: { x: 40, y: 15 },
    },
    {
      id: "hallway" as RoomId,
      name: "Hallway",
      polygon: [
        { x: 8, y: 22 },
        { x: 36, y: 22 },
        { x: 36, y: 36 },
        { x: 8, y: 36 },
      ],
      surface: "hardwood" as SurfaceType,
      label: { x: 22, y: 29 },
    },
    {
      id: "bedroom" as RoomId,
      name: "Bedroom",
      polygon: [
        { x: 36, y: 22 },
        { x: 44, y: 22 },
        { x: 44, y: 36 },
        { x: 36, y: 36 },
      ],
      surface: "carpet" as SurfaceType,
      label: { x: 40, y: 29 },
    },
    {
      id: "porch" as RoomId,
      name: "Patio",
      polygon: [
        { x: 44, y: 22 },
        { x: 52, y: 22 },
        { x: 52, y: 36 },
        { x: 44, y: 36 },
      ],
      surface: "tile" as SurfaceType,
      label: { x: 48, y: 29 },
    },
    {
      id: "yard" as RoomId,
      name: "Yard",
      polygon: [
        { x: 0, y: 0 },
        { x: 60, y: 0 },
        { x: 60, y: 48 },
        { x: 0, y: 48 },
      ],
      surface: "grass" as SurfaceType,
      label: { x: 30, y: 42 },
    },
  ] as RoomDefinition[],
  
  // Built-in fixtures
  fixtures: [
    // Kitchen counters (L-shaped)
    {
      id: "counter_kitchen",
      type: "counter" as const,
      polygon: [
        { x: 8.5, y: 8.5 },
        { x: 14, y: 8.5 },
        { x: 14, y: 10.5 },
        { x: 10.5, y: 10.5 },
        { x: 10.5, y: 14 },
        { x: 8.5, y: 14 },
      ],
      room: "kitchen" as RoomId,
    },
    // Kitchen island
    {
      id: "island_kitchen",
      type: "island" as const,
      polygon: [
        { x: 16, y: 12 },
        { x: 22, y: 12 },
        { x: 22, y: 15 },
        { x: 16, y: 15 },
      ],
      room: "kitchen" as RoomId,
    },
  ] as FixtureDefinition[],
  
  // Doors
  doors: [
    { id: "door_front", pos: { x: 30, y: 36 }, width: 3.5, rotation: 0, isExterior: true },
    { id: "door_back", pos: { x: 48, y: 36 }, width: 3, rotation: 0, isExterior: true },
    { id: "door_bedroom", pos: { x: 36, y: 30 }, width: 3, rotation: 90, isExterior: false },
    { id: "door_bathroom", pos: { x: 44, y: 26 }, width: 2.5, rotation: 90, isExterior: false },
  ],
  
  // Windows
  windows: [
    { pos: { x: 18, y: 8 }, width: 4, isExterior: true },
    { pos: { x: 40, y: 8 }, width: 5, isExterior: true },
    { pos: { x: 52, y: 14 }, width: 4, rotation: 90, isExterior: true },
    { pos: { x: 8, y: 28 }, width: 4, rotation: 90, isExterior: true },
  ],
  
  // Driveway/pathways
  pathways: [
    {
      id: "driveway",
      polygon: [
        { x: 0, y: 38 },
        { x: 8, y: 38 },
        { x: 8, y: 48 },
        { x: 0, y: 48 },
      ],
      surface: "concrete" as SurfaceType,
    },
    {
      id: "walkway",
      polygon: [
        { x: 28, y: 36 },
        { x: 32, y: 36 },
        { x: 32, y: 42 },
        { x: 28, y: 42 },
      ],
      surface: "patio_stone" as SurfaceType,
    },
  ],
};

// Surface colors and patterns
export const SURFACE_STYLES: Record<SurfaceType, { fill: string; pattern?: string; stroke?: string }> = {
  hardwood: { fill: "#C4A484", pattern: "wood", stroke: "#A08060" },
  tile: { fill: "#E8E4E0", pattern: "tile", stroke: "#D0CCC8" },
  carpet: { fill: "#8B9DC3", pattern: "carpet", stroke: "#7A8CB2" },
  concrete: { fill: "#B0B0B0", pattern: "concrete", stroke: "#909090" },
  grass: { fill: "#7CB342", pattern: "grass", stroke: "#6BA332" },
  patio_stone: { fill: "#A99B8D", pattern: "stone", stroke: "#897B6D" },
};

// Convert grid position to floor plan position
export function gridToFloorPlan(gridPos: Vec2, gridWidth: number, gridHeight: number): Vec2 {
  // Map 32x24 grid to 60x48 floor plan
  return {
    x: (gridPos.x / gridWidth) * FLOOR_PLAN.width,
    y: (gridPos.y / gridHeight) * FLOOR_PLAN.height,
  };
}

// Convert floor plan position to pixel position
export function floorPlanToPixel(pos: Vec2): Vec2 {
  return {
    x: pos.x * FLOOR_PLAN.scale,
    y: pos.y * FLOOR_PLAN.scale,
  };
}
