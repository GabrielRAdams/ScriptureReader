import { useEffect, useState } from 'react'
import {
  ChevronDown,
  CircleCheck,
  ClipboardList,
  Coins,
  GraduationCap,
  RefreshCw,
  ScrollText,
  Timer,
  Trash2,
  TriangleAlert,
} from 'lucide-react'

import { PlayingCard } from '@/components/PlayingCard'
import { ActionControls } from '@/components/sim/ActionControls'
import { AdaptingBadge, SessionReport } from '@/components/sim/SessionReport'
import { SeatView } from '@/components/sim/SeatView'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useSim } from '@/hooks/useSim'
import { DIFFICULTIES, DIFFICULTY_IDS } from '@/lib/simBots'
import { SPEEDS, SPEED_IDS } from '@/lib/tempo'
import { toBB } from '@/lib/cards'
import { totalPot } from '@/lib/pokerSim'
import { cn } from '@/lib/utils'

function HudStat({ label, value, tone = 'text-foreground', title }) {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center rounded-lg bg-black/25 px-1 py-1.5 ring-1 ring-white/5"
      title={title}
    >
      <span className="truncate text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className={cn('tabular text-sm font-extrabold leading-tight', tone)}>{value}</span>
    </div>
  )
}

export function SimTable() {
  const sim = useSim()
  const { hand, legal, isHeroTurn, stats, leaks, pending, coachNote, coachOn, lastEquity } = sim
  const difficulty = DIFFICULTIES[sim.difficulty] ?? DIFFICULTIES.soft
  const [logOpen, setLogOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const complete = hand?.street === 'complete'

  // Keyboard: F fold, C check/call, Enter for the next hand.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const tag = event.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (complete && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        sim.nextHand()
        return
      }
      if (!isHeroTurn || !legal) return
      const key = event.key.toLowerCase()
      if (key === 'f') {
        event.preventDefault()
        sim.act({ type: 'fold' })
      } else if (key === 'c') {
        event.preventDefault()
        sim.act(legal.canCheck ? { type: 'check' } : { type: 'call' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [complete, isHeroTurn, legal, sim])

  if (!hand) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Dealing…
        </CardContent>
      </Card>
    )
  }

  const hero = hand.players.find((p) => p.isHero)
  const bots = hand.players.filter((p) => !p.isHero)
  const topRow = bots.slice(1, 4)
  const [leftSeat, rightSeat] = [bots[0], bots[4]]
  const pot = complete ? (hand.result?.potTotal ?? 0) : totalPot(hand)
  const winners = new Set(hand.result?.pots.flatMap((p) => p.winners) ?? [])
  const heroDelta = hand.result?.deltas?.[hero.seat] ?? 0

  return (
    <div className="space-y-3">
      {/* Table difficulty. Harder tables are not "better bots" so much as fewer
          donators — that is what actually decides how much money is available. */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/60 p-1">
          {DIFFICULTY_IDS.map((id) => {
            const level = DIFFICULTIES[id]
            const active = sim.difficulty === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => sim.setDifficulty(id)}
                aria-pressed={active}
                className={cn(
                  'flex flex-col items-center rounded-lg px-2 py-1.5 transition-all active:scale-[0.98]',
                  active
                    ? 'bg-felt-600 text-white shadow-md shadow-felt-900/50'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="text-xs font-bold">{level.name}</span>
                <span className={cn('text-[9px]', active ? 'text-felt-100/80' : 'opacity-70')}>
                  {level.stakes}
                </span>
              </button>
            )
          })}
        </div>
        <p className="px-0.5 text-[10px] leading-snug text-muted-foreground">{difficulty.blurb}</p>
      </div>

      {/* Session HUD — your own stats, the way a tracker would show them. */}
      <div className="flex gap-1.5">
        <HudStat label="Hands" value={stats.hands} />
        <HudStat
          label="Net"
          value={`${stats.bb >= 0 ? '+' : ''}${stats.bb.toFixed(1)}bb`}
          tone={stats.bb > 0 ? 'text-emerald-300' : stats.bb < 0 ? 'text-rose-300' : 'text-foreground'}
        />
        <HudStat
          label="bb/100"
          value={stats.hands >= 10 ? stats.bbPer100.toFixed(0) : '—'}
          tone={
            stats.hands < 10
              ? 'text-muted-foreground'
              : stats.bbPer100 > 0
                ? 'text-emerald-300'
                : 'text-rose-300'
          }
          title="Big blinds won per 100 hands. Needs hundreds of hands to mean anything."
        />
        <HudStat
          label="VPIP/PFR"
          value={`${stats.vpip == null ? '—' : Math.round(stats.vpip)}/${stats.pfr == null ? '—' : Math.round(stats.pfr)}`}
          title="How often you put money in preflop, and how often you raised. A solid 6-max reg runs about 22/18."
        />
        <HudStat
          label="WTSD"
          value={stats.wtsd == null ? '—' : `${Math.round(stats.wtsd)}%`}
          title="Went to showdown after seeing the flop. Above ~30% usually means calling too much."
        />
      </div>

      {/* Table */}
      <div className="felt-surface relative overflow-hidden rounded-2xl border border-felt-700/50 p-3 shadow-xl shadow-black/40 sm:p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 -top-24 h-40 rounded-full bg-felt-400/20 blur-3xl"
        />

        <div className="relative space-y-2">
          <div className="flex justify-center gap-1.5 sm:gap-3">
            {topRow.map((p) => (
              <SeatView
                key={p.seat}
                player={p}
                isButton={p.seat === hand.buttonSeat}
                isActor={legal?.player?.seat === p.seat}
                revealed={complete && hand.result?.showdown && !p.folded}
                won={winners.has(p.seat)}
              />
            ))}
          </div>

          <div className="flex items-start justify-between gap-1">
            <SeatView
              player={leftSeat}
              isButton={leftSeat.seat === hand.buttonSeat}
              isActor={legal?.player?.seat === leftSeat.seat}
              revealed={complete && hand.result?.showdown && !leftSeat.folded}
              won={winners.has(leftSeat.seat)}
            />

            {/* Pot sits between the side seats; the board gets its own full
                width row below so five cards never wrap on a phone. */}
            <div className="flex min-w-0 flex-1 justify-center pt-6">
              <span className="tabular flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs font-extrabold text-amber-100 ring-1 ring-amber-400/25">
                <Coins className="h-3 w-3" aria-hidden="true" />
                {toBB(pot)}
              </span>
            </div>

            <SeatView
              player={rightSeat}
              isButton={rightSeat.seat === hand.buttonSeat}
              isActor={legal?.player?.seat === rightSeat.seat}
              revealed={complete && hand.result?.showdown && !rightSeat.folded}
              won={winners.has(rightSeat.seat)}
            />
          </div>

          <div className="flex min-h-[56px] items-center justify-center gap-1 sm:gap-1.5">
            {hand.board.map((card, i) => (
              <PlayingCard
                key={card + i}
                card={card}
                size="sm"
                className="animate-card-in"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
            {hand.board.length === 0 ? (
              <span className="text-[10px] uppercase tracking-widest text-felt-200/50">
                Preflop
              </span>
            ) : null}
          </div>

          <div className="flex justify-center pt-1">
            <SeatView
              player={hero}
              isButton={hero.seat === hand.buttonSeat}
              isActor={isHeroTurn}
              won={winners.has(hero.seat)}
              className="w-[120px]"
            />
          </div>
        </div>
      </div>

      {/* Result / controls */}
      {complete ? (
        <Card
          className={cn(
            'animate-fade-up border-2',
            heroDelta > 0
              ? 'border-emerald-500/60 bg-emerald-500/10'
              : heroDelta < 0
                ? 'border-rose-500/50 bg-rose-500/10'
                : 'border-white/10',
          )}
        >
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {hand.result?.showdown ? 'Showdown' : 'Pot won uncontested'}
                  <span className="ml-1.5 font-semibold text-muted-foreground">
                    {toBB(hand.result?.potTotal ?? 0)} pot
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[...winners]
                    .map((seat) => {
                      const p = hand.players.find((x) => x.seat === seat)
                      const made = hand.result?.hands?.[seat]
                      return made ? `${p.name} — ${made}` : p.name
                    })
                    .join(' · ')}
                </p>
              </div>
              <span
                className={cn(
                  'tabular shrink-0 text-lg font-extrabold',
                  heroDelta > 0
                    ? 'text-emerald-300'
                    : heroDelta < 0
                      ? 'text-rose-300'
                      : 'text-muted-foreground',
                )}
              >
                {heroDelta > 0 ? '+' : ''}
                {toBB(heroDelta)}
              </span>
            </div>

            {lastEquity != null ? (
              <p className="rounded-lg border border-white/5 bg-black/25 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground/80">
                  Flop equity: {Math.round(lastEquity * 100)}%
                </span>{' '}
                — what your hand was worth when the flop landed, against the ranges your{' '}
                {hand.players.filter((p) => !p.folded && !p.isHero).length} opponent
                {hand.players.filter((p) => !p.folded && !p.isHero).length === 1 ? '' : 's'} had shown
                preflop. Losing with the best of it is not a mistake.
              </p>
            ) : null}

            <Button size="lg" className="w-full font-bold" onClick={sim.nextHand}>
              Next Hand
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {isHeroTurn ? (
            <ActionControls hand={hand} legal={legal} onAct={sim.act} />
          ) : (
            <div className="flex h-[52px] items-center justify-center rounded-lg border border-white/5 bg-card/40 text-xs text-muted-foreground">
              Waiting for {legal?.player?.name ?? 'the table'}…
            </div>
          )}
        </div>
      )}

      {/* Preflop coach */}
      {coachOn && coachNote ? (
        <div
          className={cn(
            'animate-fade-up flex items-start gap-2 rounded-lg border p-3',
            coachNote.tone === 'good'
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-amber-500/30 bg-amber-500/10',
          )}
        >
          {coachNote.tone === 'good' ? (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          ) : (
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          )}
          <p className="text-xs leading-relaxed text-foreground/90">{coachNote.text}</p>
        </div>
      ) : null}

      {/* Hand log */}
      <div className="rounded-lg border border-white/5 bg-black/25">
        <button
          type="button"
          onClick={() => setLogOpen((v) => !v)}
          aria-expanded={logOpen}
          className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
          Hand {sim.handNumber} log
          <ChevronDown
            className={cn('ml-auto h-3.5 w-3.5 transition-transform', logOpen && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        {logOpen ? (
          <ul className="max-h-48 space-y-0.5 overflow-y-auto px-3 pb-3 text-xs">
            {hand.log.map((entry, i) => (
              <li
                key={i}
                className={cn(
                  entry.type === 'street' && 'mt-1.5 font-bold text-felt-200',
                  entry.type === 'result' && 'mt-1.5 font-bold text-amber-200',
                  entry.type === 'action' && 'text-muted-foreground',
                )}
              >
                {entry.type === 'action' ? `${entry.name} ${entry.text}` : entry.text}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-lg border border-white/5 bg-black/25">
        <button
          type="button"
          onClick={() => setReportOpen((v) => !v)}
          aria-expanded={reportOpen}
          className="flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
        >
          <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
          Session report
          {leaks.length > 0 ? (
            <span className="rounded-full bg-rose-500/25 px-1.5 py-px text-[9px] font-bold text-rose-200">
              {leaks.length} leak{leaks.length === 1 ? '' : 's'}
            </span>
          ) : null}
          <ChevronDown
            className={cn('ml-auto h-3.5 w-3.5 transition-transform', reportOpen && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
        {reportOpen ? (
          <div className="px-3 pb-3">
            <SessionReport stats={stats} leaks={leaks} pending={pending} />
          </div>
        ) : null}
      </div>

      {/* Opponents act on human-shaped delays; this scales that without
          flattening it, so the rhythm stays recognisable when grinding. */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          Speed
        </span>
        <div className="flex flex-1 gap-1 rounded-lg bg-muted/60 p-1">
          {SPEED_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => sim.setSpeed(id)}
              aria-pressed={sim.speed === id}
              title={SPEEDS[id].blurb}
              className={cn(
                'flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all active:scale-95',
                sim.speed === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {SPEEDS[id].name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AdaptingBadge active={sim.botsAdapting} after={difficulty.adaptAfter} />
        <Badge variant={coachOn ? 'felt' : 'slate'}>
          <button type="button" onClick={sim.toggleCoach} className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" aria-hidden="true" />
            Coach {coachOn ? 'on' : 'off'}
          </button>
        </Badge>
        <Button variant="ghost" size="sm" className="text-xs" onClick={sim.newTable}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          New table
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs text-muted-foreground"
          onClick={() => {
            if (window.confirm('Reset sim session stats?')) sim.resetStats()
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Reset stats
        </Button>
      </div>

      <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
        Opponents are rule-based player types, not solvers, and they act on human-shaped delays
        that never depend on their cards. Beating them is practice at exploiting a pool, not proof
        of a winning strategy.
      </p>
    </div>
  )
}
