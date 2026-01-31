"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Play, Square, StepForward, Zap, Bot, RefreshCw } from "lucide-react";

interface PilotPanelProps {
  pilotName: string;
  useAI: boolean;
  onToggleAI: (value: boolean) => void;
  isRunning: boolean;
  lastRationale: string | null;
  onStep: () => void;
  onAutopilot: () => void;
  onStop: () => void;
  onReset: () => void;
  disabled?: boolean;
}

export function PilotPanel({
  pilotName,
  useAI,
  onToggleAI,
  isRunning,
  lastRationale,
  onStep,
  onAutopilot,
  onStop,
  onReset,
  disabled,
}: PilotPanelProps) {
  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            Pilot Control
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {pilotName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-toggle" className="text-xs text-muted-foreground">
            Use AI Pilot
          </Label>
          <Switch
            id="ai-toggle"
            checked={useAI}
            onCheckedChange={onToggleAI}
            disabled={isRunning || disabled}
          />
        </div>

        {/* Control Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onStep}
            disabled={isRunning || disabled}
            className="gap-1 bg-transparent"
          >
            <StepForward className="w-3 h-3" />
            Step
          </Button>
          <Button
            variant={isRunning ? "destructive" : "default"}
            size="sm"
            onClick={isRunning ? onStop : onAutopilot}
            disabled={disabled && !isRunning}
            className="gap-1"
          >
            {isRunning ? (
              <>
                <Square className="w-3 h-3" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Autopilot
              </>
            )}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={isRunning}
          className="w-full gap-1 text-muted-foreground"
        >
          <RefreshCw className="w-3 h-3" />
          Reset World
        </Button>

        {/* Last Rationale */}
        {lastRationale && (
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-[10px] text-muted-foreground mb-1">Last rationale:</p>
            <p className="text-xs">{lastRationale}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
