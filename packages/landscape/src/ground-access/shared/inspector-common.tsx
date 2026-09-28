'use client'

import { useState } from 'react'

export type InspectorTab = 'properties' | 'materials' | 'notes'

export function useInspectorTab() {
  return useState<InspectorTab>('properties')
}

export function InspectorTabBar({ value, onChange, label, tabs = ['properties', 'materials', 'notes'] }: {
  value: InspectorTab; onChange: (tab: InspectorTab) => void; label: string; tabs?: InspectorTab[]
}) {
  return <div role="tablist" aria-label={label} className={`mb-3 grid ${tabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} rounded-lg bg-secondary/70 p-1`}>
    {tabs.map((tab) => <button key={tab} type="button" role="tab"
      aria-selected={value === tab} onClick={() => onChange(tab)}
      className={`rounded-md px-2 py-1.5 text-xs capitalize transition-colors ${value === tab
        ? 'bg-primary/20 font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
      {tab}
    </button>)}
  </div>
}

export function InspectorFieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] font-medium text-muted-foreground">{children}</div>
}

export function InspectorChoice({ selected, onClick, label, children }: {
  selected: boolean; onClick: () => void; label: string; children: React.ReactNode
}) {
  return <button type="button" aria-label={label} aria-pressed={selected} onClick={onClick}
    className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left transition-colors ${selected
      ? 'border-primary/70 bg-primary/10 ring-1 ring-primary/30'
      : 'border-border/70 bg-secondary/40 hover:bg-accent/40'}`}>
    {children}
  </button>
}

export function InspectorSwatch({ color, direction = 'horizontal' }: {
  color: string; direction?: 'horizontal' | 'vertical' | 'diagonal'
}) {
  const strokes = direction === 'vertical' ? 'M18 0v44M36 0v44M54 0v44' :
    direction === 'diagonal' ? 'M-5 44 25 0M15 44 45 0M35 44 65 0M55 44 85 0' : 'M0 12h72M0 24h72M0 36h72'
  return <svg aria-hidden="true" viewBox="0 0 72 44" className="h-10 w-[68px] shrink-0 rounded-md border border-white/10">
    <rect width="72" height="44" fill={color} />
    <path d={strokes} fill="none" stroke="rgba(35,27,20,.42)" strokeWidth="1.5" />
  </svg>
}

export function InspectorNotes({ item }: { item: string }) {
  const [note, setNote] = useState('')
  return <div className="flex flex-col gap-2">
    <InspectorFieldLabel>Notes</InspectorFieldLabel>
    <textarea value={note} onChange={(event) => setNote(event.currentTarget.value)} rows={5}
      placeholder={`Add a note about this ${item}…`} aria-label={`${item} notes`}
      className="resize-y rounded-lg border border-border/70 bg-secondary/40 p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60" />
    <p className="text-[10px] text-muted-foreground">Notes are a temporary preview and won’t be saved to the scene.</p>
  </div>
}

export function InspectorDeleteButton({ item, onDelete }: { item: string; onDelete: () => void }) {
  return <button type="button" aria-label={`Delete ${item}`} title={`Delete ${item}`} onClick={onDelete}
    className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive">
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3" />
    </svg>
  </button>
}
