import { cn } from '@/lib/utils'

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={cn('size-full', className)} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

/** Portion of the i-th star (1–5) filled for an average in [0, 5]. */
function fillForStar(average: number, starIndex: number): number {
  return Math.min(1, Math.max(0, average - (starIndex - 1)))
}

function FractionalStar({
  fill,
  pixelSize,
}: {
  fill: number
  /** Square size in px (tailwind size-4 = 16, size-5 = 20). */
  pixelSize: number
}) {
  const pct = Math.min(100, Math.max(0, fill * 100))

  return (
    <span
      className="relative shrink-0 overflow-visible"
      style={{ width: pixelSize, height: pixelSize }}
    >
      <span className="pointer-events-none absolute inset-0 text-muted-foreground/25">
        <StarIcon />
      </span>
      <span
        className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <span className="block text-amber-500" style={{ width: pixelSize, height: pixelSize }}>
          <StarIcon />
        </span>
      </span>
    </span>
  )
}

export type RatingBreakdown = readonly [number, number, number, number, number]

/** Counts per star value from `post_ratings` rows (index 0 = 1★ … index 4 = 5★). */
export function ratingRowsToBreakdown(rows: { rating: number }[] | null | undefined): RatingBreakdown {
  const c: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  for (const row of rows ?? []) {
    const v = Number(row.rating)
    if (v >= 1 && v <= 5) c[v - 1] += 1
  }
  return c
}

function RatingBreakdownBars({ counts }: { counts: RatingBreakdown }) {
  const total = counts.reduce((a, b) => a + b, 0)
  const max = Math.max(...counts, 1)

  return (
    <div className="mt-4 space-y-2" aria-label="Rating breakdown by star value">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Breakdown</p>
      <ul className="space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const n = counts[star - 1]
          const barPct = total === 0 ? 0 : (n / max) * 100
          return (
            <li key={star} className="grid grid-cols-[1.75rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="tabular-nums text-muted-foreground">{star}★</span>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                title={`${n} rating${n === 1 ? '' : 's'}`}
              >
                <div
                  className="h-full rounded-full bg-amber-500/80 transition-[width] dark:bg-amber-500/70"
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-muted-foreground">{n}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Aggregate community rating for display (e.g. before or during a challenge). */
export function ReadOnlyStarRating({
  averageRating,
  ratingsCount,
  countsByStar,
  className,
  size = 'md',
}: {
  averageRating: number | null | undefined
  ratingsCount?: number | null | undefined
  /** Optional per-star counts [1★, 2★, 3★, 4★, 5★]; enables breakdown bars. */
  countsByStar?: RatingBreakdown
  className?: string
  size?: 'sm' | 'md'
}) {
  const avg = averageRating != null ? Number(averageRating) : null
  const count = ratingsCount ?? 0
  const pixelSize = size === 'sm' ? 16 : 20
  const clampedAvg = avg != null ? Math.min(5, Math.max(0, avg)) : null

  return (
    <div className={cn(className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Community rating</p>
      <div
        className="mt-2 flex items-center gap-0.5"
        role="img"
        aria-label={
          clampedAvg != null ? `Average ${clampedAvg.toFixed(1)} out of 5 stars` : 'No ratings yet'
        }
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <FractionalStar
            key={i}
            fill={clampedAvg != null ? fillForStar(clampedAvg, i) : 0}
            pixelSize={pixelSize}
          />
        ))}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {avg != null ? (
          <>
            <span className="font-medium text-foreground">{avg.toFixed(1)}</span> out of 5
            {count > 0 && (
              <>
                {' '}
                · {count} rating{count === 1 ? '' : 's'}
              </>
            )}
          </>
        ) : (
          <>No ratings yet</>
        )}
      </p>
      {countsByStar != null && <RatingBreakdownBars counts={countsByStar} />}
    </div>
  )
}
