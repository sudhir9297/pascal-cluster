'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import type { CSSProperties } from 'react'
import { SurfaceDrawingPanel } from '../../shared/drawing-panel'
import { deckMinimumHeight } from '../domain/settings'
import { DECK_KIND, DeckNode } from '../domain/schema'

const input: CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--background)',
  color: 'inherit', border: '1px solid var(--border)', borderRadius: 6, padding: 7, fontSize: 12 }
const label: CSSProperties = { display: 'block', fontSize: 12, marginTop: 10 }

export function DeckPanel() {
  const placing = useEditor((state) => state.tool === DECK_KIND)
  const defaults = useEditor((state) => state.toolDefaults[DECK_KIND])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const raw = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selected = !placing && (raw?.type as string | undefined) === DECK_KIND ? DeckNode.parse(raw) : null
  const node = selected ?? DeckNode.parse(defaults ?? {})
  const update = (patch: Partial<DeckNode>) => {
    const next = { ...patch }
    if (patch.boardThickness !== undefined || patch.frameDepth !== undefined ||
        patch.skirtStyle !== undefined)
      next.thickness = Math.max(node.thickness, deckMinimumHeight({ ...node, ...patch }))
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId, next as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(DECK_KIND, { ...useEditor.getState().toolDefaults[DECK_KIND], ...next })
  }
  const choose = <K extends 'deckType' | 'boardDirection' | 'borderStyle' | 'skirtStyle'>(
    key: K, title: string, options: readonly { value: DeckNode[K]; label: string }[]) =>
    <label style={label}>{title}
      <select value={node[key]} style={{ ...input, marginTop: 4 }} onChange={(event) => {
        const value = event.currentTarget.value as DeckNode[K]
        if (key === 'deckType') {
          const raised = value === 'raised'
          update({ deckType: value as DeckNode['deckType'],
            thickness: Math.max(deckMinimumHeight({ ...node, deckType: value as DeckNode['deckType'] }),
              raised ? Math.max(node.thickness, 1.2) : Math.min(node.thickness, 0.45)),
            supportPosts: raised })
        } else update({ [key]: value })
      }}>
        {options.map((option) => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}
      </select>
    </label>
  const number = (key: 'boardWidth' | 'boardGap' | 'boardThickness' | 'frameDepth' |
    'supportSpacing' | 'postSize',
    title: string, min: number, max: number, step: number) =>
    <label style={label}>{title}
      <input type="number" style={{ ...input, marginTop: 4 }} value={node[key]}
        min={min} max={max} step={step} onChange={(event) => {
          const value = event.currentTarget.valueAsNumber
          if (Number.isFinite(value) && value >= min && value <= max) update({ [key]: value })
        }} />
    </label>
  const toggle = (key: 'fascia' | 'supportPosts', title: string) =>
    <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}>
      <input type="checkbox" checked={node[key]} onChange={(event) => update({ [key]: event.currentTarget.checked })} />
      {title}
    </label>
  return <>
    <SurfaceDrawingPanel kind={DECK_KIND} minThickness={deckMinimumHeight(node)} />
    <section aria-label="Deck design settings" style={{ marginTop: 20 }}>
      <h3 style={{ fontSize: 14, margin: '0 0 5px' }}>Deck design</h3>
      {choose('deckType', 'Deck type', [
        { value: 'platform', label: 'Low platform' }, { value: 'raised', label: 'Raised deck' },
      ])}
      {choose('boardDirection', 'Board direction', [
        { value: 'lengthwise', label: 'Along depth' }, { value: 'crosswise', label: 'Along width' },
        { value: 'diagonal', label: 'Diagonal 45°' },
      ])}
      {number('boardWidth', 'Board width (m)', 0.09, 0.25, 0.005)}
      {number('boardGap', 'Board gap (m)', 0.003, 0.025, 0.001)}
      {number('boardThickness', 'Board thickness (m)', 0.018, 0.06, 0.002)}

      <h4 style={{ fontSize: 12, margin: '20px 0 0' }}>Edges</h4>
      {choose('borderStyle', 'Picture frame border', [
        { value: 'none', label: 'None' }, { value: 'single', label: 'One board' },
        { value: 'double', label: 'Two boards' },
      ])}
      {toggle('fascia', 'Show fascia on the rim')}
      {choose('skirtStyle', 'Under-deck skirting', [
        { value: 'none', label: 'Open' }, { value: 'solid', label: 'Solid' },
        { value: 'slatted', label: 'Vertical slats' },
      ])}

      <h4 style={{ fontSize: 12, margin: '20px 0 0' }}>Frame and supports</h4>
      {number('frameDepth', 'Frame depth (m)', 0.08, 0.4, 0.01)}
      {node.deckType === 'raised' && <>
        {toggle('supportPosts', 'Individual support posts (off: solid base)')}
        {node.supportPosts && <>
          {number('supportSpacing', 'Post spacing (m)', 0.8, 4, 0.1)}
          {number('postSize', 'Post width (m)', 0.07, 0.25, 0.01)}
        </>}
      </>}

    </section>
  </>
}
