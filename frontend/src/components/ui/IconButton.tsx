import { forwardRef } from "react";

export const IconButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, ...props }, ref) => (
  <button
    ref={ref}
    {...props}
    className="flex items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-70 text-body"
  >
    {children}
  </button>
));

IconButton.displayName = "IconButton";
