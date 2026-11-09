import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconChipProps {
  icon: LucideIcon
  className?: string
  iconClassName?: string
}

/**
 * Decorative icon badge: brand-tinted rounded square used atop empty states,
 * status screens, and recovery panels. Consolidates the previously
 * copy-pasted `bg-brand/10 text-brand` chip markup.
 */
export function IconChip({ icon: Icon, className, iconClassName }: IconChipProps) {
  return (
    <div
      className={cn(
        'flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 text-brand',
        className
      )}
    >
      <Icon className={cn('h-7 w-7', iconClassName)} />
    </div>
  )
}
