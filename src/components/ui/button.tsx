import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority" // Need to check if CVA is installed or I should use simple clsx
// package.json didn't show class-variance-authority. I should install it or write without it.
// I'll stick to clsx/tailwind-merge simple implementation to avoid installing more deps if I can.
// Actually standard shadcn uses it. I'll just write a simple component.

import { cn } from "@/lib/utils"
import { useSound } from "@/hooks/use-sound";

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }>(
    ({ className, variant = 'primary', size = 'md', onClick, onMouseEnter, ...props }, ref) => {
        const { playSound } = useSound();
        const baseStyles = "inline-flex items-center justify-center font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 comic-border active:translate-y-[2px] active:shadow-none uppercase tracking-wider"

        const variants = {
            primary: "bg-primary text-primary-foreground comic-shadow hover:bg-primary/90",
            secondary: "bg-secondary text-secondary-foreground comic-shadow hover:bg-secondary/90",
            outline: "bg-background text-foreground comic-shadow hover:bg-accent",
            ghost: "border-transparent shadow-none hover:bg-accent hover:text-accent-foreground",
            danger: "bg-destructive text-destructive-foreground comic-shadow hover:bg-destructive/90"
        }

        const sizes = {
            sm: "h-9 px-3 text-xs rounded-lg",
            md: "h-11 px-8 text-sm rounded-xl",
            lg: "h-14 px-10 text-base rounded-2xl"
        }

        const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
            playSound('click');
            onClick?.(e);
        }

        const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
            playSound('hover');
            onMouseEnter?.(e);
        }

        return (
            <button
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                ref={ref}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
