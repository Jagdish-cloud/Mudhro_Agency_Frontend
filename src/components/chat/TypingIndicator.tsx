import { cn } from "@/lib/utils";

export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-1 px-2 py-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
