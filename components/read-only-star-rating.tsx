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

/** Aggregate community rating for display (e.g. before or during a challenge). */
export function ReadOnlyStarRating({
  averageRating,
  ratingsCount,
  className,
  size = 'md',
}: {
  averageRating: number | null | undefined
  ratingsCount?: number | null | undefined
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
    </div>
  )
}
