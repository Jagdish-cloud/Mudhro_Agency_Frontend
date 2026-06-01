import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        success:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600/30",
        warning:
          "bg-amber-500 text-amber-950 shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500/30",
        outline:
          "border border-zinc-500/60 bg-zinc-200/80 text-zinc-900 shadow-sm hover:bg-zinc-300/90 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
        secondary:
          "bg-zinc-600 text-white shadow-sm hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600",
        ghost: "text-foreground hover:bg-zinc-200/90 dark:hover:bg-zinc-800",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = Boolean(disabled || loading);

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    const content =
      loading && size === "icon" && loadingText == null ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
          {loadingText ?? children}
        </>
      ) : (
        children
      );

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {content}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
