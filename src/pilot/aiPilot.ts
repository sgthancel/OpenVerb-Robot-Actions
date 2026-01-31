// OpenVerb Town - AI Pilot using Vercel AI SDK
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Pilot, PilotInput, PilotOutput } from "./contract";

const PilotOutputSchema = z.union([
  z.object({
    type: z.literal("act"),
    verb: z.string(),
    args: z.record(z.unknown()),
    rationale: z.string().optional(),
  }),
  z.object({
    type: z.literal("done"),
    summary: z.string(),
  }),
  z.object({
    type: z.literal("ask_user"),
    question: z.string(),
  }),
]);

export function createAIPilot(model: string = "openai/gpt-4o-mini"): Pilot {
  return {
    name: `AI Pilot (${model})`,

    async plan(input: PilotInput): Promise<PilotOutput> {
      const systemPrompt = `You are an autonomous robot pilot in OpenVerb Town. Your job is to complete tasks by choosing the right verbs.

RULES:
- Always use world.observe or world.scan when uncertain about surroundings
- If blocked by policy, return ask_user
- Prefer safe actions; avoid loops; stop if budgets low
- If goal is met, return { type: "done", summary: "..." }
- Pick from the allowed verbs list only

AVAILABLE VERBS:
${input.allowedVerbs.map((v) => `- ${v.name}: ${v.description}`).join("\n")}

OBSERVATION FORMAT:
- robot.pos: current position {x, y}
- robot.room: current room name
- robot.carrying: entity ID if carrying something, null otherwise
- entities: list of nearby entities with id, type, name, pos, room, state

OUTPUT FORMAT (one of):
- { "type": "act", "verb": "world.verb_name", "args": {...}, "rationale": "why" }
- { "type": "done", "summary": "what was accomplished" }
- { "type": "ask_user", "question": "what to ask" }`;

      const userPrompt = `GOAL: ${input.goal}

OBSERVATION:
${JSON.stringify(input.observation, null, 2)}

POLICY:
- Mode: ${input.policySummary.mode}
${input.policySummary.pendingConfirmation ? `- BLOCKED: ${input.policySummary.pendingConfirmation.reason}` : ""}
${input.policySummary.budgets ? `- Budget: ${input.policySummary.budgets.remainingSteps} steps, ${Math.round(input.policySummary.budgets.remainingMs / 1000)}s remaining` : ""}

LAST ACTIONS:
${input.memory?.lastActions.slice(-5).map((a) => `- ${a.verb}: ${a.ok ? "OK" : `FAILED (${a.error})`}`).join("\n") || "None"}

What is your next action?`;

      try {
        const { object } = await generateObject({
          model: openai(model),
          system: systemPrompt,
          prompt: userPrompt,
          schema: PilotOutputSchema,
        });

        return object as PilotOutput;
      } catch (error) {
        console.error("[v0] AI Pilot error:", error);
        return {
          type: "ask_user",
          question: "I encountered an error. Please check the API configuration.",
        };
      }
    },
  };
}
