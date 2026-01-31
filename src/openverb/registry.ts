import { loadLibrary } from "openverb";

export const worldRegistry = loadLibrary({
    namespace: "world",
    version: "1.0.0",
    description: "Advanced Robot Simulation World",
    verbs: [
        {
            name: "move_to",
            category: "navigation",
            description: "Move the robot to specific coordinates using pathfinding.",
            params: {
                x: { type: "number", description: "Target X coordinate", required: true },
                y: { type: "number", description: "Target Y coordinate", required: true },
            },
        },
        {
            name: "pick",
            category: "interaction",
            description: "Pick up a pickable entity that is within range (distance < 2).",
            params: {
                entityId: { type: "string", description: "The unique ID of the entity to pick up", required: true },
            },
        },
        {
            name: "place",
            category: "interaction",
            description: "Place a carried entity onto a target container or specific coordinates.",
            params: {
                entityId: { type: "string", description: "The unique ID of the carried entity", required: true },
                targetId: { type: "string", description: "The unique ID of the target container", required: false },
                x: { type: "number", description: "Target X coordinate (if not using targetId)", required: false },
                y: { type: "number", description: "Target Y coordinate (if not using targetId)", required: false },
            },
        },
        {
            name: "toggle",
            category: "interaction",
            description: "Toggle a toggleable entity (like a light) ON or OFF.",
            params: {
                entityId: { type: "string", description: "The unique ID of the entity (e.g. light_kitchen)", required: true },
                state: { type: "boolean", description: "True for ON, False for OFF", required: true },
            },
        },
        {
            name: "clean",
            category: "interaction",
            description: "Clean a dirty spot or entity within range.",
            params: {
                targetId: { type: "string", description: "The unique ID of the dirty object/spot", required: true },
            },
        },
        {
            name: "observe",
            category: "perception",
            description: "Scan the surroundings to find entities and their properties.",
            params: {
                radius: { type: "number", description: "Radius to scan (default 8)", required: false },
            },
        },
        {
            name: "open",
            category: "interaction",
            description: "Open an openable entity (like a door or cabinet).",
            params: {
                entityId: { type: "string", description: "The unique ID of the entity", required: true },
            },
        },
        {
            name: "close",
            category: "interaction",
            description: "Close an openable entity.",
            params: {
                entityId: { type: "string", description: "The unique ID of the entity", required: true },
            },
        },
    ],
});

// Helper for AI Prompt generation
export function getVerbSummary(): string {
    return worldRegistry.verbs
        .map((v) => `- world.${v.name}: ${v.description}`)
        .join("\n");
}
