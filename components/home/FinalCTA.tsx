'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-24 md:py-40">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-zinc-950">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 mb-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">System Online</span>
        </div>

        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl mb-8">
          Ready to <span className="text-primary italic font-serif">Break</span> something?
        </h2>
        
        <p className="mx-auto max-w-xl text-lg text-zinc-400 mb-12 leading-relaxed">
          Join thousands of engineers mastering the stack through clinical destruction and reconstruction.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/library"
            className="group inline-flex h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-primary px-10 text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-[0_0_2rem_-0.5rem_rgba(var(--primary),0.5)]"
          >
            Enter the Library
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
          
          <Link
            href="/login"
            className="inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-full border border-white/10 bg-white/5 px-10 text-base font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/20 active:scale-95"
          >
            Create Account
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 border-t border-white/5">
          {[
            { label: "Uptime", value: "99.9%" },
            { label: "Labs", value: "500+" },
            { label: "Engineers", value: "12k+" },
            { label: "Solves", value: "85k+" }
          ].map((stat, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{stat.label}</p>
              <p className="text-xl font-mono font-bold text-zinc-200">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Decorative Gradient Line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  )
}
