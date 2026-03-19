import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "border-transparent bg-blue-600 text-white",
    secondary: "border-transparent bg-slate-200 text-slate-900",
    destructive: "border-transparent bg-red-600 text-white",
    outline: "border border-slate-300 text-slate-900",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        variantClasses[variant]
      } ${className || ""}`}
      {...props}
    />
  )
}

export { Badge }
