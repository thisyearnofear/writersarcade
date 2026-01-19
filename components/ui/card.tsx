import * as React from "react"
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    typewriter?: boolean;
    enhanced?: boolean;
    arcade?: boolean;
    mobile?: boolean
  }
>(({ className, typewriter = false, enhanced = false, arcade = false, mobile = false, ...props }, ref) => {
  
  const { isMobile } = useMobileOptimizations()
  const isMobileCard = mobile || isMobile
  
  // Determine card classes based on props
  const cardClasses = [];
  
  if (typewriter) {
    cardClasses.push('border-gray-700', 'bg-gray-900/50', 'text-white', 'shadow-sm', 'writarcade-paper');
  } else if (enhanced) {
    cardClasses.push('card-enhanced');
  } else if (arcade) {
    cardClasses.push('bg-writarcade-primary', 'text-white', 'border-writarcade-primary', 'shadow-lg');
  } else {
    cardClasses.push('border-gray-700', 'bg-gray-900/50', 'text-white', 'shadow-sm');
  }
  
  // Add mobile optimizations
  if (isMobileCard) {
    cardClasses.push('p-4', 'sm:p-6');
  } else {
    cardClasses.push('p-6');
  }
  
  return (
    <div
      ref={ref}
      className={`rounded-lg border ${cardClasses.join(' ')} ${className || ""}`}
      {...props}
    />
  )
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex flex-col space-y-1.5 p-6 ${className || ""}`}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-2xl font-semibold leading-none tracking-tight ${className || ""}`}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-gray-400 ${className || ""}`}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={`p-6 pt-0 ${className || ""}`} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={`flex items-center p-6 pt-0 ${className || ""}`}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
