// OpenVerb Robot Actions - Initial World State Generator
// Updated to match realistic floor plan layout
import type { WorldState, Entity, RoomId, RoomBounds } from "./model";

// Grid configuration - maps to 60x48 ft floor plan
const GRID_WIDTH = 32;
const GRID_HEIGHT = 24;

// Room definitions matching floor plan
const ROOMS: Record<RoomId, RoomBounds> = {
  kitchen: {
    id: "kitchen",
    name: "Kitchen",
    bounds: { min: { x: 4, y: 4 }, max: { x: 14, y: 11 } },
  },
  living: {
    id: "living",
    name: "Living Room",
    bounds: { min: { x: 15, y: 4 }, max: { x: 26, y: 11 } },
  },
  hallway: {
    id: "hallway",
    name: "Hallway",
    bounds: { min: { x: 4, y: 11 }, max: { x: 18, y: 18 } },
  },
  bedroom: {
    id: "bedroom",
    name: "Bedroom",
    bounds: { min: { x: 19, y: 11 }, max: { x: 22, y: 18 } },
  },
  porch: {
    id: "porch",
    name: "Bathroom",
    bounds: { min: { x: 23, y: 11 }, max: { x: 26, y: 18 } },
  },
  yard: {
    id: "yard",
    name: "Yard",
    bounds: { min: { x: 0, y: 0 }, max: { x: 31, y: 23 } },
  },
};

// Generate walls/blocked positions based on floor plan
function generateBlockedTiles(): { x: number; y: number }[] {
  const blocked: { x: number; y: number }[] = [];

  // Exterior walls - top
  for (let x = 4; x <= 26; x++) {
    if (x !== 10 && x !== 21) blocked.push({ x, y: 4 }); // windows at 10, 21
  }

  // Exterior walls - right
  for (let y = 4; y <= 18; y++) {
    if (y !== 7) blocked.push({ x: 26, y }); // window at 7
  }

  // Exterior walls - bottom
  for (let x = 4; x <= 26; x++) {
    if (x !== 16 && x !== 25) blocked.push({ x, y: 18 }); // doors at 16, 25
  }

  // Exterior walls - left
  for (let y = 4; y <= 18; y++) {
    if (y !== 14) blocked.push({ x: 4, y }); // window at 14
  }

  // Kitchen/Living partial wall
  for (let y = 4; y <= 9; y++) {
    blocked.push({ x: 14, y });
  }

  // Interior horizontal wall (rooms boundary)
  for (let x = 4; x <= 26; x++) {
    if (x !== 8) blocked.push({ x, y: 11 }); // opening at 8
  }

  // Bedroom wall
  for (let y = 11; y <= 18; y++) {
    if (y !== 15) blocked.push({ x: 19, y }); // door at 15
  }

  // Bathroom wall
  for (let y = 11; y <= 18; y++) {
    if (y !== 13) blocked.push({ x: 23, y }); // door at 13
  }

  return blocked;
}

