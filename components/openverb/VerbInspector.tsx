"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RobotEvent } from "@/src/world/model";

interface VerbInspectorProps {
  event: RobotEvent | null;
  onClose: () => void;
}

export function VerbInspector({ event, onClose }: VerbInspectorProps) {
  if (!event) {
    return null;
  }

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            Event Inspector
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{event.type}</Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(event.ts).toLocaleTimeString()}
          </span>
        </div>

        <ScrollArea className="h-[200px]">
          <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
