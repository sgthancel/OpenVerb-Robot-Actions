// Chat API for OpenVerb Town
// Allows users to chat with AI to execute robot tasks

import {
  convertToModelMessages,
  streamText,
  tool,
  stepCountIs,
  UIMessage,
} from "ai";
import {
  getWorldState,
  setWorldState,
  getStepCount,
  getRuntimeMs,
  incrementStepCount,
  resetWorldState,
  resetStepCount,
  updatePilotSettings,
} from "@/src/store/worldStore";
import { executeVerb } from "@/src/openverb/runtime/executor";
import { clearEvents, createEvent } from "@/src/openverb/runtime/events";
import { resetRateLimits } from "@/src/openverb/runtime/policy";
import { buildObservation } from "@/src/world/observe";
import type { VerbName } from "@/src/world/model";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { TASKS } from "@/src/world/tasks";
import { getVerbSummary } from "@/src/openverb/registry";

export const maxDuration = 60;

// Tool definitions for OpenVerb actions
const executeVerbTool = tool({
  description: "Execute a robot verb/action in the simulation. Available verbs: world.move_to (move robot to coordinates), world.pick (pick up an object), world.place (place held object), world.toggle (toggle lights/switches), world.clean (clean dirty spots), world.observe (look around)",
  inputSchema: z.object({
    verb: z.enum([
      "world.move_to",
      "world.pick",
      "world.place",
      "world.toggle",
      "world.clean",
      "world.observe",
    ]).describe("The verb/action to execute"),
    args: z.record(z.unknown()).describe("Arguments for the verb. For move_to: {target: {x, y}}. For pick/place/toggle: {entityId: string}. For clean: {targetId: string}. For observe: {radius: number}"),
  }),
  execute: async ({ verb, args }) => {
    try {
      const world = getWorldState();

      // Handle observe verb specially (doesn't change state)
      if (verb === "world.observe") {
        const observation = buildObservation(world, args || {});
        return {
          success: true,
          message: `Observed ${observation.entities.length} entities nearby.`,
          observation,
        };
      }

      // Execute the verb directly
      const result = executeVerb(
        world,
        {
          verb: verb as VerbName,
          args: args || {},
        },
        {
          stepCount: getStepCount(),
          runtimeMs: getRuntimeMs(),
        }
      );

      incrementStepCount();
      setWorldState(result.world);

      // Create event for the chat action
      createEvent("chat.verb_executed", {
        verb,
        args,
        result: result.ok ? "success" : "failed",
        error: result.error?.message,
      });

      if (result.ok) {
        return { success: true, message: `Executed ${verb} successfully`, details: result.result };
      } else {
        return { success: false, message: result.error?.message || "Execution failed", blocked: result.blocked };
      }
    } catch (error) {
      return { success: false, message: `Error executing verb: ${error}` };
    }
  },
});

const startTaskTool = tool({
  description: "Start a predefined demo task. This resets the world and sets up the task goal.",
  inputSchema: z.object({
    taskId: z.string().describe("The task ID to start"),
  }),
  execute: async ({ taskId }) => {
    try {
      const task = TASKS.find((t) => t.id === taskId);
      if (!task) {
        return { success: false, message: `Task ${taskId} not found` };
      }

      // Update pilot settings (no longer resetting world to prevent teleporting)
      // Reset budget so mission can run
      resetStepCount();
      updatePilotSettings({
        taskId: task.id,
        isRunning: true,
        useAI: true,
        goal: task.goal
      });

      // Emit goal.set event
      createEvent("goal.set", {
        goal: task.goal,
        taskId: task.id,
      });

      return {
        success: true,
        message: `Started task: ${task.title}`,
        goal: task.goal,
        expectedVerbs: task.expectedVerbs,
      };
    } catch (error) {
      return { success: false, message: `Error starting task: ${error}` };
    }
  },
});

const getWorldStateTool = tool({
  description: "Get the current state of the world including robot position, entities, and their states",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const world = getWorldState();
      const stepCount = getStepCount();

      // Summarize the world state
      const entities = Object.values(world.entities);
      const summary = {
        robotPosition: world.robot.pos,
        robotRoom: world.robot.room,
        robotCarrying: world.robot.carrying,
        stepCount: stepCount,
        entityCount: entities.length,
        entities: entities.slice(0, 15).map((e) => ({
          name: e.name,
          type: e.type,
          pos: e.pos,
          state: {
            isOpen: e.isOpen,
            isOn: e.isOn,
            isDirty: e.isDirty,
          },
        })),
      };

      return { success: true, worldState: summary };
    } catch (error) {
      return { success: false, message: `Error getting world state: ${error}` };
    }
  },
});

