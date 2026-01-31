# OpenVerb Specification v1.0

This document outlines the technical specifications of the OpenVerb framework as implemented in OpenVerb Town.

## 1. Core Concepts

### 1.1 The World State
State is the single source of truth. It is a plain JSON object containing:
- `robot`: Position, orientation, carrying status, and movement interpolation state.
- `entities`: A flat map of unique IDs to Entity objects.
- `rooms`: Spatial bounds and metadata for labeled areas.
- `policy`: Current state of safety gates and pending confirmations.

### 1.2 Verbs
A **Verb** is a named capability with a formal schema.
```typescript
interface VerbDefinition {
  name: string;
  category: "navigation" | "interaction" | "perception";
  description: string;
  params: Record<string, VerbParam>;
}
```

## 2. Execution Pipeline

When a Pilot chooses a verb, the following steps occur:

1.  **Validation**: Ensures the parameters match the schema and the robot is in a state to perform the action (e.g., must be carrying item to `place`).
2.  **Policy Guard**: The request is passed through the Policy Engine. If the action violates a "Caution" rule, it is paused for human confirmation.
3.  **Application**: The `worldEngine` calculates the next state (deterministic).
4.  **Event Emission**: A `RobotEvent` is emitted (e.g., `verb.started`, `verb.finished`).
5.  **Synchronization**: The new state is broadcast to the UI and Pilot.

## 3. Containment & Visibility

OpenVerb uses a `parentId` system to handle nested objects:
- When Entity A is placed in Container B, A's `parentId` is set to B's ID.
- The `buildObservation` logic filters out any entity with a `parentId`.
- Pilots must interact with containers (e.g., `open fridge`) to "see" inside.

## 4. Smart Navigation

The `world.move_to` verb implements "Smart Reach":
- If the target coordinate is occupied by a solid entity (non-pickable), the pathfinder calculates the nearest adjacent reachable tile.
- This allows agents to "move to the trash bin" without trying to occupy the same space.
