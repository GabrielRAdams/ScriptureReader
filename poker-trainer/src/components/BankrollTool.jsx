import { useMemo, useState } from 'react'
import { Landmark, ShieldCheck, TrendingDown, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DEFAULT_STDEV,
  STAKES,
  bankrollForRisk,
  probabilityLosing,
  riskOfRuin,
  swingStdev,
  typicalDownswing,
} from '@/lib/bankroll'
import { cn } from '@/lib/utils'

function Slider({ label, value, min, max, step, onChange, format, hint }) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-semibold text-foreground/85">{label}</label>
        <span className="tabular text-sm font-extrabold text-felt-100">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-felt-400"
      />
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function riskTone(risk) {
  if (risk < 0.02) return { text: 'text-emerald-300', label: 'Safe', variant: 'felt' }
  if (risk < 0.1) return { text: 'text-emerald-300', label: 'Reasonable', variant: 'felt' }
  if (risk < 0.3) return { text: 'text-amber-300', label: 'Risky', variant: 'amber' }
  return { text: 'text-rose-300', label: 'Reckless', variant: 'rose' }
}

/**
 * Bankroll and variance. The numbers here are the ones that decide whether a
 * winning player survives long enough to stay winning.
 */
export function BankrollTool() {
  const [winrate, setWinrate] = useState(5)
  const [buyIns, setBuyIns] = useState(30)
  const [stdev, setStdev] = useState(DEFAULT_STDEV)
  const [stakeId, setStakeId] = useState('nl10')

  const stake = STAKES.find((s) => s.id === stakeId) ?? STAKES[2]
  const bankrollBB = buyIns * 100

  const results = useMemo(() => {
    const risk = riskOfRuin(winrate, bankrollBB, stdev)
    return {
      risk,
      needed5: bankrollForRisk(winrate, 0.05, stdev) / 100,
      needed1: bankrollForRisk(winrate, 0.01, stdev) / 100,
      swing10k: swingStdev(10000, stdev),
      losing10k: probabilityLosing(winrate, 10000, stdev),
      losing25k: probabilityLosing(winrate, 25000, stdev),
      downswing: typicalDownswing(stdev, winrate),
    }
  }, [winrate, bankrollBB, stdev])

  const tone = riskTone(results.risk)

  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {STAKES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStakeId(s.id)}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
              s.id === stakeId
                ? 'border-felt-500/50 bg-felt-500/15 text-felt-100'
                : 'border-white/10 bg-card/60 text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <Slider
            label="Your winrate"
            value={winrate}
            min={-2}
            max={15}
            step={0.5}
            onChange={setWinrate}
            format={(v) => `${v > 0 ? '+' : ''}${v} bb/100`}
            hint="A good micro-stakes reg beats NL10 for roughly 5-8 bb/100. Be honest — use your real number once you have 50k hands."
          />
          <Slider
            label="Bankroll"
            value={buyIns}
            min={5}
            max={100}
            step={1}
            onChange={setBuyIns}
            format={(v) => `${v} buy-ins`}
            hint={`${(buyIns * stake.buyIn).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} at ${stake.label}`}
          />
          <Slider
            label="Standard deviation"
            value={stdev}
            min={60}
            max={130}
            step={5}
            onChange={setStdev}
            format={(v) => `${v} bb/100`}
            hint="6-max cash typically runs 85-100. Higher if you play a loose, aggressive style."
          />
        </CardContent>
      </Card>

      <Card className={cn('border-2', results.risk < 0.1 ? 'border-emerald-500/40' : results.risk < 0.3 ? 'border-amber-500/40' : 'border-rose-500/40')}>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn('h-5 w-5', tone.text)} aria-hidden="true" />
              <span className="text-sm font-bold">Risk of ruin</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={tone.variant}>{tone.label}</Badge>
              <span className={cn('tabular text-2xl font-extrabold', tone.text)}>
                {winrate <= 0 ? '100%' : `${(results.risk * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-foreground/85">
            {winrate <= 0
              ? 'At a break-even or losing winrate, ruin is certain given enough hands — no bankroll is large enough. The only fix is a bigger edge.'
              : `With ${buyIns} buy-ins and a ${winrate} bb/100 winrate, you go broke roughly ${(results.risk * 100).toFixed(1)}% of the time if you never move down in stakes.`}
          </p>

          {winrate > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-white/5 bg-black/20 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  For 5% risk
                </div>
                <div className="tabular text-lg font-extrabold text-foreground">
                  {Math.ceil(results.needed5)} buy-ins
                </div>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/20 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  For 1% risk
                </div>
                <div className="tabular text-lg font-extrabold text-foreground">
                  {Math.ceil(results.needed1)} buy-ins
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <TrendingDown className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
            What variance actually looks like
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Swing over 10k hands (1 SD)</span>
              <span className="tabular font-bold">±{Math.round(results.swing10k)}bb</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Chance of being down after 10k hands</span>
              <span className="tabular font-bold">{(results.losing10k * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-muted-foreground">Chance of being down after 25k hands</span>
              <span className="tabular font-bold">{(results.losing25k * 100).toFixed(0)}%</span>
            </div>
            {winrate > 0 ? (
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">Downswing to expect at some point</span>
                <span className="tabular font-bold">{results.downswing}bb</span>
              </div>
            ) : null}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden="true" />
            <p className="text-[11px] leading-relaxed text-foreground/85">
              {winrate > 0
                ? `Even winning at ${winrate} bb/100, you are down after 10,000 hands about ${(results.losing10k * 100).toFixed(0)}% of the time. A losing month says almost nothing about whether you are a winning player — which is exactly why you judge yourself on decisions, not results.`
                : 'Nothing about bankroll management fixes a losing winrate. Move down, drill the leaks, and come back with an edge.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/25 p-3">
        <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-felt-300" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The formula assumes you never move down in stakes, which makes it deliberately pessimistic
          — dropping a level when you lose a third of your roll cuts real risk of ruin close to
          zero. Standard advice for micro cash is 30-50 buy-ins, and this is where that number comes
          from.
        </p>
      </div>
    </div>
  )
}
