"use client";

import React, { useMemo } from "react";
import type { WorldState, Entity, RoomId, Vec2 } from "@/src/world/model";
import { FLOOR_PLAN, SURFACE_STYLES, type SurfaceType } from "@/src/world/floorplan";

interface FloorPlanRendererProps {
  world: WorldState;
  selectedEntityId?: string | null;
  onSelectEntity?: (id: string) => void;
}

const SCALE = FLOOR_PLAN.scale;
const WIDTH = FLOOR_PLAN.width * SCALE;
const HEIGHT = FLOOR_PLAN.height * SCALE;

// Map grid coordinates to floor plan coordinates
function gridToFloor(pos: Vec2): Vec2 {
  return {
    x: (pos.x / 32) * FLOOR_PLAN.width * SCALE,
    y: (pos.y / 24) * FLOOR_PLAN.height * SCALE,
  };
}

// Entity icons as SVG paths
const EntityIcon = ({ type, isOn, isOpen, isDirty }: { type: string; isOn?: boolean; isOpen?: boolean; isDirty?: boolean }) => {
  switch (type) {
    case "fridge":
      return (
        <g>
          <rect x="-12" y="-18" width="24" height="36" rx="2" fill="#E0E0E0" stroke="#888" strokeWidth="1.5" />
          <line x1="-12" y1="0" x2="12" y2="0" stroke="#888" strokeWidth="1" />
          <rect x="6" y="-12" width="3" height="8" rx="1" fill="#666" />
          <rect x="6" y="4" width="3" height="8" rx="1" fill="#666" />
        </g>
      );
    case "table":
      return (
        <g>
          <rect x="-20" y="-12" width="40" height="24" rx="2" fill="#8B6914" stroke="#5C4A10" strokeWidth="1.5" />
          <rect x="-18" y="-10" width="36" height="20" rx="1" fill="#A67C00" opacity="0.3" />
        </g>
      );
    case "shelf":
      return (
        <g>
          <rect x="-16" y="-20" width="32" height="40" rx="1" fill="#654321" stroke="#4A3015" strokeWidth="1.5" />
          <line x1="-14" y1="-10" x2="14" y2="-10" stroke="#4A3015" strokeWidth="1" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#4A3015" strokeWidth="1" />
          <line x1="-14" y1="10" x2="14" y2="10" stroke="#4A3015" strokeWidth="1" />
        </g>
      );
    case "trash_bin":
      return (
        <g>
          <path d="M-8 -10 L-10 12 L10 12 L8 -10 Z" fill="#505050" stroke="#333" strokeWidth="1.5" />
          <rect x="-10" y="-12" width="20" height="4" rx="1" fill="#404040" />
          <line x1="-4" y1="-6" x2="-4" y2="8" stroke="#333" strokeWidth="0.5" />
          <line x1="4" y1="-6" x2="4" y2="8" stroke="#333" strokeWidth="0.5" />
        </g>
      );
    case "door":
      return (
        <g>
          <rect x="-2" y="-18" width="4" height="36" fill={isOpen ? "#D4A574" : "#8B6914"} stroke="#5C4A10" strokeWidth="1" />
          {!isOpen && <circle cx="1" cy="0" r="2" fill="#C0A000" />}
          {isOpen && (
            <rect x="-2" y="-18" width="24" height="36" fill="#D4A574" stroke="#5C4A10" strokeWidth="1" opacity="0.5" transform="rotate(-60 -2 0)" />
          )}
        </g>
      );
    case "light":
      return (
        <g>
          <circle cx="0" cy="0" r="10" fill={isOn ? "#FFE066" : "#666"} stroke={isOn ? "#FFD000" : "#444"} strokeWidth="1.5" />
          {isOn && (
            <>
              <circle cx="0" cy="0" r="16" fill="none" stroke="#FFE066" strokeWidth="0.5" opacity="0.5" />
              <circle cx="0" cy="0" r="22" fill="none" stroke="#FFE066" strokeWidth="0.5" opacity="0.3" />
            </>
          )}
          <circle cx="0" cy="0" r="4" fill={isOn ? "#FFF" : "#888"} />
        </g>
      );
    case "faucet":
      return (
        <g>
          <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#C0C0C0" stroke="#888" strokeWidth="1" />
          <path d="M0 -4 Q0 -12 8 -12 L8 -10 Q2 -10 2 -4" fill="none" stroke="#888" strokeWidth="2" />
          {isOn && (
            <path d="M4 -10 Q4 0 1 8 M6 -10 Q6 2 3 10" fill="none" stroke="#66B3FF" strokeWidth="1" opacity="0.7" />
          )}
        </g>
      );
    case "dirty_spot":
      return (
        <g>
          <ellipse cx="0" cy="0" rx="14" ry="10" fill="#8B7355" opacity="0.6" />
          <ellipse cx="-4" cy="-2" rx="6" ry="4" fill="#6B5344" opacity="0.5" />
          <ellipse cx="5" cy="3" rx="4" ry="3" fill="#6B5344" opacity="0.4" />
        </g>
      );
    case "trash":
      return (
        <g>
          <path d="M-6 -6 Q-8 0 -4 6 Q0 8 4 6 Q8 0 6 -6 Q0 -8 -6 -6" fill="#D4A574" stroke="#A67C00" strokeWidth="1" />
          <path d="M-2 -4 L2 -2 L0 2 L-3 1 Z" fill="#C9A066" />
        </g>
      );
    case "dish":
      return (
        <g>
          <ellipse cx="0" cy="0" rx="12" ry="8" fill="#FFF" stroke="#DDD" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="8" ry="5" fill="none" stroke="#EEE" strokeWidth="0.5" />
        </g>
      );
    case "cup":
      return (
        <g>
          <path d="M-5 -8 L-6 8 L6 8 L5 -8 Z" fill="#FFF" stroke="#DDD" strokeWidth="1" />
          <path d="M6 -4 Q12 -4 12 2 Q12 8 6 8" fill="none" stroke="#DDD" strokeWidth="1.5" />
          <ellipse cx="0" cy="-8" rx="5" ry="2" fill="#8B4513" />
        </g>
      );
    case "book":
      return (
        <g>
          <rect x="-10" y="-7" width="20" height="14" rx="1" fill="#8B0000" stroke="#5C0000" strokeWidth="1" />
          <rect x="-8" y="-5" width="16" height="10" fill="#F5F5DC" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="#DDD" strokeWidth="0.5" />
        </g>
      );
    case "package":
      return (
        <g>
          <rect x="-14" y="-10" width="28" height="20" rx="1" fill="#D2A679" stroke="#A67C52" strokeWidth="1.5" />
          <line x1="-14" y1="0" x2="14" y2="0" stroke="#8B6914" strokeWidth="2" />
          <line x1="0" y1="-10" x2="0" y2="10" stroke="#8B6914" strokeWidth="2" />
        </g>
      );
    default:
      return <circle cx="0" cy="0" r="8" fill="#888" />;
  }
};

