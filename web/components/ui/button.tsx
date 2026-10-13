import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.99]",
        outline:
          "border border-border bg-card hover:bg-muted text-foreground",
        secondary:
          "bg-muted text-foreground hover:bg-muted/80",
        ghost:
          "hover:bg-muted text-foreground",
        link:
          "text-muted-foreground hover:text-foreground underline-offset-4 hover:underline p-0 h-auto min-h-0 min-w-0 font-normal",
        burn:
          "bg-[#C62828] text-white hover:bg-[#B71C1C]",
      },
      size: {
        default: "min-h-[44px] px-4 py-2",
        sm: "min-h-[44px] px-3 py-1.5 text-xs",
        lg: "min-h-[48px] px-8 py-3 text-base",
        icon: "h-11 w-11 p-0 min-h-[44px] min-w-[44px]",
        link: "p-0 h-auto min-h-0 min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
