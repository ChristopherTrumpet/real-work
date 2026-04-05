'use client'

import React from 'react'
import { Star, ShieldCheck, Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    quote: "The only platform that actually tests your ability to handle production-scale disasters. Most 'labs' are just syntax tutorials; RealWork is an actual engineering range.",
    author: "Sarah Chen",
    role: "Staff Site Reliability Engineer",
    company: "CloudScale Systems",
    avatar: "SC",
    rating: 5
  },
  {
    quote: "We used these challenges to level up our junior devs on distributed systems. The isolation is perfect—they can break everything without affecting our actual infrastructure.",
    author: "Marcus Thorne",
    role: "VP of Engineering",
    company: "DataVanguard",
    avatar: "MT",
    rating: 5
  },
  {
    quote: "The GDB and network tracing labs are incredible. It's rare to find a browser-based environment that doesn't feel like a toy. This is professional-grade.",
    author: "Elena Rodriguez",
    role: "Backend Lead",
    company: "FintechFlow",
    avatar: "ER",
    rating: 5
  }
]

export function TestimonialsSection() {
  return (
    <section className="relative overflow-hidden bg-muted/20 py-24 md:py-32">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 text-center space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-primary">Peer Reviews</h2>
          <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Vetted by the <span className="text-muted-foreground italic font-serif">Front Lines</span>.
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div 
              key={i} 
              className="group relative flex flex-col justify-between rounded-3xl border border-border bg-card p-8 transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_1rem_3rem_-1rem_rgba(var(--primary),0.1)]"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex gap-0.5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <Quote className="size-8 text-primary/10 rotate-180" />
                </div>
                
                <p className="text-base leading-relaxed text-foreground/90 italic font-medium">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-bold text-muted-foreground">
                  {t.avatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-bold text-foreground">{t.author}</span>
                    <ShieldCheck className="size-3.5 text-primary shrink-0" title="Verified Engineer" />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.role} @ <span className="font-semibold text-primary/80">{t.company}</span>
                  </p>
                </div>
              </div>

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </section>
  )
}