// Robot SVG
const RobotIcon = ({ carrying }: { carrying: boolean }) => (
  <g>
    {/* Robot body */}
    <circle cx="0" cy="0" r="14" fill="#2D2D2D" stroke="#00E676" strokeWidth="2" />
    {/* Direction indicator */}
    <path d="M0 -14 L6 -6 L-6 -6 Z" fill="#00E676" />
    {/* Eye/sensor */}
    <circle cx="0" cy="-4" r="4" fill="#00E676" />
    <circle cx="0" cy="-4" r="2" fill="#FFF" />
    {/* Carrying indicator */}
    {carrying && (
      <g transform="translate(10, -10)">
        <circle cx="0" cy="0" r="6" fill="#FFB300" stroke="#FFF" strokeWidth="1" />
      </g>
    )}
    {/* Glow effect */}
    <circle cx="0" cy="0" r="18" fill="none" stroke="#00E676" strokeWidth="1" opacity="0.3" />
  </g>
);

// Pattern definitions
const PatternDefs = () => (
  <defs>
    {/* Wood grain pattern */}
    <pattern id="pattern-wood" patternUnits="userSpaceOnUse" width="40" height="10">
      <rect width="40" height="10" fill="#C4A484" />
      <path d="M0 2 Q10 1 20 2 T40 2" stroke="#B8956E" strokeWidth="0.5" fill="none" />
      <path d="M0 5 Q10 4 20 5 T40 5" stroke="#B8956E" strokeWidth="0.3" fill="none" />
      <path d="M0 8 Q10 7 20 8 T40 8" stroke="#B8956E" strokeWidth="0.5" fill="none" />
    </pattern>
    
    {/* Tile pattern */}
    <pattern id="pattern-tile" patternUnits="userSpaceOnUse" width="24" height="24">
      <rect width="24" height="24" fill="#E8E4E0" />
      <rect x="0" y="0" width="11" height="11" fill="#F0EDE8" stroke="#D8D4D0" strokeWidth="0.5" />
      <rect x="12" y="0" width="11" height="11" fill="#E8E4E0" stroke="#D8D4D0" strokeWidth="0.5" />
      <rect x="0" y="12" width="11" height="11" fill="#E8E4E0" stroke="#D8D4D0" strokeWidth="0.5" />
      <rect x="12" y="12" width="11" height="11" fill="#F0EDE8" stroke="#D8D4D0" strokeWidth="0.5" />
    </pattern>
    
    {/* Carpet pattern */}
    <pattern id="pattern-carpet" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#8B9DC3" />
      <circle cx="2" cy="2" r="0.5" fill="#7A8CB2" />
      <circle cx="6" cy="6" r="0.5" fill="#7A8CB2" />
    </pattern>
    
    {/* Grass pattern */}
    <pattern id="pattern-grass" patternUnits="userSpaceOnUse" width="16" height="16">
      <rect width="16" height="16" fill="#7CB342" />
      <path d="M2 16 Q2 10 4 8" stroke="#6BA332" strokeWidth="0.8" fill="none" />
      <path d="M6 16 Q6 12 7 10" stroke="#8BC34A" strokeWidth="0.6" fill="none" />
      <path d="M10 16 Q10 11 12 9" stroke="#6BA332" strokeWidth="0.8" fill="none" />
      <path d="M14 16 Q14 13 15 11" stroke="#8BC34A" strokeWidth="0.6" fill="none" />
    </pattern>
    
    {/* Concrete pattern */}
    <pattern id="pattern-concrete" patternUnits="userSpaceOnUse" width="30" height="30">
      <rect width="30" height="30" fill="#B0B0B0" />
      <circle cx="5" cy="8" r="1" fill="#A0A0A0" opacity="0.5" />
      <circle cx="20" cy="15" r="1.5" fill="#A0A0A0" opacity="0.4" />
      <circle cx="12" cy="25" r="1" fill="#A0A0A0" opacity="0.5" />
    </pattern>
    
    {/* Patio stone pattern */}
    <pattern id="pattern-stone" patternUnits="userSpaceOnUse" width="48" height="48">
      <rect width="48" height="48" fill="#A99B8D" />
      <rect x="2" y="2" width="20" height="20" rx="2" fill="#B5A799" stroke="#897B6D" strokeWidth="1" />
      <rect x="26" y="2" width="20" height="20" rx="2" fill="#A99B8D" stroke="#897B6D" strokeWidth="1" />
      <rect x="2" y="26" width="20" height="20" rx="2" fill="#A99B8D" stroke="#897B6D" strokeWidth="1" />
      <rect x="26" y="26" width="20" height="20" rx="2" fill="#B5A799" stroke="#897B6D" strokeWidth="1" />
    </pattern>
    
    {/* Selection glow filter */}
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
);

