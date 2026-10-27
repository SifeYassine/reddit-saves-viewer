import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-full bg-secondary px-4 text-sm text-secondary-foreground outline-none ring-1 ring-inset ring-white/10 transition-colors duration-150 placeholder:text-muted-foreground hover:bg-accent focus-visible:bg-secondary focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40",
        className
      )}
      {...props} />
  );
}

export { Input }
