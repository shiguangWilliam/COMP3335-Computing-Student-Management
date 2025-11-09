import React from "react";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`w-full rounded border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 ${className}`}
      {...props}
    />
  )
);

Input.displayName = "Input";

export default Input;