// Room component
const Room = ({ room, isBackground }: { room: typeof FLOOR_PLAN.rooms[0]; isBackground?: boolean }) => {
  const points = room.polygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(" ");
  const patternId = `pattern-${room.surface}`;
  
  if (isBackground && room.id === "yard") {
    return (
      <polygon
        points={points}
        fill={`url(#${patternId})`}
        stroke="none"
      />
    );
  }
  
  if (room.id === "yard") return null;
  
  return (
    <g>
      <polygon
        points={points}
        fill={`url(#${patternId})`}
        stroke={SURFACE_STYLES[room.surface].stroke}
        strokeWidth="0.5"
      />
      {/* Room label */}
      <text
        x={room.label.x * SCALE}
        y={room.label.y * SCALE}
        textAnchor="middle"
        fill="#666"
        fontSize="10"
        fontWeight="500"
        fontFamily="var(--font-sans)"
        opacity="0.7"
      >
        {room.name}
      </text>
    </g>
  );
};

// Wall component
const Wall = ({ from, to, thickness }: { from: Vec2; to: Vec2; thickness: number }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * thickness * SCALE / 2;
  const ny = (dx / len) * thickness * SCALE / 2;
  
  const points = [
    { x: from.x * SCALE + nx, y: from.y * SCALE + ny },
    { x: to.x * SCALE + nx, y: to.y * SCALE + ny },
    { x: to.x * SCALE - nx, y: to.y * SCALE - ny },
    { x: from.x * SCALE - nx, y: from.y * SCALE - ny },
  ];
  
  return (
    <polygon
      points={points.map(p => `${p.x},${p.y}`).join(" ")}
      fill="#333"
      stroke="#222"
      strokeWidth="1"
    />
  );
};

