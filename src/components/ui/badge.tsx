import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        success: "border-transparent bg-status-clean-bg text-status-clean",
        warning: "border-transparent bg-status-due-soon-bg text-status-due-soon",
        danger: "border-transparent bg-status-overdue-bg text-status-overdue",
        info: "border-transparent bg-status-cleaning-bg text-status-cleaning",
        neutral: "border-transparent bg-status-unavailable-bg text-status-unavailable",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
