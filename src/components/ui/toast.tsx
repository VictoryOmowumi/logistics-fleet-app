import React from "react";
import { Card, CardContent } from "./card";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

interface ToastProps {
  message: string;
  tone?: ToastTone;
  onClose?: () => void;
}

export function Toast({ message, tone = "info", onClose }: ToastProps) {
  const toneStyles: Record<ToastTone, string> = {
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    error:
      "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    info: "border-border bg-muted/60 text-foreground",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className={cn("shadow-lg", toneStyles[tone])}>
        <CardContent className="flex items-start gap-3 py-3 text-sm">
          <span className="leading-5">{message}</span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="Close toast"
            >
              x
            </button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
