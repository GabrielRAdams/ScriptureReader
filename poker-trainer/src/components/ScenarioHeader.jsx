import { Eye, MapPin, ScrollText, Spade } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CATEGORIES } from '@/data/categories'
import { cn } from '@/lib/utils'

export function ScenarioHeader({ scenario }) {
  const category = CATEGORIES[scenario.category]

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5 border-white/10 bg-black/30">
            <Spade className="h-3 w-3" aria-hidden="true" />
            {scenario.stakes}
          </Badge>
          <Badge className={cn('border', category.chip)}>{category.name}</Badge>
          <Badge variant="slate">{scenario.street}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeaderCell label="Hero position" value={scenario.heroPos} icon={MapPin} highlight />
          <HeaderCell label="Effective stack" value={`${scenario.stackBB} BB`} />
          <HeaderCell label="Pot" value={scenario.pot} />
          <HeaderCell
            label="To call"
            value={scenario.toCall ?? '—'}
          />
        </div>

        <div className="space-y-2 rounded-lg border border-white/5 bg-black/25 p-3">
          <div className="flex items-start gap-2">
            <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-felt-300" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-foreground/90">{scenario.history}</p>
          </div>
          <div className="flex items-start gap-2 border-t border-white/5 pt-2">
            <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-amber-200/90">Read: </span>
              {scenario.villainProfile}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function HeaderCell({ label, value, icon: Icon, highlight }) {
  return (
    <div
      className={cn(
        'rounded-lg border border-white/5 bg-black/20 px-3 py-2',
        highlight && 'border-felt-500/40 bg-felt-500/10',
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="h-3 w-3" aria-hidden="true" /> : null}
        {label}
      </div>
      <div className={cn('tabular text-sm font-bold', highlight ? 'text-felt-200' : 'text-foreground')}>
        {value}
      </div>
    </div>
  )
}
