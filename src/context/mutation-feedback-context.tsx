import type { MutationFeedbackPhase } from "@/components/ui/mutation-feedback-overlay";
import { MutationFeedbackOverlay } from "@/components/ui/mutation-feedback-overlay";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SUCCESS_DWELL_MS = 1600;

export class MutationFeedbackBusyError extends Error {
  readonly name = "MutationFeedbackBusyError";
  constructor() {
    super("Another mutation is already in progress.");
  }
}

type RunOpts<TResult> = {
  successMessage: string | ((result: TResult) => string);
};

interface MutationFeedbackContextValue {
  run: <T>(fn: () => Promise<T>, opts: RunOpts<T>) => Promise<T>;
  phase: MutationFeedbackPhase;
}

const MutationFeedbackContext = createContext<MutationFeedbackContextValue | null>(null);

export function MutationFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<MutationFeedbackPhase>("idle");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (phase === "idle") return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.stopPropagation();
    };
    window.addEventListener("keydown", onEscape, true);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEscape, true);
    };
  }, [phase]);

  const run = useCallback(async <T,>(fn: () => Promise<T>, opts: RunOpts<T>): Promise<T> => {
    if (lockedRef.current) throw new MutationFeedbackBusyError();

    lockedRef.current = true;
    setPhase("loading");
    setSuccessMessage(null);

    try {
      const result = await fn();
      const message =
        typeof opts.successMessage === "function"
          ? opts.successMessage(result)
          : opts.successMessage;
      setSuccessMessage(message);
      setPhase("success");
      await new Promise<void>((resolve) => {
        setTimeout(resolve, SUCCESS_DWELL_MS);
      });
      return result;
    } catch (error) {
      setPhase("idle");
      setSuccessMessage(null);
      throw error;
    } finally {
      lockedRef.current = false;
      setPhase("idle");
      setSuccessMessage(null);
    }
  }, []);

  const value = useMemo(() => ({ run, phase }), [run, phase]);

  return (
    <MutationFeedbackContext.Provider value={value}>
      {children}
      <MutationFeedbackOverlay phase={phase} message={successMessage} />
    </MutationFeedbackContext.Provider>
  );
}

export function useMutationFeedback(): MutationFeedbackContextValue {
  const ctx = useContext(MutationFeedbackContext);
  if (!ctx) throw new Error("useMutationFeedback must be used within MutationFeedbackProvider");
  return ctx;
}
