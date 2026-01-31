"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Target } from "lucide-react";
import type { DemoTask } from "@/src/world/tasks";

interface GoalPanelProps {
  task: DemoTask | null;
  stepCount: number;
  runtimeMs: number;
  successStatus: {
    success: boolean;
    details: { criterion: unknown; met: boolean; reason?: string }[];
  } | null;
}

export function GoalPanel({ task, stepCount, runtimeMs, successStatus }: GoalPanelProps) {
  if (!task) {
    return (
      <Card className="bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" />
            No Task Selected
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Select a task from the list to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const stepsPercent = Math.min((stepCount / task.budget.maxSteps) * 100, 100);
  const timePercent = Math.min((runtimeMs / task.budget.maxRuntimeMs) * 100, 100);
  const remainingSteps = Math.max(task.budget.maxSteps - stepCount, 0);
  const remainingMs = Math.max(task.budget.maxRuntimeMs - runtimeMs, 0);

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {task.title}
          </CardTitle>
          {successStatus && (
            <Badge variant={successStatus.success ? "default" : "secondary"} className="gap-1">
              {successStatus.success ? (
                <>
                  <CheckCircle className="w-3 h-3" /> Complete
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3" /> In Progress
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{task.goal}</p>

        {/* Budgets */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Steps</span>
              <span>
                {stepCount} / {task.budget.maxSteps}
              </span>
            </div>
            <Progress
              value={stepsPercent}
              className="h-1.5"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Time</span>
              <span>
                {Math.round(runtimeMs / 1000)}s / {Math.round(task.budget.maxRuntimeMs / 1000)}s
              </span>
            </div>
            <Progress
              value={timePercent}
              className="h-1.5"
            />
          </div>
        </div>

        {/* Success criteria */}
        {successStatus && successStatus.details.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Success Criteria</p>
            <div className="space-y-1">
              {successStatus.details.map((detail, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {detail.met ? (
                    <CheckCircle className="w-3 h-3 text-primary shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                  )}
                  <span className={detail.met ? "text-primary" : "text-muted-foreground"}>
                    {detail.reason || "Criterion met"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
