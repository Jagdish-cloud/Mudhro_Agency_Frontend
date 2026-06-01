import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const sizeClass = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: keyof typeof sizeClass;
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("animate-spin text-muted-foreground", sizeClass[size], className)}
      {...props}
    />
  );
}
