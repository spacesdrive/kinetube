import type * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-control border border-line-strong bg-app px-3 py-2.5 text-sm text-ink transition-quiet outline-none placeholder:text-ink-faint hover:border-ink-faint/60 focus-visible:border-focus disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error",
        className
      )}
      {...props} />
  );
}

export { Textarea }
