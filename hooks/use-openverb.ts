"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR, { mutate } from "swr";
import type { WorldState, RobotEvent, VerbName } from "@/src/world/model";
import type { DemoTask } from "@/src/world/tasks";
import type { PilotOutput } from "@/src/pilot/contract";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// World state hook - polls frequently during movement for smooth animation
export function useWorldState() {
  const [isMoving, setIsMoving] = useState(false);

  const { data, error, isLoading } = useSWR<{
    world: WorldState;
    stepCount: number;
    runtimeMs: number;
    isMoving: boolean;
    events: RobotEvent[];
    success: any;
  }>("/api/world/state", fetcher, {
    // Poll faster during movement for smooth animation
    // Otherwise poll every 1s to reduce log noise
    refreshInterval: isMoving ? 100 : 1000,
    onSuccess: (newData) => {
      setIsMoving(newData?.isMoving ?? false);
    },
  });

  return {
    world: data?.world ?? null,
    stepCount: data?.stepCount ?? 0,
    runtimeMs: data?.runtimeMs ?? 0,
    isMoving: data?.isMoving ?? false,
    events: data?.events ?? [],
    success: data?.success ?? null,
    isLoading,
    error,
  };
}

// Events hook - now just a thin wrapper around useWorldState for backward compatibility
// but without its own polling to reduce log noise
export function useEvents() {
  const { events, isLoading, error } = useWorldState();

  return {
    events,
    isLoading,
    error,
    refresh: () => mutate("/api/world/state"),
  };
}

// Tasks hook
export function useTasks() {
  const { data, error, isLoading } = useSWR<{ tasks: DemoTask[] }>(
    "/api/tasks/list",
    fetcher
  );

  return {
    tasks: data?.tasks ?? [],
    isLoading,
    error,
  };
}

