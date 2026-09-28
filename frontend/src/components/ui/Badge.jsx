import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-blue-600/20 text-blue-400 border-blue-500/30",
        secondary: "border-transparent bg-slate-800 text-slate-300 border-slate-700",
        destructive: "border-transparent bg-red-950/60 text-red-400 border-red-800/40",
        warning: "border-transparent bg-amber-950/60 text-amber-400 border-amber-800/40",
        success: "border-transparent bg-emerald-950/60 text-emerald-400 border-emerald-800/40",
        outline: "text-slate-300 border-slate-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };