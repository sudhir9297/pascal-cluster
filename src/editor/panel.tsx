'use client'

import { useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEffect, useMemo, useState } from 'react'
import { useEditor } from '@pascal-app/editor'
import { PoolShellSettings } from './shell-settings'
import { PoolSystemsPanel } from './systems-panel'
import { PoolReviewPanel } from './review-panel'
import { getSelectedPool } from './pool-selection'
import { planPoolFittings } from '../design/pool-fitting-layout'

export default function PoolPanel() {
  const [step, setStep] = useState<'shell' | 'systems' | 'review'>('shell')
  const selectedIds = useViewer((state) => state.selection.selectedIds)
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const pool = useScene((state) => getSelectedPool(state.nodes, selectedIds))
  const poolPlan = useMemo(() => pool ? planPoolFittings(pool) : null, [pool])
  const activeLevelName = useScene((state) => {
    const level = activeLevelId ? state.nodes[activeLevelId] : null
    if (!level || level.type !== 'level') return null
    return level.name || (level.level === 0 ? 'Ground floor' : `Level ${level.level}`)
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Alt' || event.repeat || event.metaKey || event.ctrlKey || event.shiftKey) return
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return
      event.preventDefault()
      useEditor.getState().cycleRotationAxis()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-sidebar-foreground">
      <header className="flex shrink-0 flex-col gap-3 border-b border-sidebar-border/70 px-3 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-base">Pool design</h2>
            {pool && <p className="mt-0.5 truncate text-[11px] text-sidebar-foreground/55">
              {(pool as { name?: string }).name || 'Swimming pool'} · {pool.shape.replaceAll('-', ' ')} · {pool.shape === 'circle' ? `Ø ${pool.length.toFixed(2)} m` : `${pool.length.toFixed(2)} × ${pool.width.toFixed(2)} m`}{poolPlan ? ` · ${poolPlan.volume.toFixed(1)} m³` : ''}
            </p>}
          </div>
          <span className="shrink-0 rounded-full bg-sidebar-accent/60 px-2.5 py-1 text-[11px] text-sidebar-foreground/70">
            <span aria-hidden="true" className={`mr-1.5 inline-block size-1.5 rounded-full ${activeLevelName ? 'bg-emerald-400' : 'bg-sidebar-foreground/35'}`} />
            {activeLevelName ? `Placed · ${activeLevelName}` : 'No floor selected'}
          </span>
        </div>
        <div aria-label="Pool design steps" className="grid grid-cols-3 rounded-xl bg-sidebar-accent/30 p-1" role="tablist">
          <button aria-selected={step === 'shell'} className={`min-h-9 rounded-lg px-2 text-xs font-medium transition-colors ${step === 'shell' ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-foreground/35' : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`} onClick={() => setStep('shell')} role="tab" type="button">
            Shell
          </button>
          <button aria-selected={step === 'systems'} className={`min-h-9 rounded-lg px-2 text-xs font-medium transition-colors ${step === 'systems' ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-foreground/35' : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`} onClick={() => setStep('systems')} role="tab" type="button">
            Systems
          </button>
          <button aria-selected={step === 'review'} className={`min-h-9 rounded-lg px-2 text-xs font-medium transition-colors ${step === 'review' ? 'bg-sidebar-accent text-sidebar-foreground shadow-sm ring-1 ring-sidebar-foreground/35' : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`} onClick={() => setStep('review')} role="tab" type="button">
            Review
          </button>
        </div>
      </header>
      {step === 'shell' ? <PoolShellSettings /> : step === 'systems' ? <PoolSystemsPanel /> : <PoolReviewPanel onOpenSystems={() => setStep('systems')} />}
      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-sidebar-border bg-sidebar px-3 py-2.5">
        {step === 'shell' ? <span className="text-[11px] text-sidebar-foreground/45">Shell design</span> : <button className="min-h-9 rounded-lg px-3 text-xs text-sidebar-foreground/65 hover:bg-sidebar-accent/50" onClick={() => setStep(step === 'review' ? 'systems' : 'shell')} type="button">← {step === 'review' ? 'Systems' : 'Shell'}</button>}
        {step !== 'review' && <button className="min-h-9 rounded-lg bg-sidebar-accent px-3 text-xs font-medium hover:bg-sidebar-accent/80 active:scale-[0.98]" onClick={() => setStep(step === 'shell' ? 'systems' : 'review')} type="button">
          Continue to {step === 'shell' ? 'systems' : 'review'} →
        </button>}
      </footer>
    </div>
  )
}
