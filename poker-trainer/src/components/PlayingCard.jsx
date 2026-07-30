import { cn } from '@/lib/utils'

/**
 * Four-colour deck — much faster to read on a phone than the classic two-colour
 * deck, and it is what most live players use on training apps.
 */
const SUITS = {
  s: { glyph: '♠', name: 'spades', text: 'text-slate-900', accent: 'bg-slate-900' },
  h: { glyph: '♥', name: 'hearts', text: 'text-rose-600', accent: 'bg-rose-600' },
  d: { glyph: '♦', name: 'diamonds', text: 'text-sky-600', accent: 'bg-sky-600' },
  c: { glyph: '♣', name: 'clubs', text: 'text-emerald-600', accent: 'bg-emerald-600' },
}

const RANK_NAMES = {
  A: 'Ace',
  K: 'King',
  Q: 'Queen',
  J: 'Jack',
  T: 'Ten',
}

const SIZES = {
  sm: 'h-[52px] w-[38px] rounded-[6px] text-base',
  md: 'h-[74px] w-[54px] rounded-[8px] text-2xl',
  lg: 'h-[92px] w-[66px] rounded-[10px] text-3xl',
}

const GLYPH_SIZES = {
  sm: 'text-sm',
  md: 'text-xl',
  lg: 'text-2xl',
}

export function PlayingCard({ card, size = 'md', className, style, dimmed = false }) {
  const rank = card.slice(0, -1)
  const suitKey = card.slice(-1).toLowerCase()
  const suit = SUITS[suitKey] ?? SUITS.s
  const label = `${RANK_NAMES[rank] ?? rank} of ${suit.name}`

  return (
    <div
      role="img"
      aria-label={label}
      style={style}
      className={cn(
        'relative flex select-none flex-col items-center justify-center bg-gradient-to-b from-white to-slate-100 font-bold leading-none shadow-lg shadow-black/40 ring-1 ring-black/20',
        SIZES[size],
        suit.text,
        dimmed && 'opacity-45 saturate-50',
        className,
      )}
    >
      <span className="tabular tracking-tight">{rank}</span>
      <span className={cn('mt-0.5', GLYPH_SIZES[size])} aria-hidden="true">
        {suit.glyph}
      </span>
      <span className={cn('absolute inset-x-0 bottom-0 h-1 rounded-b-[inherit]', suit.accent)} aria-hidden="true" />
    </div>
  )
}

/** Face-down placeholder used for board cards that have not been dealt yet. */
export function CardSlot({ size = 'md', className }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center border border-dashed border-white/15 bg-white/[0.03]',
        SIZES[size],
        className,
      )}
    />
  )
}
