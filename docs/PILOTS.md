# Pilot Development Guide

A **Pilot** is the "brain" of the robot. It receives an `Observation` and returns a `Decision`.

## 1. Pilot Interface

Every pilot must implement the `plan` method:

```typescript
export interface Pilot {
  name: string;
  plan(input: PilotInput): Promise<PilotOutput>;
}
```

### Input: `PilotInput`
- `goal`: The natural language objective.
- `observation`: The filtered world view (only visible items).
- `policySummary`: Current status of rule checks.

### Output: `PilotOutput`
- `type: "act"`: Execute a specific `world.verb`.
- `type: "ask_user"`: Request clarification or permission.
- `type: "done"`: Signal the task is complete with a summary.

## 2. Implementing Heuristics

Heuristic pilots are best for deterministic, low-latency behaviors. Use `findNearestEntity` and `getDistance` helpers to make decisions based on proximity.

## 3. Implementing AI Pilots

AI Pilots should use **ReAct (Reason + Act)** patterns. 
1.  Provide the LLM with the `getVerbSummary()` output.
2.  Pass the `observation` as a JSON block.
3.  Instruct the LLM to output a `rationale` followed by a structured JSON decision.
