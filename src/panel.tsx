'use client'

import { SegmentedControl, useEditor } from '@pascal-app/editor'
import { useState } from 'react'
import { vanityPresets, type VanityPresetId } from './freestanding-vanity/presets'
import { setVanityPlacementPreset, useVanityPlacementPreset } from './freestanding-vanity/placement-settings'
import { FREESTANDING_VANITY, WALL_MOUNTED_VANITY, CORNER_VANITY } from './freestanding-vanity/schema'

type VanityKind = typeof FREESTANDING_VANITY | typeof WALL_MOUNTED_VANITY | typeof CORNER_VANITY

function VanityPreview({ design, wallMounted }: { design: VanityPresetId; wallMounted: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 88 64" className="h-12 w-16 shrink-0 text-foreground/85"
    fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="10" y="7" width="68" height="5" rx="1" fill="currentColor" fillOpacity="0.12" />
    {design === 'console' ? <>
      <rect x="14" y="12" width="60" height="14" rx="1" fill="currentColor" fillOpacity="0.05" />
      <path d={wallMounted ? 'M35 18h18M16 26v21m56-21v21M16 47h56v4H16z' : 'M35 18h18M16 26v30m56-30v30M16 47h56v4H16z'} />
    </> : <>
      <rect x="14" y="12" width="60" height="34" rx="1" fill="currentColor" fillOpacity="0.05" />
      {design === 'fluted' ? <>
        {Array.from({ length: 13 }, (_, index) => <path key={index} d={`M${18 + index * 4.3} 15v28`} strokeOpacity="0.45" />)}
        <path d="M44 12v34" />
        {!wallMounted && <path d="M19 46v9h50v-9" />}
        <circle cx="39" cy="25" r="1.5" fill="currentColor" /><circle cx="49" cy="25" r="1.5" fill="currentColor" />
      </> : <>
        <path d="M14 29h60" />
        {design === 'shaker' ? <>
          <path d="M19 16h50v9H19zM19 33h50v9H19zM36 20h16M36 37h16" />
          {!wallMounted && <path d="M17 46l2 10h3l1-10m42 0 1 10h3l2-10" />}
        </> : <><path d="M33 14h22M33 31h22" />{!wallMounted && <path d="M19 46v10m50-10v10" />}</>}
      </>}
    </>}
    {wallMounted && <path d="M10 58h68" strokeDasharray="2 3" strokeOpacity="0.35" />}
  </svg>
}

export default function BathSpacePanel() {
  const activeTool = useEditor((state) => state.tool)
  const setTool = useEditor((state) => state.setTool)
  const presetId = useVanityPlacementPreset()
  const [selectedKind, setSelectedKind] = useState<VanityKind>(FREESTANDING_VANITY)
  const placing = activeTool === FREESTANDING_VANITY || activeTool === WALL_MOUNTED_VANITY || activeTool === CORNER_VANITY
  const kind = placing ? activeTool as VanityKind : selectedKind
  const wallMounted = kind === WALL_MOUNTED_VANITY
  const corner = kind === CORNER_VANITY

  return (
    <div className="flex flex-col gap-4 p-4">
      <h2 className="text-sm font-semibold">Vanities</h2>

      <section className="flex flex-col gap-2">
        <SegmentedControl value={kind} options={[
          { label: 'Freestanding', value: FREESTANDING_VANITY },
          { label: 'Wall-mounted', value: WALL_MOUNTED_VANITY },
          { label: 'Corner', value: CORNER_VANITY },
        ]} onChange={(value) => {
          setSelectedKind(value)
          if (placing) setTool(value)
        }} />
        {corner ? <div className="flex items-center gap-3 rounded-md border-l-2 border-primary bg-primary/10 px-2 py-3">
          <svg aria-hidden="true" viewBox="0 0 88 64" className="h-12 w-16 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M44 7 13 30 24 51h40l11-21Z" fill="currentColor" fillOpacity="0.08" />
            <path d="M24 51v-8h40v8M44 43v8M39 46h2m6 0h2" />
          </svg>
          <span><span className="block text-xs font-medium">Angled front</span><span className="mt-1 block text-[11px] text-muted-foreground">Fits a 90° corner</span></span>
        </div> : <div role="radiogroup" aria-label="Vanity placement design" className="flex flex-col gap-1">
          {vanityPresets.map((preset, index) => {
            const selected = presetId === preset.id
            return <button key={preset.id} type="button" role="radio" aria-checked={selected}
              aria-label={preset.label} tabIndex={selected ? 0 : -1}
              onClick={() => setVanityPlacementPreset(preset.id)}
              onKeyDown={(event) => {
                const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1
                  : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0
                if (!direction && event.key !== 'Home' && event.key !== 'End') return
                event.preventDefault()
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? vanityPresets.length - 1
                  : (index + direction + vanityPresets.length) % vanityPresets.length
                setVanityPlacementPreset(vanityPresets[next]!.id)
                const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
                buttons?.[next]?.focus()
              }}
              className={`flex w-full items-center gap-2.5 rounded-md border-l-2 px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground'}`}>
              <VanityPreview design={preset.id} wallMounted={wallMounted} />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium">{preset.label}</span>
              </span>
              <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary' : 'border-border'}`}>
                {selected && <svg viewBox="0 0 16 16" className="h-3 w-3 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 8 3 3 5-6" /></svg>}
              </span>
            </button>
          })}
        </div>}
        <button
          type="button"
          onClick={() => setTool(placing ? null : kind)}
          aria-pressed={placing}
          className="mt-2 flex w-full items-center justify-between rounded-md bg-primary px-3 py-2.5 text-left text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span>{placing ? 'Stop placing' : 'Place vanity'}</span>
          <span aria-hidden="true">{placing ? '×' : '+'}</span>
        </button>
        {placing && <p role="status" className="text-[11px] leading-relaxed text-muted-foreground">
          {corner ? 'Click near a 90° corner.' : wallMounted ? 'Click a wall to place.' : 'Click to place.'} Esc to cancel.
        </p>}
      </section>
    </div>
  )
}
