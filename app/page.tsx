"use client";

import { useState, useEffect } from "react";
import { PropertyScene } from "@/components/openverb/PropertyScene";
import { TaskPicker } from "@/components/openverb/TaskPicker";
import { GoalPanel } from "@/components/openverb/GoalPanel";
import { PilotPanel } from "@/components/openverb/PilotPanel";
import { EventStream } from "@/components/openverb/EventStream";
import { PolicyBanner } from "@/components/openverb/PolicyBanner";
import { VerbInspector } from "@/components/openverb/VerbInspector";
import { EntityInspector } from "@/components/openverb/EntityInspector";
import { ChatPanel } from "@/components/openverb/ChatPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWorldState, useEvents, useTasks, useAutopilot } from "@/hooks/use-openverb";
import type { RobotEvent } from "@/src/world/model";
import { MessageSquare, ListTodo } from "lucide-react";

export default function OpenVerbRobotActions() {
  const {
    world,
    stepCount,
    runtimeMs,
    isMoving: worldIsMoving,
    isLoading: worldLoading,
    success: heartbeatSuccess,
    events: consolidatedEvents
  } = useWorldState();

  const { tasks, isLoading: tasksLoading } = useTasks();
  const {
    isRunning,
    useAI,
    setUseAI,
    lastRationale,
    currentTask,
    startTask,
    step,
    runAutopilot,
    stop,
    reset,
    confirmPolicy,
    robotPath,
    isRobotMoving,
    isRobotReaching,
    reachTargetId,
  } = useAutopilot(world, tasks);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<RobotEvent | null>(null);
  // Success status is now synchronized directly via the world state heartbeat
  const successStatus = heartbeatSuccess;

  // Get selected entity
  const selectedEntity = selectedEntityId && world ? world.entities[selectedEntityId] : null;

  // Handle task selection
  const handleSelectTask = async (taskId: string) => {
    setSelectedEntityId(null);
    setSelectedEvent(null);
    await startTask(taskId);
  };

  if ((worldLoading && !world) || (tasksLoading && tasks.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading OpenVerb Robot Actions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm flex-shrink-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">OV</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">OpenVerb Robot Actions</h1>
              <p className="text-xs text-muted-foreground">Robot Simulation Sandbox</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Steps: {stepCount}</span>
            <span>Time: {Math.round(runtimeMs / 1000)}s</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-4 py-6 h-full flex flex-col">
          {/* Policy Banner */}
          {world?.policy.pendingConfirmation && (
            <div className="mb-4 flex-shrink-0">
              <PolicyBanner
                pendingConfirmation={world.policy.pendingConfirmation}
                onConfirm={confirmPolicy}
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            {/* Left Sidebar - Tasks & Chat */}
            <div className="lg:col-span-3 flex flex-col min-h-0">
              <Tabs defaultValue="chat" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                  <TabsTrigger value="chat" className="text-xs gap-1">
                    <MessageSquare className="w-3 h-3" />
                    AI Chat
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="text-xs gap-1">
                    <ListTodo className="w-3 h-3" />
                    Tasks
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="flex-1 mt-2 min-h-0 flex flex-col overflow-hidden">
                  <ChatPanel />
                </TabsContent>
                <TabsContent value="tasks" className="flex-1 mt-2 min-h-0 flex flex-col overflow-y-auto">
                  <TaskPicker
                    tasks={tasks}
                    currentTaskId={currentTask?.id ?? null}
                    onSelectTask={handleSelectTask}
                    disabled={isRunning}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Center - World Map */}
            <div className="lg:col-span-6 space-y-4 overflow-y-auto">
              {world && (
                <PropertyScene
                  world={world}
                  selectedEntityId={selectedEntityId}
                  onSelectEntity={setSelectedEntityId}
                  robotPath={robotPath}
                  isRobotMoving={isRobotMoving || worldIsMoving}
                  isRobotReaching={isRobotReaching}
                  reachTargetId={reachTargetId}
                />
              )}

              {/* Entity Inspector */}
              {selectedEntity && (
                <EntityInspector
                  entity={selectedEntity}
                  onClose={() => setSelectedEntityId(null)}
                />
              )}

              {/* Verb Inspector */}
              {selectedEvent && (
                <VerbInspector
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                />
              )}
            </div>

            {/* Right Sidebar - Controls & Events */}
            <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 overflow-y-auto">
              <div className="flex-shrink-0">
                <GoalPanel
                  task={currentTask}
                  stepCount={stepCount}
                  runtimeMs={runtimeMs}
                  successStatus={successStatus}
                />
              </div>

              <div className="flex-shrink-0">
                <PilotPanel
                  pilotName={useAI ? "AI Pilot (GPT-4o-mini)" : "Heuristic Pilot"}
                  useAI={useAI}
                  onToggleAI={setUseAI}
                  isRunning={isRunning}
                  lastRationale={lastRationale}
                  onStep={step}
                  onAutopilot={runAutopilot}
                  onStop={stop}
                  onReset={reset}
                  disabled={!currentTask}
                />
              </div>

              <div>
                <EventStream
                  events={consolidatedEvents}
                  onSelectEvent={setSelectedEvent}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 flex-shrink-0">
        <div className="container mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          OpenVerb Robot Actions - Powered by OpenVerb Runtime
        </div>
      </footer>
    </div>
  );
}