const listTasksTool = tool({
  description: "List all available demo tasks that the user can ask to complete",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      success: true,
      tasks: TASKS.map((t) => ({
        id: t.id,
        title: t.title,
        goal: t.goal,
        expectedVerbs: t.expectedVerbs,
        maxSteps: t.budget.maxSteps,
      })),
    };
  },
});

const resetWorldTool = tool({
  description: "Reset the world to its initial state",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      resetWorldState();
      resetStepCount();
      clearEvents();
      resetRateLimits();
      return { success: true, message: "World has been reset to initial state" };
    } catch (error) {
      return { success: false, message: `Error resetting world: ${error}` };
    }
  },
});

const setPilotSettingsTool = tool({
  description: "Change autopilot settings, like switching between heuristic (algorithmic) and AI pilot modes.",
  inputSchema: z.object({
    useAI: z.boolean().describe("Whether to use the AI pilot (true) or heuristic pilot (false)"),
    goal: z.string().optional().describe("A specific goal for the pilot to achieve"),
  }),
  execute: async ({ useAI, goal }) => {
    updatePilotSettings({ useAI, goal: goal || null });
    return { success: true, message: `Pilot mode switched to ${useAI ? "AI" : "Heuristic"}${goal ? ` with goal: ${goal}` : ""}` };
  },
});

const triggerAutopilotTool = tool({
  description: "Start or stop the autopilot execution loop.",
  inputSchema: z.object({
    isRunning: z.boolean().describe("Whether to start (true) or stop (false) the autopilot"),
    goal: z.string().optional().describe("Establish a new goal while starting the autopilot"),
    useAI: z.boolean().optional().describe("Whether the pilot should use AI (true) or heuristic (false) logic"),
  }),
  execute: async ({ isRunning, goal, useAI }) => {
    // Reset budget if we are starting a new goal/mission
    if (isRunning) {
      resetStepCount();
    }

    updatePilotSettings({
      isRunning,
      goal: goal || undefined,
      ...(useAI !== undefined ? { useAI } : {})
    });
    return { success: true, message: `Autopilot ${isRunning ? "started" : "stopped"}${goal ? ` with goal: ${goal}` : ""}${useAI !== undefined ? ` using ${useAI ? "AI" : "Heuristic"} pilot` : ""}` };
  },
});

const tools = {
  executeVerb: executeVerbTool,
  startTask: startTaskTool,
  getWorldState: getWorldStateTool,
  listTasks: listTasksTool,
  resetWorld: resetWorldTool,
  setPilotSettings: setPilotSettingsTool,
  triggerAutopilot: triggerAutopilotTool,
};

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = `You are "OpenVerb AI", the mission controller. You are the robot's brain and strategist.

STRATEGIC EXECUTION:
1. **Mission Orchestration**: For any non-trivial user request, you MUST establish a clear MISSION.
   - Prefer 'startTask({taskId})' if a matching task exists in the system.
   - If no task exactly matches, use 'triggerAutopilot({isRunning: true, goal: "...", useAI: true})'.
   - **CRITICAL: NEVER call 'executeVerb' multiple times to walk the robot.** Once a mission is started, the autopilot takes over. Just inform the user you've initiated the robot's physical sequence.

2. **Available Mission Templates**:
${TASKS.map((t) => `- '${t.id}': ${t.goal}`).join("\n")}

3. **Robot Capabilities (OpenVerb Registry)**:
${getVerbSummary()}

4. **Physics & Timing**:
   - **Physical actions take time**. Don't assume the robot has arrived because you called a move tool.
   - You can carry one item and STILL perform other actions like toggling lights or scanning.

5. **Technical Error Translation**:
   - If a tool returns 'TOO_FAR', 'HANDS_FULL', or 'NO_PATH', do NOT show it to the user.
   - 'TOO_FAR' means the robot is still in transit. Don't panic; just tell the user the robot is moving closer.

Think as a high-level strategist using the OpenVerb protocol. Your job is to trigger the right systems, not to push individual buttons.`;

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages as UIMessage[]),
    tools,
    stopWhen: stepCountIs(15),
  });

  return result.toUIMessageStreamResponse();
}
