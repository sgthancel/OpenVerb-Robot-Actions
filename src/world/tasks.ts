// OpenVerb Town - Demo Tasks
// Goal-based tasks with success criteria

export type SuccessCriteria =
  | { type: "entity_on_target"; entityType: string; targetId: string }
  | { type: "all_of_type_in_container"; entityType: string; containerType: string }
  | { type: "all_lights_state"; state: boolean }
  | { type: "entity_state"; entityType: string; state: { isDirty?: boolean; isOn?: boolean; isOpen?: boolean } }
  | { type: "report_only"; note: string };

export type DemoTask = {
  id: string;
  title: string;
  goal: string;
  expectedVerbs: string[]; // Verbs typically needed to complete this task
  success: SuccessCriteria[];
  budget: { maxSteps: number; maxRuntimeMs: number };
};

export const TASKS: DemoTask[] = [
  {
    id: "trash_kitchen",
    title: "Clean Kitchen Trash",
    goal: "Pick up all trash in the kitchen and throw it away.",
    expectedVerbs: ["world.move_to", "world.pick", "world.place"],
    success: [{ type: "all_of_type_in_container", entityType: "trash", containerType: "trash_bin" }],
    budget: { maxSteps: 140, maxRuntimeMs: 60_000 },
  },
  {
    id: "bring_package",
    title: "Retrieve Package",
    goal: "Bring the package from the porch to the kitchen table.",
    expectedVerbs: ["world.move_to", "world.pick", "world.place"],
    success: [{ type: "entity_on_target", entityType: "package", targetId: "table_kitchen" }],
    budget: { maxSteps: 120, maxRuntimeMs: 60_000 },
  },
  {
    id: "lights_off",
    title: "Lights Out",
    goal: "Turn off all the lights in the house.",
    expectedVerbs: ["world.move_to", "world.toggle"],
    success: [{ type: "all_lights_state", state: false }],
    budget: { maxSteps: 80, maxRuntimeMs: 45_000 },
  },
  {
    id: "clean_spot",
    title: "Clean Dirty Spot",
    goal: "Clean the dirty spot near the sink.",
    expectedVerbs: ["world.move_to", "world.clean"],
    success: [{ type: "entity_state", entityType: "dirty_spot", state: { isDirty: false } }],
    budget: { maxSteps: 90, maxRuntimeMs: 45_000 },
  },
  {
    id: "set_table",
    title: "Set the Table",
    goal: "Place a dish and a cup on the kitchen table.",
    expectedVerbs: ["world.move_to", "world.pick", "world.place"],
    success: [
      { type: "entity_on_target", entityType: "dish", targetId: "table_kitchen" },
      { type: "entity_on_target", entityType: "cup", targetId: "table_kitchen" },
    ],
    budget: { maxSteps: 160, maxRuntimeMs: 70_000 },
  },
  {
    id: "organize_books",
    title: "Organize Living Room",
    goal: "Put all books onto the shelf in the living room.",
    expectedVerbs: ["world.move_to", "world.pick", "world.place"],
    success: [{ type: "all_of_type_in_container", entityType: "book", containerType: "shelf" }],
    budget: { maxSteps: 180, maxRuntimeMs: 75_000 },
  },
  {
    id: "secure_night",
    title: "Night Routine",
    goal: "After 8pm, close doors and turn on the porch light.",
    expectedVerbs: ["world.move_to", "world.toggle", "world.close"],
    success: [
      { type: "entity_state", entityType: "door", state: { isOpen: false } },
      { type: "entity_state", entityType: "light", state: { isOn: true } },
    ],
    budget: { maxSteps: 160, maxRuntimeMs: 75_000 },
  },
  {
    id: "react_spill",
    title: "Reactive Cleaning",
    goal: "If you see a spill, clean it.",
    expectedVerbs: ["world.observe", "world.move_to", "world.clean"],
    success: [{ type: "entity_state", entityType: "dirty_spot", state: { isDirty: false } }],
    budget: { maxSteps: 200, maxRuntimeMs: 90_000 },
  },
  {
    id: "report_mess",
    title: "Scan & Report",
    goal: "Scan the house and report what's out of place.",
    expectedVerbs: ["world.move_to", "world.observe", "pilot.done"],
    success: [{ type: "report_only", note: "Pilot must produce a report in done.summary" }],
    budget: { maxSteps: 40, maxRuntimeMs: 30_000 },
  },
  {
    id: "bedroom_block",
    title: "Policy Block Demo",
    goal: "Go into the bedroom and look around.",
    expectedVerbs: ["world.move_to", "world.observe"],
    success: [{ type: "report_only", note: "Should trigger policy confirmation before entering bedroom" }],
    budget: { maxSteps: 60, maxRuntimeMs: 30_000 },
  },
];
