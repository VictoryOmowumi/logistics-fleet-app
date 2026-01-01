import * as React from "react";
import { cn } from "@/lib/utils";

type SelectOption = { label: string; value: string };

interface FormSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  hint?: string;
  options: SelectOption[];
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

export function FormSelect({
  className,
  label,
  hint,
  options,
  ...props
}: FormSelectProps) {
  return (
    <div className="space-y-1.5">
      {label ? (
        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </label>
      ) : null}
      <select
        className={cn(
          "h-10 w-full rounded-[calc(var(--radius)+2px)] border border-input bg-background/60 px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
