// OpenVerb Town - World State Model
// A deterministic grid world with entity states and robot inventory

export type Vec2 = { x: number; y: number };

export type RoomId =
  | "kitchen"
  | "living"
  | "hallway"
  | "bedroom"
  | "yard"
  | "porch";

export type EntityType =
  | "robot"
  | "trash"
  | "dish"
  | "cup"
  | "package"
  | "book"
  | "table"
  | "shelf"
  | "trash_bin"
  | "door"
  | "light"
  | "faucet"
  | "dirty_spot"
  | "fridge"
  | "bed"
  | "sofa"
  | "tv"
  | "plant"
  | "mailbox"
  | "car";

export type Entity = {
  id: string;
  type: EntityType;
  name: string;
  pos: Vec2;
  room: RoomId;

  // interaction flags
  pickable?: boolean;
  container?: boolean; // table, shelf, trash_bin
  openable?: boolean; // door, fridge
  toggleable?: boolean; // light, faucet

  // state
  isOpen?: boolean;
  isOn?: boolean;
  isDirty?: boolean;

  // containment
  contains?: string[]; // ids of contained entities
  parentId?: string;   // id of the container entity (if any)
};

export type RobotState = {
  id: string;
  pos: Vec2;
  room: RoomId;
  carrying: string | null; // entityId
  batteryPct: number;
  // Movement state for animation
  movement?: {
    path: Vec2[];           // Waypoints to follow
    targetPos: Vec2;        // Final destination
    startedAt: number;      // Timestamp when movement started
    speed: number;          // Grid units per second
  };
};

export type PilotSettings = {
  useAI: boolean;
  isRunning: boolean;
  taskId: string | null;
  goal: string | null;
};

export type PolicyState = {
  pendingConfirmation?: {
    id: string;
    reason: string;
    verb: string;
    args: unknown;
  };
};

export type RoomBounds = {
  id: RoomId;
  name: string;
  bounds: { min: Vec2; max: Vec2 };
};

export type WorldState = {
  version: number;
  grid: {
    width: number;
    height: number;
    blocked: Vec2[]; // walls/obstacles
  };
  rooms: Record<RoomId, RoomBounds>;
  robot: RobotState;
  entities: Record<string, Entity>;
  time: { hour: number; minute: number };
  policy: PolicyState;
  pilot: PilotSettings;
};

// Verb types
export type VerbName =
  | "world.move_to"
  | "world.pick"
  | "world.place"
  | "world.toggle"
  | "world.open"
  | "world.close"
  | "world.clean"
  | "world.scan"
  | "world.observe"
  | "world.get_state";

export type VerbCall = {
  verb: VerbName;
  args: Record<string, unknown>;
  stepId?: string;
};

export type ApplyResult = {
  ok: boolean;
  next: WorldState;
  info?: unknown;
  error?: { code: string; message: string };
  telemetry?: { latencyMs: number; steps?: number };
};

// Observation types (what the pilot sees)
export type ObservationEntity = {
  id: string;
  type: string;
  name: string;
  pos: Vec2;
  room: string;
  state: {
    isOpen?: boolean;
    isOn?: boolean;
    isDirty?: boolean;
    containsCount?: number;
    pickable?: boolean;
    container?: boolean;
    parentId?: string;
  };
};

export type Observation = {
  ts: string;
  robot: { pos: Vec2; room: string; carrying: string | null; batteryPct: number };
  blocked: Vec2[];
  entities: ObservationEntity[];
  rooms?: Record<string, { name: string; bounds: { min: Vec2; max: Vec2 } }>;
};

// Event types
export type RobotEventType =
  | "goal.set"
  | "observe.finished"
  | "pilot.act"
  | "pilot.done"
  | "verb.started"
  | "verb.finished"
  | "policy.blocked"
  | "chat.verb_executed"
  | "error";

export type RobotEvent = {
  id: string;
  type: RobotEventType;
  ts: string;
  payload: unknown;
};
