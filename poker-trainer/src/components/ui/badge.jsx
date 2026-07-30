import * as React from 'react'
import { cva } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/90 text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/90 text-destructive-foreground',
        outline: 'border-border text-foreground',
        felt: 'border-felt-500/40 bg-felt-500/15 text-felt-200',
        amber: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
        rose: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
        slate: 'border-slate-500/40 bg-slate-500/15 text-slate-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
