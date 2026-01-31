"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, X, MapPin, Lightbulb, DoorOpen, Droplets } from "lucide-react";
import type { Entity } from "@/src/world/model";

interface EntityInspectorProps {
  entity: Entity | null;
  onClose: () => void;
}

export function EntityInspector({ entity, onClose }: EntityInspectorProps) {
  if (!entity) {
    return null;
  }

  return (
    <Card className="bg-card/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            {entity.name}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{entity.type}</Badge>
          <Badge variant="outline" className="gap-1">
            <MapPin className="w-3 h-3" />
            {entity.room}
          </Badge>
        </div>

        <div className="text-xs space-y-1">
          <p>
            <span className="text-muted-foreground">Position:</span> ({entity.pos.x}, {entity.pos.y})
          </p>
          <p>
            <span className="text-muted-foreground">ID:</span>{" "}
            <code className="bg-muted px-1 rounded">{entity.id}</code>
          </p>
        </div>

        {/* State indicators */}
        <div className="flex flex-wrap gap-2">
          {entity.pickable && <Badge variant="outline">Pickable</Badge>}
          {entity.container && (
            <Badge variant="outline">
              Container ({entity.contains?.length || 0} items)
            </Badge>
          )}
          {entity.openable && (
            <Badge variant={entity.isOpen ? "default" : "secondary"} className="gap-1">
              <DoorOpen className="w-3 h-3" />
              {entity.isOpen ? "Open" : "Closed"}
            </Badge>
          )}
          {entity.toggleable && (
            <Badge variant={entity.isOn ? "default" : "secondary"} className="gap-1">
              <Lightbulb className="w-3 h-3" />
              {entity.isOn ? "On" : "Off"}
            </Badge>
          )}
          {entity.isDirty && (
            <Badge variant="destructive" className="gap-1">
              <Droplets className="w-3 h-3" />
              Dirty
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
