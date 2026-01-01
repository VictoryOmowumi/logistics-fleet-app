import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SelectOption = { label: string; value: string };

interface LabeledSelectProps {
  label?: string;
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  onValueChange?: (value: string) => void;
  className?: string;
}

export function LabeledSelect({
  label,
  value,
  placeholder,
  options,
  onValueChange,
  className,
}: LabeledSelectProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </label>
      ) : null}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn(
            "h-10 rounded-[calc(var(--radius)+2px)] border-input bg-background/60",
            className
          )}
        >
          <SelectValue placeholder={placeholder || "Select"} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
