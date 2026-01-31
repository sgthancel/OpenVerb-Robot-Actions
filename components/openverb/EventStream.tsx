"use client";

import React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Play,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Target,
  Eye,
  Bot,
  MessageSquare,
} from "lucide-react";
import type { RobotEvent, RobotEventType } from "@/src/world/model";

interface EventStreamProps {
  events: RobotEvent[];
  onSelectEvent?: (event: RobotEvent) => void;
}

const EVENT_ICONS: Record<RobotEventType, React.ReactNode> = {
  "goal.set": <Target className="w-3 h-3 text-primary" />,
  "observe.finished": <Eye className="w-3 h-3 text-accent" />,
  "pilot.act": <Bot className="w-3 h-3 text-chart-2" />,
  "pilot.done": <CheckCircle className="w-3 h-3 text-primary" />,
  "verb.started": <Play className="w-3 h-3 text-muted-foreground" />,
  "verb.finished": <CheckCircle className="w-3 h-3 text-primary" />,
  "policy.blocked": <AlertTriangle className="w-3 h-3 text-chart-4" />,
  "chat.verb_executed": <MessageSquare className="w-3 h-3 text-chart-5" />,
  error: <XCircle className="w-3 h-3 text-destructive" />,
};

const EVENT_COLORS: Record<RobotEventType, string> = {
  "goal.set": "bg-primary/10 text-primary",
  "observe.finished": "bg-accent/10 text-accent",
  "pilot.act": "bg-chart-2/10 text-chart-2",
  "pilot.done": "bg-primary/10 text-primary",
  "verb.started": "bg-muted text-muted-foreground",
  "verb.finished": "bg-primary/10 text-primary",
  "policy.blocked": "bg-chart-4/10 text-chart-4",
  "chat.verb_executed": "bg-chart-5/10 text-chart-5",
  error: "bg-destructive/10 text-destructive",
};

function getEventSummary(event: RobotEvent): string {
  const payload = event.payload as Record<string, any>;

  const formatArgs = (args: any) => {
    if (!args) return "";
    if (args.target) return `to {x: ${args.target.x}, y: ${args.target.y}}`;
    if (args.entityId) return `[${args.entityId}]`;
    if (args.targetId) return `[${args.targetId}]`;
    if (args.destination) {
      if (args.destination.targetId) return `to [${args.destination.targetId}]`;
      if (args.destination.x !== undefined) return `to {x: ${args.destination.x}, y: ${args.destination.y}}`;
    }
    return JSON.stringify(args);
  };

  switch (event.type) {
    case "goal.set":
      return (payload.goal as string) || "Goal set";
    case "pilot.act":
      return `${payload.chosen?.verb || "Unknown"} ${formatArgs(payload.chosen?.args)}`;
    case "pilot.done":
      return (payload.summary as string) || "Task complete";
    case "verb.started":
      return `Starting ${payload.verb} ${formatArgs(payload.args)}`;
    case "verb.finished":
      return `${payload.verb} ${formatArgs(payload.args)} ${payload.result?.ok ? "✓" : "✗"}${payload.result?.error ? `: ${payload.result.error.message}` : ""}`;
    case "policy.blocked":
      return `Blocked: ${payload.reason || "Policy rule"}`;
    case "chat.verb_executed":
      return `Chat: ${payload.verb} ${payload.result}`;
    case "error":
      return payload.message || "Error occurred";
    default:
      return event.type;
  }
}

export function EventStream({ events, onSelectEvent }: EventStreamProps) {
  const [filter, setFilter] = useState<RobotEventType | "all">("all");

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.type === filter);
  const reversedEvents = [...filteredEvents].reverse();

  // Group consecutive identical events
  const groupedEvents: (RobotEvent & { count: number })[] = [];
  reversedEvents.forEach((event) => {
    const summary = getEventSummary(event);
    const last = groupedEvents[groupedEvents.length - 1];

    if (last && last.type === event.type && getEventSummary(last) === summary) {
      last.count++;
      // Keep the most recent timestamp
      last.ts = event.ts;
    } else {
      groupedEvents.push({ ...event, count: 1 });
    }
  });

  const filterTypes: (RobotEventType | "all")[] = [
    "all",
    "pilot.act",
    "verb.finished",
    "policy.blocked",
    "error",
  ];

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Event Stream
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {events.length}
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* Filters */}
      <div className="px-4 pb-2 flex flex-wrap gap-1">
        {filterTypes.map((type) => (
          <Button
            key={type}
            variant={filter === type ? "default" : "ghost"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilter(type)}
          >
            {type === "all" ? "All" : type.split(".").pop()}
          </Button>
        ))}
      </div>

      <CardContent className="p-0">
        <div className="px-4 pb-4 space-y-1">
          {groupedEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No events yet. Start a task to see events.
            </p>
          ) : (
            groupedEvents.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-2 p-2 rounded-md cursor-pointer hover:bg-accent/30 transition-colors ${EVENT_COLORS[event.type] || ""}`}
                onClick={() => onSelectEvent?.(event)}
              >
                <div className="mt-0.5">{EVENT_ICONS[event.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono opacity-60">
                      {new Date(event.ts).toLocaleTimeString()}
                    </span>
                    <span className="text-[10px] font-medium truncate">
                      {event.type}
                      {event.count > 1 && (
                        <span className="ml-1 text-primary font-bold">
                          (x{event.count})
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-xs break-words">{getEventSummary(event)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
