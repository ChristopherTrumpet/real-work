/** LeetCode-style donut: solved counts by difficulty. SVG annulus = even, thin ring (no extra deps). */

const EASY = '#2cbb5d'
const MEDIUM = '#ffc01e'
const HARD = '#ef4743'

const VB = 100
const CX = 50
const CY = 50

/** Point on circle; angleDeg clockwise from top. */
function point(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  }
}

/** Annular sector; sweepDeg in (0, 360). For a full circle use two 180° slices. */
function annularSlice(rOut: number, rIn: number, startDeg: number, sweepDeg: number): string {
  if (sweepDeg <= 0) return ''
  const endDeg = startDeg + sweepDeg
  const largeArc = sweepDeg > 180 ? 1 : 0

  const o0 = point(CX, CY, rOut, startDeg)
  const o1 = point(CX, CY, rOut, endDeg)
  const i1 = point(CX, CY, rIn, endDeg)
  const i0 = point(CX, CY, rIn, startDeg)

  return [
    `M ${o0.x} ${o0.y}`,
    `A ${rOut} ${rOut} 0 ${largeArc} 1 ${o1.x} ${o1.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${rIn} ${rIn} 0 ${largeArc} 0 ${i0.x} ${i0.y}`,
    'Z',
  ].join(' ')
}

function pushSlice(
  out: { d: string; fill: string; key: string }[],
  rOut: number,
  rIn: number,
  startDeg: number,
  sweepDeg: number,
  fill: string,
  key: string
) {
  if (sweepDeg <= 0) return startDeg
  // Full circle: two half-rings (single 360° arc collapses to zero-length in SVG)
  if (sweepDeg >= 360) {
    out.push({ d: annularSlice(rOut, rIn, startDeg, 180), fill, key: `${key}-a` })
    out.push({ d: annularSlice(rOut, rIn, startDeg + 180, 180), fill, key: `${key}-b` })
    return startDeg + 360
  }
  out.push({ d: annularSlice(rOut, rIn, startDeg, sweepDeg), fill, key })
  return startDeg + sweepDeg
}

export type DifficultyWheelProps = {
  easy: number
  medium: number
  hard: number
  centerLabel?: string
  /** Outer diameter in px */
  size?: number
  /**
   * Radial thickness of the colored band (viewBox units; full chart is 100).
   * Smaller = thinner ring (e.g. 2–2.8).
   */
  band?: number
}

export default function DifficultyWheel({
  easy,
  medium,
  hard,
  centerLabel = 'Solved',
  size = 168,
  band = 2.35,
}: DifficultyWheelProps) {
  const total = easy + medium + hard

  const rOut = 47
  const rIn = rOut - band

  const easyDeg = total > 0 ? (easy / total) * 360 : 0
  const medDeg = total > 0 ? (medium / total) * 360 : 0
  const hardDeg = total > 0 ? (hard / total) * 360 : 0

  const slices: { d: string; fill: string; key: string }[] = []
  let a = 0
  if (total > 0) {
    a = pushSlice(slices, rOut, rIn, a, easyDeg, EASY, 'easy')
    a = pushSlice(slices, rOut, rIn, a, medDeg, MEDIUM, 'medium')
    pushSlice(slices, rOut, rIn, a, hardDeg, HARD, 'hard')
  }

  const holePct = `${(rIn / (VB / 2)) * 100}%`

  return (
    <div className="@container difficulty-wheel w-full min-w-0">
      <div className="flex w-full min-w-0 flex-col items-center gap-4 @[22rem]:flex-row @[22rem]:items-center @[22rem]:justify-center @[22rem]:gap-6">
        <div
          className="relative shrink-0 rounded-full ring-1 ring-black/5 dark:ring-white/10"
          style={{
            width: size,
            height: size,
            maxWidth: '100%',
          }}
          aria-label={`${centerLabel}: ${easy} easy, ${medium} medium, ${hard} hard`}
        >
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${VB} ${VB}`}
            className="block size-full"
            aria-hidden
          >
            {total === 0 ? (
              <circle
                cx={CX}
                cy={CY}
                r={(rOut + rIn) / 2}
                fill="none"
                className="stroke-muted"
                strokeWidth={band}
              />
            ) : (
              slices.map((s) => <path key={s.key} d={s.d} fill={s.fill} />)
            )}
          </svg>
          <div
            className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-card text-card-foreground shadow-sm ring-1 ring-border/60"
            style={{
              width: holePct,
              height: holePct,
              maxWidth: '88%',
              maxHeight: '88%',
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
