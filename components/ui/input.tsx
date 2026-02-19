import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useReducedMotion } from "framer-motion"

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  typewriter?: boolean
  animated?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, typewriter = false, animated = true, ...props }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const [isFocused, setIsFocused] = React.useState(false)

    if (animated && !prefersReducedMotion) {
      return (
        <motion.div
          className="relative"
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Background glow on focus */}
          <motion.div
            className="absolute -inset-0.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 opacity-0"
            animate={{ opacity: isFocused ? 0.3 : 0 }}
            transition={{ duration: 0.2 }}
          />
          <input
            type={type}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 relative",
              "sm:h-12 sm:px-4 sm:py-3 sm:min-h-[48px]",
              typewriter ? "typewriter-input" : "",
              className
            )}
            ref={ref}
            {...props}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
          />
        </motion.div>
      )
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          "sm:h-12 sm:px-4 sm:py-3 sm:min-h-[48px]",
          typewriter ? "typewriter-input" : "",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
