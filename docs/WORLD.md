# World Building Guide

Creating rich environments is key to testing varied autonomous scenarios.

## 1. Room Definition
Rooms are defined by their `bounds` and a `RoomId`.
```typescript
rooms: {
  kitchen: {
    id: "kitchen",
    name: "Kitchen",
    bounds: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } }
  }
}
```

## 2. Entity Configuration
Entities should be configured with appropriate interaction flags:
- `pickable`: Can be lifted by `world.pick`.
- `container`: Can hold other entities (`contains: []`).
- `openable`: Must be opened before interaction or entry.
- `toggleable`: Has an `isOn` state.

## 3. Initializing the World
The `src/world/init.ts` file is the entry point for defining the simulation setup. When creating new entities, ensure coordinates fall within the defined room bounds.