// Autopilot hook
export function useAutopilot(world: WorldState | null, tasks: DemoTask[] = []) {
  const [isRunning, setIsRunning] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [lastRationale, setLastRationale] = useState<string | null>(null);
  const [currentTask, setCurrentTask] = useState<DemoTask | null>(null);
  const [robotPath, setRobotPath] = useState<[number, number][]>([]);
  const [isRobotMoving, setIsRobotMoving] = useState(false);
  const [isRobotReaching, setIsRobotReaching] = useState(false);
  const [reachTargetId, setReachTargetId] = useState<string | null>(null);
  const stopRef = useRef(false);
  const isRunningRef = useRef(false);
  const worldRef = useRef<WorldState | null>(world);

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  // Update pilot settings on server
  const updateSettings = useCallback(async (settings: Partial<{ useAI: boolean; isRunning: boolean; taskId: string | null }>) => {
    const res = await fetch("/api/pilot/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (data.ok) {
      mutate("/api/world/state");
    }
    return data;
  }, []);

  // Sync state with world state when it changes
  useEffect(() => {
    if (world?.pilot) {
      setUseAI(world.pilot.useAI);

      // Sync current task if it changed on server
      if (world.pilot.taskId && (!currentTask || currentTask.id !== world.pilot.taskId)) {
        const serverTask = tasks.find(t => t.id === world.pilot.taskId);
        if (serverTask) {
          setCurrentTask(serverTask);
        }
      } else if (!world.pilot.taskId && currentTask) {
        setCurrentTask(null);
      }

      // Update local rationale if server has a goal but we don't have a task
      if (world.pilot.goal && !currentTask && !lastRationale) {
        setLastRationale(`Autonomous Goal: ${world.pilot.goal}`);
      }
    }
  }, [world?.pilot, tasks, currentTask]);

  // Update onToggleAI to sync with server
  const toggleAI = useCallback(async (value: boolean) => {
    setUseAI(value);
    await updateSettings({ useAI: value });
  }, [updateSettings]);

  // Start a task
  const startTask = useCallback(async (taskId: string) => {
    const res = await fetch("/api/tasks/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    const data = await res.json();
    if (data.ok) {
      setCurrentTask(data.task);
      setLastRationale(null);
      mutate("/api/world/state");
      mutate("/api/events/list?limit=50");
      // Explicitly trigger the loop
      runAutopilot();
    }
    return data;
  }, []);

  // Execute a single step
  const step = useCallback(async () => {
    const activeGoal = currentTask?.goal || worldRef.current?.pilot?.goal;
    if (!activeGoal) return null;

    // First observe
    const observeRes = await fetch("/api/verbs/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verb: "world.observe", args: { radius: 15 } }),
    });
    const observeData = await observeRes.json();

    // Get pilot's next action
    const pilotRes = await fetch("/api/pilot/next", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: activeGoal,
        observation: observeData.observation,
        useAI,
      }),
    });
    const pilotData = await pilotRes.json();

    if (!pilotData.ok) {
      return { done: true, error: pilotData.error };
    }

    const output: PilotOutput = pilotData.output;

    if (output.type === "done") {
      setLastRationale(`Done: ${output.summary}`);
      return { done: true, summary: output.summary };
    }

    if (output.type === "ask_user") {
      setLastRationale(`Asking: ${output.question}`);
      return { done: false, needsInput: true, question: output.question };
    }

    if (output.type === "act") {
      setLastRationale(output.rationale || `Executing ${output.verb}`);

      // Execute the chosen verb
      const verbRes = await fetch("/api/verbs/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verb: output.verb, args: output.args }),
      });
      const verbData = await verbRes.json();

      // Store path for visualization
      if (verbData.path) {
        setRobotPath(verbData.path);
        setIsRobotMoving(true);
      }

      // Track reaching animation for grab/drop/toggle
      if (output.verb === "world.pick" || output.verb === "world.place" || output.verb === "world.toggle") {
        setIsRobotReaching(true);
        setReachTargetId((output.args?.entityId as string) || (output.args?.targetId as string) || null);
      }

      // Wait for movement to complete if this was a move action
      if (verbData.isMoving && verbData.estimatedDurationMs) {
        // Poll until movement complete
        const startWait = Date.now();
        const maxWait = verbData.estimatedDurationMs + 2000; // Add buffer

        while (Date.now() - startWait < maxWait) {
          if (stopRef.current) break; // Allow immediate interruption
          await new Promise((r) => setTimeout(r, 100));
          mutate("/api/world/state");

          // Check if movement is complete
          const checkRes = await fetch("/api/world/state");
          const checkData = await checkRes.json();
          if (!checkData.isMoving) {
            break;
          }
        }
      } else {
        // Non-movement action - brief animation delay
        await new Promise((r) => setTimeout(r, 400));
      }

      setIsRobotMoving(false);
      setIsRobotReaching(false);
      setReachTargetId(null);

      mutate("/api/world/state");
      mutate("/api/events/list?limit=50");

      if (verbData.blocked?.requiresConfirmation) {
        return { done: false, blocked: true, reason: verbData.blocked.reason };
      }

      return { done: false, ok: verbData.ok };
    }

    return { done: false };
  }, [currentTask, useAI]);

  // Run autopilot loop
  const runAutopilot = useCallback(async (isServerTriggered = false) => {
    const activeGoal = currentTask?.goal || worldRef.current?.pilot?.goal;
    if (!activeGoal || isRunningRef.current) return;

    setIsRunning(true);
    isRunningRef.current = true;
    stopRef.current = false;

    if (!isServerTriggered) {
      await updateSettings({ isRunning: true });
    }

    let iterations = 0;
    let consecutiveFailures = 0;
    const maxIterations = currentTask?.budget?.maxSteps || 100;

    while (!stopRef.current && iterations < maxIterations) {
      if (consecutiveFailures >= 3) {
        setLastRationale("Autopilot stopped: too many consecutive failures.");
        break;
      }

      // Check if server-side isRunning was toggled off
      const worldRes = await fetch("/api/world/state");
      const worldData = await worldRes.json();
      if (!worldData.world?.pilot?.isRunning) {
        break;
      }

      const result = await step();

      if (result?.done || result?.blocked || result?.needsInput) {
        break;
      }

      if (result?.ok === false || result?.error) {
        consecutiveFailures++;
      } else {
        consecutiveFailures = 0;
      }

      // Small delay between steps
      await new Promise((r) => setTimeout(r, 300));
      iterations++;
    }

    setIsRunning(false);
    isRunningRef.current = false;
    await updateSettings({ isRunning: false });
  }, [currentTask, step, updateSettings]);

  // Sync execution loop with server state
  useEffect(() => {
    const hasActiveTaskOrGoal = currentTask || world?.pilot?.goal;
    if (world?.pilot?.isRunning && !isRunningRef.current && hasActiveTaskOrGoal) {
      runAutopilot(true);
    } else if (world?.pilot && !world.pilot.isRunning && isRunningRef.current) {
      stopRef.current = true;
    }
  }, [world?.pilot?.isRunning, world?.pilot?.goal, currentTask, runAutopilot]);

  // Stop autopilot
  const stop = useCallback(async () => {
    stopRef.current = true;
    setIsRunning(false);
    isRunningRef.current = false;
    await updateSettings({ isRunning: false });
  }, [updateSettings]);

  // Reset world
  const reset = useCallback(async () => {
    stop();
    await fetch("/api/world/reset", { method: "POST" });
    setCurrentTask(null);
    setLastRationale(null);
    mutate("/api/world/state");
    mutate("/api/events/list?limit=50");
  }, [stop]);

  // Confirm policy gate
  const confirmPolicy = useCallback(async (allow: boolean) => {
    await fetch("/api/world/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allow }),
    });
    mutate("/api/world/state");
    mutate("/api/events/list?limit=50");
  }, []);

  // Check success
  const checkSuccess = useCallback(async () => {
    if (!currentTask) return null;

    const res = await fetch("/api/tasks/success", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: currentTask.id }),
    });
    return res.json();
  }, [currentTask]);

  return {
    isRunning,
    useAI,
    setUseAI: toggleAI,
    lastRationale,
    currentTask,
    startTask,
    step,
    runAutopilot,
    stop,
    reset,
    confirmPolicy,
    checkSuccess,
    robotPath,
    isRobotMoving,
    isRobotReaching,
    reachTargetId,
  };
}
