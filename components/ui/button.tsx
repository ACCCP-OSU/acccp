import * as React from "react"

const buttonVariants = (
  variant: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link" = "default",
  size: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg" = "default"
) => {
  const base = "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50"

  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    outline: "border-border bg-background hover:bg-muted hover:text-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-muted hover:text-foreground",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    link: "text-primary underline-offset-4 hover:underline",
  }

  const sizes: Record<string, string> = {
    default: "h-8 gap-1.5 px-3",
    xs: "h-6 gap-1 px-2.5 text-xs",
    sm: "h-7 gap-1 px-3",
    lg: "h-9 gap-1.5 px-4",
    icon: "size-8",
    "icon-xs": "size-6",
    "icon-sm": "size-7",
    "icon-lg": "size-9",
  }

  return `${base} ${variants[variant]} ${sizes[size]}`
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
}) {
  return <button className={[buttonVariants(variant, size), className].filter(Boolean).join(" ")} {...props} />
}

export { Button, buttonVariants }
