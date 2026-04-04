/** LeetCode-style donut: solved counts by difficulty (easy / medium / hard). */

const EASY = '#2cbb5d'
const MEDIUM = '#ffc01e'
const HARD = '#ef4743'
const EMPTY = '#d4d4d8'

export type DifficultyWheelProps = {
  easy: number
  medium: number
  hard: number
  /** Label under the total in the center (e.g. "Solved", "Created") */
  centerLabel?: string
  /** Outer diameter in px */
  size?: number
  /** Center cutout: inner diameter ≈ (1 − holeRatio) × outer. Lower values = thinner colored ring (e.g. 0.35–0.45). */
  holeRatio?: number
}

export default function DifficultyWheel({
  easy,
  medium,
  hard,
  centerLabel = 'Solved',
  size = 168,
  holeRatio = 0.38,
}: DifficultyWheelProps) {
  const total = easy + medium + hard
  const easyDeg = total > 0 ? (easy / total) * 360 : 0
  const medDeg = total > 0 ? (medium / total) * 360 : 0

  const background =
    total === 0
      ? EMPTY
      : `conic-gradient(
          ${EASY} 0deg ${easyDeg}deg,
          ${MEDIUM} ${easyDeg}deg ${easyDeg + medDeg}deg,
          ${HARD} ${easyDeg + medDeg}deg 360deg
        )`

  const holePct = `${holeRatio * 50}%`

  return (
    <div className="@container difficulty-wheel w-full min-w-0">
      <div className="flex w-full min-w-0 flex-col items-center gap-4 @[22rem]:flex-row @[22rem]:items-center @[22rem]:justify-center @[22rem]:gap-6">
        <div
          className="relative shrink-0 rounded-full shadow-inner ring-1 ring-black/5 dark:ring-white/10"
          style={{
            width: size,
            height: size,
            maxWidth: '100%',
          }}
          aria-label={`${centerLabel}: ${easy} easy, ${medium} medium, ${hard} hard`}
        >
          <div
            className="absolute flex flex-col items-center justify-center rounded-full bg-card text-card-foreground"
            style={{
              inset: holePct,
            }}
          >
            <span className="text-2xl font-bold tabular-nums leading-none">{total}</span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {centerLabel}
            </span>
          </div>
        </div>

        <ul className="flex w-full min-w-0 max-w-[11rem] flex-col gap-2 text-sm @[22rem]:max-w-[9rem]">
          <li className="flex min-w-0 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: EASY }} />
              Easy
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{easy}</span>
          </li>
          <li className="flex min-w-0 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MEDIUM }} />
              Medium
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{medium}</span>
          </li>
          <li className="flex min-w-0 items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: HARD }} />
              Hard
            </span>
            <span className="shrink-0 tabular-nums text-foreground">{hard}</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
