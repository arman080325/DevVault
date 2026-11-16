import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground border-border/80",
        subtle: "border-border/40 bg-muted/60 text-muted-foreground",
        github: "bg-zinc-800 text-zinc-100 border-zinc-700/60",
        youtube: "bg-red-500/10 text-red-400 border-red-500/20",
        instagram: "bg-pink-500/10 text-pink-400 border-pink-500/20",
        docs: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
        website: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        design: "bg-violet-500/10 text-violet-400 border-violet-500/20",
        tool: "bg-amber-500/10 text-amber-400 border-amber-500/20",
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
