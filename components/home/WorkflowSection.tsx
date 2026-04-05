'use client'

import React from 'react'
import { Terminal, Shield, Rocket, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  {
    title: "Select Your Lab",
    description: "Choose from a curated library of real-world scenarios. From distributed systems to cryptic memory leaks.",
    icon: Terminal,
    code: "$ realwork list --difficulty hard\n> [1] Distributed Consensus Failure\n> [2] Async Deadlock in Production\n> [3] Network Partition Simulation",
    color: "text-blue-500"
  },
  {
    title: "Isolated Execution",
    description: "Launch a disposable, dedicated Linux environment in seconds. Complete with VS Code and deep system access.",
    icon: Shield,
    code: "$ realwork launch --lab async-deadlock\n> Provisioning isolated kernel...\n> Mounting root filesystem [OK]\n> Attaching VS Code server [OK]\n> Workspace ready at :3000",
    color: "text-emerald-500"
  },
  {
    title: "Debug & Resolve",
    description: "Use the same tools you use in production. Inspect logs, trace packets, and patch the codebase in real-time.",
    icon: Rocket,
    code: "$ gdb ./server core.dump\n> (gdb) bt\n> #0 0x00007f... in notify_ready()\n> #1 0x00007f... in start_cluster()\n> Patch applied. Services resuming...",
    color: "text-amber-500"
  },
  {
    title: "Validate Performance",
    description: "Run automated benchmarks against your fix. Prove your solution works under load and earn your stripes.",
    icon: CheckCircle2,
    code: "$ realwork evaluate --lab async-deadlock\n> Running gold-standard tests...\n> [PASS] Latency < 50ms\n> [PASS] Throughput > 10k req/s\n> Challenge Complete. Rating: +50 XP",
    color: "text-primary"
  }
]

export function WorkflowSection() {
  return (
    <section className="relative bg-background py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
          
          {/* Left: Text Content */}
          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-primary">The Workflow</h2>
              <h3 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Engineered for the <span className="text-muted-foreground italic font-serif">Deep Dive</span>.
              </h3>
            </div>

            <div className="space-y-10">
              {STEPS.map((step, i) => (
                <div key={i} className="group relative flex gap-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_1rem_-0.25rem_rgba(var(--primary),0.2)]">
                    <step.icon className={cn("size-5 transition-colors", step.color)} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-foreground">{step.title}</h4>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Mock Terminal */}
          <div className="relative lg:pl-10">
            <div className="relative rounded-2xl border border-border bg-zinc-950 p-1 shadow-2xl shadow-primary/5">
              {/* Terminal Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="size-2.5 rounded-full bg-rose-500/50" />
                  <div className="size-2.5 rounded-full bg-amber-500/50" />
                  <div className="size-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <div className="ml-4 flex items-center gap-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">
                  <Terminal className="size-3" />
                  realwork-cli — bash
                </div>
              </div>

              {/* Terminal Content */}
              <div className="p-6 h-[400px] overflow-hidden font-mono text-xs leading-relaxed sm:text-sm">
                <div className="space-y-8">
                  {STEPS.map((step, i) => (
                    <div key={i} className="animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ animationDelay: `${i * 200}ms` }}>
                      <div className="whitespace-pre text-emerald-400 opacity-80">
                        {step.code}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decorative Reflection */}
              <div className="absolute inset-0 pointer-events-none rounded-2xl bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent" />
            </div>

            {/* Background Glow */}
            <div className="absolute -inset-4 -z-10 bg-primary/10 opacity-20 blur-3xl rounded-[3rem]" />
          </div>
        </div>
      </div>
    </section>
  )
}
