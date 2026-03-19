import * as React from "react"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const variantClasses = {
      default: "bg-blue-600 text-white hover:bg-blue-700",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "border border-slate-300 bg-white hover:bg-slate-100",
      secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300",
      ghost: "hover:bg-slate-100",
      link: "text-blue-600 underline",
    }

    const sizeClasses = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded px-3 text-sm",
      lg: "h-11 rounded px-8",
      icon: "h-10 w-10",
    }

    return (
      <button
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${
          variantClasses[variant]
        } ${sizeClasses[size]} ${className || ""}`}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
