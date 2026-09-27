'use client'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { SliderControl, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState } from 'react'
import { ellipseBounds, ellipseOutline, isEllipseShape } from '../domain/ellipse'
import { GROUND_AREA_KIND, GROUND_SURFACES, GroundAreaNode, type GroundSurface } from '../domain/schema'
import { groundAreaDrawingMode, setGroundAreaDrawingMode } from './drawing-mode'
import { DrawingModeControl } from '../../ground-access/shared/drawing-mode-control'
import { GROUND_SURFACE_THUMBNAILS } from '../../editor/catalog-thumbnails'
import { CatalogListRow } from '../../editor/catalog-list-row'

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
  const resizeLabel = (key: 'width' | 'depth') => selected?.shape === 'circle'
    ? 'Diameter' : key === 'width' ? 'Width' : 'Depth'
  return (
    <section aria-label="Ground areas">
      {!selected && <div className="mb-3">
        <div className="mb-1.5 text-xs font-medium">Drawing mode</div>
        <DrawingModeControl value={groundAreaDrawingMode()} onChange={setGroundAreaDrawingMode} />
      </div>}
      <div aria-label="Ground surface" role="group" className="flex flex-col">
        {surfaces.map((item) => <CatalogListRow key={item.value} label={item.label} disabled={!levelId}
          active={surface === item.value} onClick={() => start(item.value)}
          thumbnail={<img src={GROUND_SURFACE_THUMBNAILS[item.value]} alt="" width={36} height={36}
            style={{ width: 36, height: 36, flex: '0 0 36px', objectFit: 'cover', borderRadius: 4,
              border: '1px solid color-mix(in srgb, var(--foreground) 15%, transparent)' }} />} />)}
      </div>
      {selected?.shape === 'freehand' && <p className="mt-3 text-xs text-muted-foreground">
        Drag orange points to reshape, purple handles to bend curves, and green dots to add points.
      </p>}
      {selectedBounds && selected && <div className="mt-3 flex flex-col gap-1.5">
        {(['width', 'depth'] as const).filter((key) => selected.shape !== 'circle' || key === 'width')
          .map((key) => <SliderControl key={key} label={resizeLabel(key)} min={0.2} max={500} step={0.1} precision={2} unit="m"
            value={Number(selectedBounds[key].toFixed(2))} onChange={(value) => resizeSelected(key, value)} />)}
      </div>}
    </section>
  )
}
