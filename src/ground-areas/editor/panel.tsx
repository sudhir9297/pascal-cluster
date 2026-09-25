'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState, type CSSProperties } from 'react'
import { ellipseBounds, ellipseOutline, isEllipseShape } from '../domain/ellipse'
import { GROUND_AREA_KIND, GROUND_SURFACES, GroundAreaNode, type GroundSurface } from '../domain/schema'
import { groundAreaDrawingMode } from './drawing-mode'

const field: CSSProperties = {
  width: '100%',
  minWidth: 0,
  background: 'var(--background)',
  color: 'inherit',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '8px',
  fontSize: 12,
}
const surfaces: { value: GroundSurface; label: string; color: string }[] = [
  { value: 'grass', label: 'Grass', color: '#718451' },
  { value: 'soil', label: 'Soil', color: '#5b5841' },
  { value: 'mulch', label: 'Mulch', color: '#76523b' },
  { value: 'gravel', label: 'Gravel', color: '#918f83' },
  { value: 'sand', label: 'Sand', color: '#cbb78d' },
  { value: 'mud', label: 'Mud', color: '#614533' },
]
export function GroundAreaPanel() {
  const levelId = useViewer((state) => state.selection.levelId)
  const active = useEditor((state) => state.tool === GROUND_AREA_KIND)
  const defaults = useEditor((state) => state.toolDefaults[GROUND_AREA_KIND])
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const selectedRaw = useScene((state) => selectedId ? state.nodes[selectedId as AnyNodeId] : undefined)
  const selected = !active && (selectedRaw?.type as string | undefined) === GROUND_AREA_KIND
    ? GroundAreaNode.parse(selectedRaw) : null
  const selectedBounds = selected && isEllipseShape(selected.shape) && selected.outline.length >= 3
    ? ellipseBounds(selected.outline) : null
  const [surface, setSurface] = useState<GroundSurface>(() =>
    GROUND_SURFACES.find((value) => value === defaults?.surface) ?? 'grass',
  )
  const start = (nextSurface: GroundSurface) => {
    if (!levelId) return
    setSurface(nextSurface)
    const editor = useEditor.getState()
    editor.setToolDefaults(GROUND_AREA_KIND, { surface: nextSurface, shape: groundAreaDrawingMode() })
    editor.setMode('build')
    editor.setTool(GROUND_AREA_KIND)
  }
  const resizeSelected = (key: 'width' | 'depth', value: number) => {
    if (!selected || !selectedBounds || !Number.isFinite(value) || value < 0.2 || value > 500) return
    const width = selected.shape === 'circle' ? value : key === 'width' ? value : selectedBounds.width
    const depth = selected.shape === 'circle' ? value : key === 'depth' ? value : selectedBounds.depth
    useScene.getState().updateNode(selected.id as AnyNodeId,
      { outline: ellipseOutline(selectedBounds.center, width / 2, depth / 2) } as Partial<AnyNode>)
  }
  return (
    <section aria-label="Ground areas">
      <div aria-label="Ground surface" role="group">
        <div style={{ fontSize: 12, marginBottom: 7, fontWeight: 600 }}>Choose a surface to draw</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {surfaces.map((item) => (
            <button
              type="button"
              key={item.value}
              disabled={!levelId || active}
              aria-pressed={surface === item.value}
              onClick={() => start(item.value)}
              style={{
                ...field,
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                minHeight: 42,
                borderColor: surface === item.value ? '#56745a' : 'var(--border)',
                background: surface === item.value ? 'var(--secondary)' : 'transparent',
                cursor: levelId && !active ? 'pointer' : 'default',
                opacity: levelId ? 1 : 0.5,
                textAlign: 'left',
              }}
            >
              <span aria-hidden="true" style={{ width: 18, height: 18, flex: '0 0 18px', borderRadius: 4, background: item.color, border: '1px solid var(--border)' }} />
              <span style={{ fontWeight: 600 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      {selected?.shape === 'freehand' && <p style={{ fontSize: 12, marginTop: 16 }}>
        Drag the larger dots to reshape. Drag purple handles to bend or smooth the curve. Click a midpoint dot to add a point.
      </p>}
      {selectedBounds && selected && <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>Selected {selected.surface} size</div>
        {(['width', 'depth'] as const).filter((key) => selected.shape !== 'circle' || key === 'width')
          .map((key) => <label key={key} style={{ display: 'block', fontSize: 12, marginTop: 8 }}>
            {selected.shape === 'circle' ? 'Diameter (m)' : key === 'width' ? 'Width (m)' : 'Depth (m)'}
            <input type="number" min={0.2} max={500} step={0.1} style={{ ...field, marginTop: 4 }}
              value={Number(selectedBounds[key].toFixed(2))}
              onChange={(event) => resizeSelected(key, event.currentTarget.valueAsNumber)} />
          </label>)}
      </div>}
    </section>
  )
}