// Initial entities positioned for the floor plan
function generateEntities(): Record<string, Entity> {
  const entities: Record<string, Entity> = {};

  // Kitchen entities
  entities["fridge_1"] = {
    id: "fridge_1",
    type: "fridge",
    name: "Refrigerator",
    pos: { x: 5, y: 5 },
    room: "kitchen",
    openable: true,
    isOpen: false,
    container: true,
    contains: [],
  };

  entities["faucet_kitchen"] = {
    id: "faucet_kitchen",
    type: "faucet",
    name: "Kitchen Sink",
    pos: { x: 7, y: 5 },
    room: "kitchen",
    toggleable: true,
    isOn: false,
  };

  entities["table_kitchen"] = {
    id: "table_kitchen",
    type: "table",
    name: "Kitchen Island",
    pos: { x: 10, y: 7 },
    room: "kitchen",
    container: true,
    contains: [],
  };

  entities["trash_bin_kitchen"] = {
    id: "trash_bin_kitchen",
    type: "trash_bin",
    name: "Kitchen Trash",
    pos: { x: 13, y: 5 },
    room: "kitchen",
    container: true,
    contains: [],
  };

  entities["light_kitchen"] = {
    id: "light_kitchen",
    type: "light",
    name: "Kitchen Light",
    pos: { x: 9, y: 8 },
    room: "kitchen",
    toggleable: true,
    isOn: true,
  };

  entities["dirty_spot_1"] = {
    id: "dirty_spot_1",
    type: "dirty_spot",
    name: "Spill on Floor",
    pos: { x: 11, y: 9 },
    room: "kitchen",
    isDirty: true,
  };

  entities["trash_1"] = {
    id: "trash_1",
    type: "trash",
    name: "Crumpled Paper",
    pos: { x: 6, y: 9 },
    room: "kitchen",
    pickable: true,
  };

  entities["trash_2"] = {
    id: "trash_2",
    type: "trash",
    name: "Empty Can",
    pos: { x: 12, y: 10 },
    room: "kitchen",
    pickable: true,
  };

  entities["dish_1"] = {
    id: "dish_1",
    type: "dish",
    name: "Dirty Plate",
    pos: { x: 8, y: 6 },
    room: "kitchen",
    pickable: true,
  };

  entities["cup_1"] = {
    id: "cup_1",
    type: "cup",
    name: "Coffee Mug",
    pos: { x: 10, y: 6 },
    room: "kitchen",
    pickable: true,
  };

  // Living room entities
  entities["shelf_living"] = {
    id: "shelf_living",
    type: "shelf",
    name: "Bookshelf",
    pos: { x: 25, y: 5 },
    room: "living",
    container: true,
    contains: [],
  };

  entities["table_living"] = {
    id: "table_living",
    type: "table",
    name: "Coffee Table",
    pos: { x: 20, y: 8 },
    room: "living",
    container: true,
    contains: [],
  };

  entities["light_living"] = {
    id: "light_living",
    type: "light",
    name: "Floor Lamp",
    pos: { x: 24, y: 9 },
    room: "living",
    toggleable: true,
    isOn: true,
  };

  entities["book_1"] = {
    id: "book_1",
    type: "book",
    name: "Novel",
    pos: { x: 17, y: 6 },
    room: "living",
    pickable: true,
  };

  entities["book_2"] = {
    id: "book_2",
    type: "book",
    name: "Magazine",
    pos: { x: 22, y: 10 },
    room: "living",
    pickable: true,
  };

  // Hallway entities
  entities["light_hallway"] = {
    id: "light_hallway",
    type: "light",
    name: "Hallway Light",
    pos: { x: 12, y: 14 },
    room: "hallway",
    toggleable: true,
    isOn: false,
  };

  entities["door_front"] = {
    id: "door_front",
    type: "door",
    name: "Front Door",
    pos: { x: 16, y: 18 },
    room: "hallway",
    openable: true,
    isOpen: false,
  };

  // Bedroom entities
  entities["door_bedroom"] = {
    id: "door_bedroom",
    type: "door",
    name: "Bedroom Door",
    pos: { x: 19, y: 15 },
    room: "bedroom",
    openable: true,
    isOpen: false,
  };

  entities["light_bedroom"] = {
    id: "light_bedroom",
    type: "light",
    name: "Bedroom Light",
    pos: { x: 21, y: 14 },
    room: "bedroom",
    toggleable: true,
    isOn: false,
  };

  // Bathroom entities
  entities["door_bathroom"] = {
    id: "door_bathroom",
    type: "door",
    name: "Bathroom Door",
    pos: { x: 23, y: 13 },
    room: "porch",
    openable: true,
    isOpen: false,
  };

  entities["faucet_bathroom"] = {
    id: "faucet_bathroom",
    type: "faucet",
    name: "Bathroom Faucet",
    pos: { x: 25, y: 13 },
    room: "porch",
    toggleable: true,
    isOn: false,
  };

  entities["light_bathroom"] = {
    id: "light_bathroom",
    type: "light",
    name: "Bathroom Light",
    pos: { x: 24, y: 15 },
    room: "porch",
    toggleable: true,
    isOn: false,
  };

  // Yard entities
  entities["trash_bin_yard"] = {
    id: "trash_bin_yard",
    type: "trash_bin",
    name: "Outdoor Bin",
    pos: { x: 2, y: 20 },
    room: "yard",
    container: true,
    contains: [],
  };

  entities["package_1"] = {
    id: "package_1",
    type: "package",
    name: "Delivery Box",
    pos: { x: 16, y: 21 },
    room: "yard",
    pickable: true,
  };

  entities["light_porch"] = {
    id: "light_porch",
    type: "light",
    name: "Porch Light",
    pos: { x: 14, y: 19 },
    room: "yard",
    toggleable: true,
    isOn: false,
  };

  return entities;
}

export function createInitialWorld(): WorldState {
  return {
    version: 1,
    grid: {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      blocked: generateBlockedTiles(),
    },
    rooms: ROOMS,
    robot: {
      id: "robot_1",
      pos: { x: 9, y: 9 },
      room: "kitchen",
      carrying: null,
      batteryPct: 100,
    },
    entities: generateEntities(),
    time: { hour: 14, minute: 0 },
    policy: {},
    pilot: { useAI: false, isRunning: false, taskId: null, goal: null },
  };
}

export function resetWorld(): WorldState {
  return createInitialWorld();
}
