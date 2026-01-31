"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Check, X } from "lucide-react";

interface PolicyBannerProps {
  pendingConfirmation: {
    id: string;
    reason: string;
    verb: string;
    args: unknown;
  } | null;
  onConfirm: (allow: boolean) => void;
}

export function PolicyBanner({ pendingConfirmation, onConfirm }: PolicyBannerProps) {
  if (!pendingConfirmation) {
    return null;
  }

  return (
    <Alert className="border-chart-4 bg-chart-4/10">
      <ShieldAlert className="h-4 w-4 text-chart-4" />
      <AlertTitle className="text-chart-4">Policy Confirmation Required</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-3">{pendingConfirmation.reason}</p>
        <p className="text-xs text-muted-foreground mb-3">
          Verb: <code className="bg-muted px-1 rounded">{pendingConfirmation.verb}</code>
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onConfirm(true)}
            className="gap-1"
          >
            <Check className="w-3 h-3" />
            Confirm
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onConfirm(false)}
            className="gap-1"
          >
            <X className="w-3 h-3" />
            Cancel
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
