import { useCallback, useEffect, useState } from 'react'
import { Calculator, CircleCheck, CircleX, Landmark, RotateCcw, Target } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BankrollTool } from '@/components/BankrollTool'
import { DRILL_TYPES, generateQuestion } from '@/lib/mathDrills'
import { loadSlice, saveSlice } from '@/lib/storage'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'math'
const EMPTY_STATS = { total: 0, correct: 0, streak: 0, bestStreak: 0 }

export function MathDrill() {
  const [mode, setMode] = useState('drill')
  const [typeId, setTypeId] = useState('all')
  const [question, setQuestion] = useState(() => generateQuestion('all'))
  const [choice, setChoice] = useState(null)
  const [stats, setStats] = useState(() => loadSlice(STORAGE_KEY, EMPTY_STATS))

  useEffect(() => {
    saveSlice(STORAGE_KEY, stats)
  }, [stats])

  const submit = useCallback(
    (value) => {
      if (choice !== null) return
      const isRight = value === question.answer
      setChoice(value)
      setStats((prev) => {
        const streak = isRight ? prev.streak + 1 : 0
        return {
          total: prev.total + 1,
          correct: prev.correct + (isRight ? 1 : 0),
          streak,
          bestStreak: Math.max(prev.bestStreak, streak),
        }
      })
    },
    [choice, question],
  )

  const nextQuestion = useCallback(() => {
    setChoice(null)
    setQuestion(generateQuestion(typeId))
  }, [typeId])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.metaKey || event.ctrlKey) return
      if (choice === null) {
        const index = Number(event.key) - 1
        if (Number.isInteger(index) && index >= 0 && index < question.options.length) {
          event.preventDefault()
          submit(question.options[index].value)
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        nextQuestion()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [choice, nextQuestion, question, submit])

  const isRight = choice !== null && choice === question.answer

  return (
    <div className="space-y-3">
      {/* Drills sharpen in-hand maths; the bankroll tool answers the question
          that decides whether you survive long enough to use them. */}
      <div className="inline-flex rounded-lg bg-muted/70 p-1">
        <button
          type="button"
          onClick={() => setMode('drill')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
            mode === 'drill' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}
        >
          <Target className="h-3.5 w-3.5" aria-hidden="true" />
          Drills
        </button>
        <button
          type="button"
          onClick={() => setMode('bankroll')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
            mode === 'bankroll' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
          )}
        >
          <Landmark className="h-3.5 w-3.5" aria-hidden="true" />
          Bankroll
        </button>
      </div>

      {mode === 'bankroll' ? <BankrollTool /> : null}

      {mode === 'drill' ? (
        <>
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {DRILL_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => {
              setTypeId(type.id)
              setChoice(null)
              setQuestion(generateQuestion(type.id))
            }}
            className={cn(
              'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95',
              type.id === typeId
                ? 'border-felt-500/50 bg-felt-500/15 text-felt-100'
                : 'border-white/10 bg-card/60 text-muted-foreground hover:text-foreground',
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {stats.total > 0 ? (
        <div className="flex items-center gap-2">
          <Badge variant="slate">
            {Math.round((stats.correct / stats.total) * 100)}% over {stats.total}
          </Badge>
          <Badge variant={stats.streak >= 3 ? 'felt' : 'outline'}>
            Streak {stats.streak} · best {stats.bestStreak}
          </Badge>
        </div>
      ) : null}

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-felt-300" aria-hidden="true" />
            <Badge variant="felt">{question.type}</Badge>
          </div>

          <div>
            <p className="text-base font-bold leading-snug text-foreground">{question.prompt}</p>
            <p className="mt-1 text-sm text-muted-foreground">{question.detail}</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {question.options.map((option) => {
              const isChoice = choice === option.value
              const isAnswer = choice !== null && option.value === question.answer
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={choice !== null}
                  onClick={() => submit(option.value)}
                  className={cn(
                    'tabular rounded-lg border px-3 py-3.5 text-base font-bold transition-all active:scale-95',
                    choice === null && 'border-white/10 bg-card/80 hover:border-felt-400/60',
                    isAnswer && 'border-emerald-500/70 bg-emerald-500/20 text-emerald-200',
                    isChoice && !isAnswer && 'border-rose-500/70 bg-rose-500/20 text-rose-200',
                    choice !== null && !isChoice && !isAnswer && 'border-white/5 bg-card/40 opacity-50',
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>

          {choice !== null ? (
            <div className="animate-fade-up space-y-3">
              <div
                className={cn(
                  'flex items-start gap-2 rounded-lg border p-3',
                  isRight
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-rose-500/40 bg-rose-500/10',
                )}
              >
                {isRight ? (
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                ) : (
                  <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden="true" />
                )}
                <p className="text-sm leading-relaxed text-foreground/85">
                  <span className={cn('font-bold', isRight ? 'text-emerald-200' : 'text-rose-200')}>
                    {isRight ? 'Correct. ' : 'Not quite. '}
                  </span>
                  {question.working}
                </p>
              </div>

              <Button size="lg" className="w-full font-bold" onClick={nextQuestion}>
                Next Question
              </Button>
            </div>
          ) : (
            <p className="text-center text-[10px] text-muted-foreground">
              Press 1-{question.options.length} to answer, Enter for the next question.
            </p>
          )}
        </CardContent>
      </Card>

      {stats.total > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          onClick={() => setStats(EMPTY_STATS)}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset math stats
        </Button>
      ) : null}
        </>
      ) : null}
    </div>
  )
}
