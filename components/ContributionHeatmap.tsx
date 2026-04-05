'use client'

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'

type ContributionHeatmapProps = {
  data: { date: string; count: number }[]
  username: string
}

export function ContributionHeatmap({ data, username }: ContributionHeatmapProps) {
  // We want to show the last 52 weeks (approx 1 year)
  // Each day is a cell. Weeks are columns.
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  // Calculate start date (52 weeks ago, starting on a Sunday)
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - 364) // 52 weeks
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1)
  }

  const days = useMemo(() => {
    const d: { date: string; count: number; dayOfWeek: number }[] = []
    const currentDate = new Date(startDate)
    
    // Map data for fast lookup
    const dataMap = new Map(data.map(item => [item.date, item.count]))

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0]
      d.push({
        date: dateStr,
        count: dataMap.get(dateStr) || 0,
        dayOfWeek: currentDate.getDay()
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    return d
  }, [data, startDate, today])

  // Group into weeks
  const weeks = useMemo(() => {
    const w: (typeof days)[] = []
    let currentWeek: typeof days = []
    
    days.forEach((day, i) => {
      currentWeek.push(day)
      if (currentWeek.length === 7 || i === days.length - 1) {
        w.push(currentWeek)
        currentWeek = []
      }
    })
    return w
  }, [days])

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-muted/30 border-border/50'
    if (count === 1) return 'bg-primary/20 border-primary/10'
    if (count <= 3) return 'bg-primary/40 border-primary/20'
    if (count <= 6) return 'bg-primary/70 border-primary/30'
    return 'bg-primary border-primary/40'
  }

  const monthLabels = useMemo(() => {
    const labels: { label: string; index: number }[] = []
    let lastMonth = -1
    
    weeks.forEach((week, i) => {
      const firstDay = week[0]
      if (!firstDay) return
      const month = new Date(firstDay.date).getMonth()
      if (month !== lastMonth) {
        labels.push({
          label: new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(firstDay.date)),
          index: i
        })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  const totalContributions = data.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-sm overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          {totalContributions} contributions in the last year
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            <div className="size-2.5 rounded-sm bg-muted/30 border border-border/50" />
            <div className="size-2.5 rounded-sm bg-primary/20 border border-primary/10" />
            <div className="size-2.5 rounded-sm bg-primary/40 border border-primary/20" />
            <div className="size-2.5 rounded-sm bg-primary/70 border border-primary/30" />
            <div className="size-2.5 rounded-sm bg-primary border border-primary/40" />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="relative overflow-x-auto pb-2 custom-scrollbar">
        <div className="inline-flex flex-col gap-2 min-w-max">
          {/* Months */}
          <div className="flex h-4 relative">
            {monthLabels.map((m, i) => (
              <span 
                key={i} 
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: `${m.index * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            {/* Day Labels */}
            <div className="flex flex-col gap-1 pr-2 mt-1">
              <span className="h-2.5 text-[9px] text-muted-foreground leading-none flex items-center">Mon</span>
              <span className="h-2.5" />
              <span className="h-2.5 text-[9px] text-muted-foreground leading-none flex items-center">Wed</span>
              <span className="h-2.5" />
              <span className="h-2.5 text-[9px] text-muted-foreground leading-none flex items-center">Fri</span>
              <span className="h-2.5" />
            </div>

            {/* Grid */}
            <div className="flex gap-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      title={`${day.count} contributions on ${day.date}`}
                      className={cn(
                        "size-2.5 rounded-sm border transition-colors",
                        getColorClass(day.count)
                      )}
                    />
                  ))}
                  {/* Fill empty days for last week if needed */}
                  {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="size-2.5" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
