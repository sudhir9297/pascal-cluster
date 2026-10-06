'use client'

import { getLevelDisplayName, useScene } from '@pascal-app/core'
import { exportFloorplanPdf, exportSheetsToPdf, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState } from 'react'
import { PanelButton, PanelSelect, ToggleControl } from '../inspector-controls'
import CoordinatedFinishesPanel from './coordinated-finishes-panel'
import { fixtureCsv, fixtureInventory } from './inventory'
import { fixtureInventoryPages } from './inventory-pages'

export default function FixtureSchedulePanel() {
  const nodes = useScene(state => state.nodes)
  const materials = useScene(state => state.materials)
  const selectedIds = useViewer(state => state.selection.selectedIds)
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('all')
  const [includeHidden, setIncludeHidden] = useState(true)
  const [busy, setBusy] = useState<'inventory' | 'plans' | null>(null)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const inventory = fixtureInventory(nodes, materials)
  const levels = Object.values(nodes).filter(node => node.type === 'level')
  const effectiveLevel = level === 'all' || levels.some(node => node.id === level) ? level : 'all'
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const rows = inventory.filter(row => (effectiveLevel === 'all' || row.levelId === effectiveLevel)
    && (includeHidden || !row.hidden)
    && words.every(word => `${row.label} ${row.kind} ${row.level} ${row.finishes}`.toLowerCase().includes(word)))
  const pdf = async (kind: 'inventory' | 'plans') => {
    setBusy(kind); setMessage(''); setFailed(false)
    try {
      if (kind === 'inventory') await exportSheetsToPdf(fixtureInventoryPages(rows), 'bathroom-inventory.pdf', 'Bathroom inventory')
      else await exportFloorplanPdf('full')
      setMessage('PDF exported. Check your downloads.')
    } catch { setFailed(true); setMessage('PDF export failed. Try again.') }
    finally { setBusy(null) }
  }
  const csv = () => {
    const url = URL.createObjectURL(new Blob(['\uFEFF' + fixtureCsv(rows)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'bathroom-inventory.csv'
    document.body.append(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setFailed(false); setMessage('CSV exported. Check your downloads.')
  }
  return <section aria-label="Bathroom inventory" className="space-y-3 pt-3">
    <input type="search" aria-label="Search inventory" placeholder="Search inventory" value={query}
      onChange={event => setQuery(event.currentTarget.value)}
      className="h-9 w-full rounded-md border border-border bg-secondary px-3 text-xs focus-visible:outline-2 focus-visible:outline-ring" />
    <details className="rounded-md border border-border p-2">
      <summary className="cursor-pointer text-xs font-medium">Filters</summary>
      <div className="space-y-2 pt-2">
        <label className="block text-xs text-muted-foreground">Floor
          <PanelSelect aria-label="Inventory floor" value={effectiveLevel} onChange={event => setLevel(event.currentTarget.value)}>
            <option value="all">All floors</option>
            {levels.map(node => <option key={node.id} value={node.id}>{getLevelDisplayName(node)}</option>)}
          </PanelSelect>
        </label>
        <ToggleControl label="Include hidden fixtures" checked={includeHidden} onChange={setIncludeHidden} />
      </div>
    </details>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h3 className="text-xs font-semibold">Fixtures</h3>
      <span role="status" className="text-xs text-muted-foreground">{rows.length} of {inventory.length}</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      <PanelButton disabled={!rows.length || busy !== null} onClick={() => pdf('inventory')}>{busy === 'inventory' ? 'Exporting…' : 'Export PDF'}</PanelButton>
      <PanelButton disabled={!rows.length || busy !== null} onClick={csv}>Export CSV</PanelButton>
    </div>
    <PanelButton className="w-full" disabled={!levels.length || busy !== null} onClick={() => pdf('plans')}>
      {busy === 'plans' ? 'Exporting…' : 'Export project plans PDF'}
    </PanelButton>
    {message && <p role={failed ? 'alert' : 'status'} className={`text-xs ${failed ? 'text-destructive' : 'text-muted-foreground'}`}>{message}</p>}
    {!rows.length ? <p className="py-4 text-center text-xs text-muted-foreground">{inventory.length ? 'No matching fixtures.' : 'Place fixtures to build your inventory.'}</p>
      : <ul className="space-y-2">{rows.map(row => <li key={row.id}>
        <button type="button" aria-pressed={selectedIds.includes(row.id)} title={row.label}
          className="w-full rounded-md border border-border text-left text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
          style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12,
            background: selectedIds.includes(row.id) ? 'var(--accent)' : 'transparent',
            borderColor: selectedIds.includes(row.id) ? 'var(--muted-foreground)' : 'var(--border)' }}
          onClick={() => {
            const editor = useEditor.getState()
            editor.setTool(null); editor.setMode('select'); editor.setPhase('furnish')
            useViewer.getState().setSelection({ buildingId: row.buildingId, levelId: row.levelId, zoneId: null, selectedIds: [row.id] })
          }}>
          <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span className="text-xs font-medium" style={{ minWidth: 0, overflowWrap: 'anywhere', textTransform: 'capitalize' }}>{row.label}</span>
            <span className="text-[11px] text-muted-foreground" style={{ flexShrink: 0 }}>{row.level}</span>
          </span>
          {row.dimensions && <span className="text-[11px] tabular-nums text-muted-foreground" style={{ lineHeight: '16px', overflowWrap: 'anywhere' }}>
            {row.dimensions.split(' · ').map(value => value.replace(/^([LWDH]) /, (_, key: string) =>
              `${({ L: 'Length', W: 'Width', D: 'Depth', H: 'Height' } as Record<string, string>)[key]} `) + ' mm').join(' · ')}
          </span>}
          {row.finishes && <span className="break-words text-[11px] text-muted-foreground">{row.finishes}</span>}
          {row.hidden && <span className="text-[11px] text-muted-foreground">Hidden</span>}
        </button>
      </li>)}</ul>}
    <details className="border-t border-border pt-2">
      <summary className="cursor-pointer text-xs font-medium">Coordinate finishes</summary>
      <div className="pt-2"><CoordinatedFinishesPanel /></div>
    </details>
  </section>
}
