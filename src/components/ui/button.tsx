import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-tight transition-all duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-2 aria-invalid:ring-destructive/40 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-primary to-[oklch(0.78_0.16_168)] text-primary-foreground shadow-[0_1px_0_0_oklch(1_0_0/0.25)_inset,0_8px_24px_-12px_oklch(0.84_0.165_168/0.6)] hover:from-[oklch(0.88_0.165_168)] hover:to-[oklch(0.82_0.16_168)] hover:-translate-y-[1px] active:translate-y-0 active:shadow-[0_1px_0_0_oklch(1_0_0/0.2)_inset,0_2px_8px_-4px_oklch(0.84_0.165_168/0.5)]",
        destructive:
          "bg-gradient-to-b from-[oklch(0.74_0.21_22)] to-[oklch(0.66_0.21_22)] text-white hover:from-[oklch(0.78_0.21_22)] hover:to-[oklch(0.70_0.21_22)] focus-visible:ring-destructive/50 shadow-[0_1px_0_0_oklch(1_0_0/0.2)_inset,0_8px_20px_-10px_oklch(0.74_0.21_22/0.6)]",
        outline:
          "border border-border bg-surface/40 text-foreground backdrop-blur-sm hover:bg-surface hover:border-border-strong hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[oklch(0.275_0.018_250)]",
        ghost:
          "text-muted-foreground hover:bg-surface/70 hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
