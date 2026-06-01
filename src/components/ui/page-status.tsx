import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface PageLoadingProps {
  label?: string;
  className?: string;
}

/**
 * Centered full-width loading state for list/detail pages.
 */
export function PageLoading({ label = "Loading…", className }: PageLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-[12rem] flex-col items-center justify-center gap-3 py-12 animate-in fade-in duration-300",
        className,
      )}
    >
      <Spinner size="lg" className="text-primary" />
      {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
    </div>
  );
}