// Fixture component
const Fixture = ({ fixture }: { fixture: typeof FLOOR_PLAN.fixtures[0] }) => {
  const points = fixture.polygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(" ");
  
  return (
    <polygon
      points={points}
      fill={fixture.type === "counter" ? "#606060" : "#707070"}
      stroke="#404040"
      strokeWidth="1"
    />
  );
};

// Door component
const Door = ({ door, isOpen }: { door: typeof FLOOR_PLAN.doors[0]; isOpen: boolean }) => {
  const x = door.pos.x * SCALE;
  const y = door.pos.y * SCALE;
  const w = door.width * SCALE;
  
  return (
    <g transform={`translate(${x}, ${y}) rotate(${door.rotation || 0})`}>
      {/* Door frame */}
      <rect x={-w/2 - 2} y={-3} width={w + 4} height={6} fill="#5C4A10" />
      {/* Door opening */}
      <rect x={-w/2} y={-2} width={w} height={4} fill={door.isExterior ? "#7CB342" : "#C4A484"} />
      {/* Door leaf (if closed) */}
      {!isOpen && (
        <rect x={-w/2 + 1} y={-1.5} width={w - 2} height={3} fill="#8B6914" stroke="#5C4A10" strokeWidth="0.5" />
      )}
    </g>
  );
};

// Window component
const Window = ({ window }: { window: typeof FLOOR_PLAN.windows[0] }) => {
  const x = window.pos.x * SCALE;
  const y = window.pos.y * SCALE;
  const w = window.width * SCALE;
  
  return (
    <g transform={`translate(${x}, ${y}) rotate(${window.rotation || 0})`}>
      <rect x={-w/2} y={-3} width={w} height={6} fill="#87CEEB" stroke="#666" strokeWidth="1" />
      <line x1={-w/2} y1="0" x2={w/2} y2="0" stroke="#666" strokeWidth="0.5" />
      <line x1="0" y1={-3} x2="0" y2={3} stroke="#666" strokeWidth="0.5" />
    </g>
  );
};

// Pathway component
const Pathway = ({ pathway }: { pathway: typeof FLOOR_PLAN.pathways[0] }) => {
  const points = pathway.polygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(" ");
  const patternId = `pattern-${pathway.surface}`;
  
  return (
    <polygon
      points={points}
      fill={`url(#${patternId})`}
      stroke={SURFACE_STYLES[pathway.surface].stroke}
      strokeWidth="0.5"
    />
  );
};

