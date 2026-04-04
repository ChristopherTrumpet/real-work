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
  /** Inner hole as fraction of radius (0–1) */
  holeRatio?: number
}

export default function DifficultyWheel({
  easy,
  medium,
  hard,
  centerLabel = 'Solved',
  size = 168,
  holeRatio = 0.58,
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
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div
        className="relative shrink-0 rounded-full shadow-inner ring-1 ring-black/5 dark:ring-white/10"
        style={{
          width: size,
          height: size,
          background,
        }}
        aria-label={`${centerLabel}: ${easy} easy, ${medium} medium, ${hard} hard`}
      >
        <div
          className="absolute flex flex-col items-center justify-center rounded-full bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
          style={{
            inset: holePct,
          }}
        >
          <span className="text-2xl font-bold tabular-nums leading-none">{total}</span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 text-sm min-w-[9rem]">
        <li className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: EASY }} />
            Easy
          </span>
          <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{easy}</span>
        </li>
        <li className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: MEDIUM }} />
            Medium
          </span>
          <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{medium}</span>
        </li>
        <li className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 font-medium text-zinc-700 dark:text-zinc-300">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: HARD }} />
            Hard
          </span>
          <span className="tabular-nums text-zinc-900 dark:text-zinc-100">{hard}</span>
        </li>
      </ul>
    </div>
  )
}
