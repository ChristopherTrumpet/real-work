"use client"

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  color?: string
  width?: number
  height?: number
  className?: string
  maxOpacity?: number
  /** Squares near the cursor flicker brighter and more often (respects prefers-reduced-motion). */
  interactive?: boolean
  /** Distance in CSS pixels over which mouse influence falls off. */
  mouseInfluenceRadius?: number
}

type MousePos = { x: number; y: number }

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
  interactive = true,
  mouseInfluenceRadius = 200,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseRef = useRef<MousePos | null>(null)
  const reducedMotionRef = useRef(false)
  /** Default true so the first paint animates; IO can pause when off-screen. */
  const [isInView, setIsInView] = useState(true)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  /** Resolved from the container when `color` is `currentColor` (detached canvas cannot inherit). */
  const [resolvedPaintColor, setResolvedPaintColor] = useState(color)

  useLayoutEffect(() => {
    if (color !== "currentColor") {
      setResolvedPaintColor(color)
      return
    }
    const el = containerRef.current
    if (!el) return
    setResolvedPaintColor(getComputedStyle(el).color)
  }, [color])

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMotionRef.current = mq.matches
    const onMq = () => {
      reducedMotionRef.current = mq.matches
    }
    mq.addEventListener("change", onMq)
    return () => mq.removeEventListener("change", onMq)
  }, [])

  useEffect(() => {
    if (!interactive) return
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      if (x < 0 || y < 0 || x > r.width || y > r.height) {
        mouseRef.current = null
        return
      }
      mouseRef.current = { x, y }
    }
    window.addEventListener("mousemove", onMove, { passive: true })
    return () => window.removeEventListener("mousemove", onMove)
  }, [interactive])

  const memoizedColor = useMemo(() => {
    const toRGBA = (c: string) => {
      if (typeof window === "undefined") {
        return `rgba(0, 0, 0,`
      }
      const probe = document.createElement("canvas")
      probe.width = probe.height = 1
      const ctx = probe.getContext("2d")
      if (!ctx) return "rgba(255, 0, 0,"
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data)
      return `rgba(${r}, ${g}, ${b},`
    }
    return toRGBA(resolvedPaintColor)
  }, [resolvedPaintColor])

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      const cols = Math.ceil(width / (squareSize + gridGap))
      const rows = Math.ceil(height / (squareSize + gridGap))

      const squares = new Float32Array(cols * rows)
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity
      }

      return { cols, rows, squares, dpr }
    },
    [squareSize, gridGap, maxOpacity]
  )

  const updateSquares = useCallback(
    (
      squares: Float32Array,
      deltaTime: number,
      cols: number,
      rows: number,
      mouse: MousePos | null,
      disableMouseFx: boolean
    ) => {
      const gap = squareSize + gridGap
      for (let k = 0; k < squares.length; k++) {
        const i = Math.floor(k / rows)
        const j = k % rows
        let near = 1
        if (!disableMouseFx && mouse) {
          const cx = i * gap + squareSize / 2
          const cy = j * gap + squareSize / 2
          const d = Math.hypot(mouse.x - cx, mouse.y - cy)
          const t = Math.max(0, 1 - d / mouseInfluenceRadius)
          near = 1 + t * t * 2.2
        }
        if (Math.random() < flickerChance * deltaTime * near) {
          const cap = disableMouseFx
            ? maxOpacity
            : Math.min(0.95, maxOpacity * (0.55 + 0.45 * Math.min(near, 3)))
          squares[k] = Math.random() * cap
        }
      }
    },
    [flickerChance, maxOpacity, squareSize, gridGap, mouseInfluenceRadius]
  )

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number,
      mouse: MousePos | null,
      disableMouseFx: boolean
    ) => {
      ctx.clearRect(0, 0, width, height)
      ctx.fillStyle = "transparent"
      ctx.fillRect(0, 0, width, height)

      const gap = squareSize + gridGap
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          let opacity = squares[i * rows + j]
          if (!disableMouseFx && mouse) {
            const cx = i * gap + squareSize / 2
            const cy = j * gap + squareSize / 2
            const d = Math.hypot(mouse.x - cx, mouse.y - cy)
            const t = Math.max(0, 1 - d / mouseInfluenceRadius)
            const boost = t * t * 1.45
            opacity = Math.min(0.98, opacity * (1 + boost))
          }
          ctx.fillStyle = `${memoizedColor}${opacity})`
          ctx.fillRect(
            i * gap * dpr,
            j * gap * dpr,
            squareSize * dpr,
            squareSize * dpr
          )
        }
      }
    },
    [memoizedColor, squareSize, gridGap, mouseInfluenceRadius]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const ctx = canvas?.getContext("2d") ?? null
    let animationFrameId: number | null = null
    let resizeObserver: ResizeObserver | null = null
    let intersectionObserver: IntersectionObserver | null = null
    let gridParams: ReturnType<typeof setupCanvas> | null = null

    if (canvas && container && ctx) {
      const paint = () => {
        if (!gridParams) return
        const noMouseFx = !interactive || reducedMotionRef.current
        const mouse = noMouseFx ? null : mouseRef.current
        drawGrid(
          ctx,
          canvas.width,
          canvas.height,
          gridParams.cols,
          gridParams.rows,
          gridParams.squares,
          gridParams.dpr,
          mouse,
          noMouseFx
        )
      }

      const updateCanvasSize = () => {
        const newWidth = Math.max(1, width ?? container.clientWidth)
        const newHeight = Math.max(1, height ?? container.clientHeight)
        setCanvasSize({ width: newWidth, height: newHeight })
        gridParams = setupCanvas(canvas, newWidth, newHeight)
        paint()
      }

      updateCanvasSize()

      let lastTime = 0
      const animate = (time: number) => {
        if (!isInView || !gridParams) return

        const deltaTime = lastTime === 0 ? 0 : (time - lastTime) / 1000
        lastTime = time

        if (deltaTime > 0) {
          const noMouseFx = !interactive || reducedMotionRef.current
          const mouse = noMouseFx ? null : mouseRef.current
          updateSquares(
            gridParams.squares,
            deltaTime,
            gridParams.cols,
            gridParams.rows,
            mouse,
            noMouseFx
          )
        }
        paint()
        animationFrameId = requestAnimationFrame(animate)
      }

      resizeObserver = new ResizeObserver(() => {
        updateCanvasSize()
      })
      resizeObserver.observe(container)

      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          setIsInView(entry.isIntersecting)
        },
        { threshold: 0, rootMargin: "80px" }
      )
      intersectionObserver.observe(container)

      if (isInView) {
        animationFrameId = requestAnimationFrame(animate)
      }
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      if (intersectionObserver) {
        intersectionObserver.disconnect()
      }
    }
  }, [
    setupCanvas,
    updateSquares,
    drawGrid,
    width,
    height,
    isInView,
    interactive,
  ])

  return (
    <div
      ref={containerRef}
      className={cn("relative min-h-0 min-w-0 h-full w-full", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 block h-full w-full"
        style={{
          width: canvasSize.width || undefined,
          height: canvasSize.height || undefined,
        }}
      />
    </div>
  )
}