export function FloorPlanRenderer({ world, selectedEntityId, onSelectEntity }: FloorPlanRendererProps) {
  const { robot, entities } = world;
  
  // Get robot position in floor plan coordinates
  const robotPos = useMemo(() => gridToFloor(robot.pos), [robot.pos]);
  
  // Get entity positions
  const entityPositions = useMemo(() => {
    return Object.values(entities).map(entity => ({
      ...entity,
      floorPos: gridToFloor(entity.pos),
    }));
  }, [entities]);
  
  // Check if doors are open
  const doorStates = useMemo(() => {
    const states: Record<string, boolean> = {};
    for (const entity of Object.values(entities)) {
      if (entity.type === "door") {
        states[entity.id] = entity.isOpen || false;
      }
    }
    return states;
  }, [entities]);

  return (
    <div className="bg-card rounded-lg p-4 overflow-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto max-h-[500px]"
        style={{ minWidth: "600px" }}
      >
        <PatternDefs />
        
        {/* Background (yard) */}
        {FLOOR_PLAN.rooms.filter(r => r.id === "yard").map(room => (
          <Room key={room.id} room={room} isBackground />
        ))}
        
        {/* Pathways */}
        {FLOOR_PLAN.pathways.map(pathway => (
          <Pathway key={pathway.id} pathway={pathway} />
        ))}
        
        {/* Interior rooms */}
        {FLOOR_PLAN.rooms.filter(r => r.id !== "yard").map(room => (
          <Room key={room.id} room={room} />
        ))}
        
        {/* Fixtures */}
        {FLOOR_PLAN.fixtures.map(fixture => (
          <Fixture key={fixture.id} fixture={fixture} />
        ))}
        
        {/* Exterior walls */}
        {FLOOR_PLAN.exteriorWalls.map((wall, i) => (
          <Wall key={`ext-${i}`} from={wall.from} to={wall.to} thickness={wall.thickness} />
        ))}
        
        {/* Interior walls */}
        {FLOOR_PLAN.interiorWalls.map((wall, i) => (
          <Wall key={`int-${i}`} from={wall.from} to={wall.to} thickness={wall.thickness} />
        ))}
        
        {/* Windows */}
        {FLOOR_PLAN.windows.map((w, i) => (
          <Window key={`win-${i}`} window={w} />
        ))}
        
        {/* Doors */}
        {FLOOR_PLAN.doors.map(door => (
          <Door key={door.id} door={door} isOpen={doorStates[door.id] || false} />
        ))}
        
        {/* Entities */}
        {entityPositions.map(entity => {
          // Skip doors as they're rendered separately
          if (entity.type === "door") return null;
          
          const isSelected = entity.id === selectedEntityId;
          
          return (
            <g
              key={entity.id}
              transform={`translate(${entity.floorPos.x}, ${entity.floorPos.y})`}
              onClick={() => onSelectEntity?.(entity.id)}
              className="cursor-pointer"
              filter={isSelected ? "url(#glow)" : undefined}
            >
              <EntityIcon
                type={entity.type}
                isOn={entity.isOn}
                isOpen={entity.isOpen}
                isDirty={entity.isDirty}
              />
              {isSelected && (
                <circle cx="0" cy="0" r="24" fill="none" stroke="#00E676" strokeWidth="2" strokeDasharray="4 2" />
              )}
            </g>
          );
        })}
        
        {/* Robot */}
        <g transform={`translate(${robotPos.x}, ${robotPos.y})`}>
          <RobotIcon carrying={robot.carrying !== null} />
        </g>
        
        {/* Scale indicator */}
        <g transform={`translate(${WIDTH - 80}, ${HEIGHT - 20})`}>
          <line x1="0" y1="0" x2="48" y2="0" stroke="#666" strokeWidth="1" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke="#666" strokeWidth="1" />
          <line x1="48" y1="-4" x2="48" y2="4" stroke="#666" strokeWidth="1" />
          <text x="24" y="-6" textAnchor="middle" fill="#666" fontSize="8" fontFamily="var(--font-sans)">
            {"4 ft"}
          </text>
        </g>
      </svg>
      
      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#2D2D2D] border-2 border-[#00E676]" />
          <span>Robot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#C4A484] rounded-sm" />
          <span>Hardwood</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#E8E4E0] rounded-sm" />
          <span>Tile</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#8B9DC3] rounded-sm" />
          <span>Carpet</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 bg-[#7CB342] rounded-sm" />
          <span>Grass</span>
        </div>
      </div>
    </div>
  );
}
