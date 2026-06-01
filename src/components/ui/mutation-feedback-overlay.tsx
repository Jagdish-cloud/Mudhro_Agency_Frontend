import { CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type MutationFeedbackPhase = "idle" | "loading" | "success";

export interface MutationFeedbackOverlayProps {
  phase: MutationFeedbackPhase;
  message?: string | null;
  className?: string;
}

/** Full-viewport feedback above dialogs (`z-[200]`). Parent controls pointer-events via phase. */
export function MutationFeedbackOverlay({ phase, message, className }: MutationFeedbackOverlayProps) {
  if (phase === "idle") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={phase === "loading"}
      aria-label={phase === "loading" ? "Saving" : "Success"}
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-black/55 px-6 backdrop-blur-sm",
        className,
      )}
    >
      {phase === "loading" ? (
        <Loader2
          aria-hidden
          className="h-[min(25vw,8rem)] w-[min(25vw,8rem)] shrink-0 animate-spin text-green-600 dark:text-green-400 sm:h-[min(22vw,9rem)] sm:w-[min(22vw,9rem)]"
        />
      ) : (
        <CheckCircle2
          aria-hidden
          strokeWidth={1.5}
          className="h-[min(20vw,6.5rem)] w-[min(20vw,6.5rem)] shrink-0 text-green-600 dark:text-green-400"
        />
      )}
      {(phase === "success" ? message : null) ? (
        <p className="max-w-xl text-center text-lg font-medium text-white sm:text-xl md:text-2xl">
          {message}
        </p>
      ) : phase === "loading" ? (
        <span className="sr-only">Please wait.</span>
      ) : null}
    </div>
  );
}
