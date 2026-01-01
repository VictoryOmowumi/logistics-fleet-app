import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  hint?: string
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, hint, wrapperClassName, ...props }, ref) => {
    const inputClasses = cn(
      "flex h-10 w-full rounded-[calc(var(--radius)+2px)] border border-input bg-background/60 px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className
    )

    if (!label && !hint) {
      return (
        <input
          type={type}
          className={inputClasses}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <div className={cn("space-y-1.5", wrapperClassName)}>
        {label ? (
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </label>
        ) : null}
        <input type={type} className={inputClasses} ref={ref} {...props} />
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
