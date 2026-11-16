import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-border/60 bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "text-foreground border-border/80",
        subtle: "border-border/40 bg-muted/50 text-muted-foreground",
        neutral: "border-border/60 bg-card text-foreground/90",
        github: "border-border/70 bg-card text-foreground/80",
        youtube: "border-rose-900/30 bg-rose-950/20 text-rose-300",
        instagram: "border-purple-900/30 bg-purple-950/20 text-purple-300",
        docs: "border-emerald-900/30 bg-emerald-950/20 text-emerald-300",
        website: "border-stone-800/40 bg-stone-900/30 text-stone-300",
        design: "border-indigo-900/30 bg-indigo-950/20 text-indigo-300",
        tool: "border-amber-900/30 bg-amber-950/20 text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
