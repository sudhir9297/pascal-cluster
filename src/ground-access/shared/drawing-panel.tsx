'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import type { CSSProperties } from 'react'
import { useDrawingStatus } from './drawing-session'
import { drawnAccessItemFor, type DrawnAccessKind } from './items'
import { drawingModes, type DrawingMode } from './drawing-mode'
import { circleSizePatch, isCurvedSurface } from './outline'

const field: CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'var(--background)',
  color: 'inherit', border: '1px solid var(--border)', borderRadius: 6, padding: 7, fontSize: 12 }

export function SurfaceDrawingPanel({ kind, minThickness = 0.03 }: {
  kind: DrawnAccessKind; minThickness?: number
}) {
  const item = drawnAccessItemFor(kind)!
  const active = useEditor((state) => state.tool === kind)
  const defaults = useEditor((state) => state.toolDefaults[kind])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const raw = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selected = !active && (raw?.type as string | undefined) === kind ? item.schema.parse(raw) : null
  const node = selected ?? item.schema.parse(defaults ?? {})
  const status = useDrawingStatus(kind)
  const update = (patch: { shape?: DrawingMode; width?: number; depth?: number; thickness?: number }) => {
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId,
      circleSizePatch(selected, patch) as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(kind, { ...useEditor.getState().toolDefaults[kind], ...patch })
  }
  const number = (key: 'width' | 'depth' | 'thickness', title: string, min: number, max: number) =>
    <label style={{ display: 'block', fontSize: 12, marginTop: 10 }}>{title}
      <input type="number" style={{ ...field, marginTop: 4 }} min={min} max={max} step={0.01}
        value={node[key]} onChange={(event) => {
          const value = event.currentTarget.valueAsNumber
          if (Number.isFinite(value) && value >= min && value <= max) update({ [key]: value })
        }} />
    </label>
  return <section aria-label={`${item.label} settings`} style={{ marginTop: 20 }}>
    <h3 style={{ fontSize: 14, margin: '0 0 5px' }}>{selected ? `Selected ${item.label.toLowerCase()}` : `New ${item.label.toLowerCase()} settings`}</h3>
    {!selected && <>
      <div style={{ fontSize: 12, margin: '12px 0 6px' }}>Drawing mode</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
        {drawingModes.map((shape) =>
          <button key={shape} type="button" aria-pressed={node.shape === shape}
            onClick={() => update({ shape })}
            style={{ ...field, cursor: 'pointer',
              borderColor: node.shape === shape ? '#818cf8' : 'var(--border)',
              textTransform: 'capitalize' }}>{shape}</button>)}
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Press T to switch modes. Rectangle: two corners. Custom: click points, then Enter. Freehand: drag a loop. Circle: click center, then radius. Oval: click opposite bounds.
      </p>
      {active && status.message && <p role="status" style={{ fontSize: 11, color: '#dc6b61' }}>{status.message}</p>}
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Width and depth come from the outline you draw.</p>
    </>}
    {selected && <>
      {node.shape === 'freehand' && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Drag the larger dots to reshape. Drag purple handles to bend or smooth the curve. Click a midpoint dot to add a point.
      </p>}
      {node.shape !== 'freehand' && !isCurvedSurface(node.shape) && <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Drag corner dots to reshape. Drag midpoint dots to add corners, or drag an edge to extend it. Double-click a floor plan corner to remove it.
      </p>}
      {number('width', node.shape === 'circle' ? 'Diameter (m)' : 'Width (m)', 0.2, 30)}
      {node.shape !== 'circle' && number('depth', 'Depth (m)', 0.2, 30)}
    </>}
    {number('thickness', kind === 'landscape:deck' ? 'Height (m)' : 'Thickness (m)', minThickness, 2)}
  </section>
}
