"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Code } from "lucide-react";
import type { DemoTask } from "@/src/world/tasks";

interface TaskPickerProps {
  tasks: DemoTask[];
  currentTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  disabled?: boolean;
}

export function TaskPicker({ tasks, currentTaskId, onSelectTask, disabled }: TaskPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Demo Tasks</h3>
      <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-2">
        {tasks.map((task) => {
          const isSelected = currentTaskId === task.id;
          return (
            <Card
              key={task.id}
              className={`cursor-pointer transition-all hover:bg-accent/50 ${
                isSelected ? "ring-2 ring-primary bg-accent/30" : ""
              }`}
              onClick={() => !disabled && onSelectTask(task.id)}
            >
              <CardHeader className="p-3 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? "rotate-90" : ""}`} />
                    <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                  </div>
                  <Badge
                    variant={
                      task.budget.maxSteps <= 80
                        ? "default"
                        : task.budget.maxSteps <= 140
                          ? "secondary"
                          : "outline"
                    }
                    className="text-[10px]"
                  >
                    {task.budget.maxSteps} steps
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <CardDescription className="text-xs">{task.goal}</CardDescription>
                
                {/* Expected Verbs - always visible but expanded when selected */}
                <div className={`space-y-1 ${isSelected ? "" : "opacity-60"}`}>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Code className="w-3 h-3" />
                    <span>Expected Verbs:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {task.expectedVerbs.map((verb) => (
                      <Badge 
                        key={verb} 
                        variant="outline" 
                        className="text-[9px] px-1.5 py-0 font-mono"
                      >
                        {verb}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
