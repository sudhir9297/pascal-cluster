'use client'
import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { useScene } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState, type CSSProperties } from 'react'
import { pergolaDimensions } from '../../../pergola/domain/layout'
import { PergolaNode, PERGOLA_KIND } from '../../../pergola/domain/schema'
import { PatioNode, PATIO_KIND } from '../domain/schema'
import { finishColor } from '../rendering/geometry'
import { useDrawingStatus } from '../../shared/drawing-session'
import { drawingModes } from '../../shared/drawing-mode'
import { circleSizePatch, isCurvedSurface } from '../../shared/outline'

const input: CSSProperties = {
  width: '100%', minWidth: 0, boxSizing: 'border-box', background: 'var(--background)',
  color: 'inherit', border: '1px solid var(--border)', borderRadius: 6, padding: '7px', fontSize: 12,
}
const label: CSSProperties = { display: 'block', fontSize: 12, marginTop: 10 }

export function PatioPanel() {
  const levelId = useViewer((state) => state.selection.levelId)
  const selectedId = useViewer((state) => state.selection.selectedIds.length === 1
    ? state.selection.selectedIds[0] : undefined)
  const placing = useEditor((state) => state.tool === PATIO_KIND)
  const nodes = useScene((state) => state.nodes)
  const selected = !placing && selectedId && (nodes[selectedId as AnyNodeId]?.type as string) === PATIO_KIND
    ? PatioNode.parse(nodes[selectedId as AnyNodeId]) : null
  const defaults = useEditor((state) => state.toolDefaults[PATIO_KIND])
  const patio = selected ?? PatioNode.parse(defaults ?? {})
  const drawingStatus = useDrawingStatus(PATIO_KIND)
  const [margin, setMargin] = useState(0.45)
  const [pergolaId, setPergolaId] = useState('')
  const pergolas = Object.values(nodes).filter((node) =>
    (node.type as string) === PERGOLA_KIND && node.parentId === levelId && node.visible !== false)
  const chosen = pergolas.find((node) => node.id === pergolaId) ?? pergolas[0]
  const fitDimensions = chosen ? pergolaDimensions(PergolaNode.parse(chosen)) : null
  const fitTooLarge = fitDimensions !== null &&
    (fitDimensions[0] + 2 * margin > 30 || fitDimensions[2] + 2 * margin > 30)
  const update = (patch: Partial<PatioNode>) => {
    if (selected) useScene.getState().updateNode(selected.id as AnyNodeId,
      circleSizePatch(selected, patch) as Partial<AnyNode>)
    else useEditor.getState().setToolDefaults(PATIO_KIND, {
      ...useEditor.getState().toolDefaults[PATIO_KIND], ...patch,
    })
  }
  const number = (key: 'width' | 'depth' | 'thickness' | 'elevation' | 'slopePercent' | 'paverWidth' | 'paverDepth' | 'jointWidth' | 'borderWidth',
    title: string, min: number, max: number, step: number) =>
    <label style={label}>{title}
      <input style={{ ...input, marginTop: 4 }} type="number" min={min} max={max} step={step}
        value={patio[key]} onChange={(event) => {
          const value = event.currentTarget.valueAsNumber
          if (Number.isFinite(value) && value >= min && value <= max) update({ [key]: value })
        }} />
    </label>
  const select = <K extends 'finish' | 'pattern' | 'borderStyle' | 'drainDirection'>(key: K, title: string,
    options: readonly { value: PatioNode[K]; label: string }[]) =>
    <label style={label}>{title}
      <select style={{ ...input, marginTop: 4 }} value={patio[key]}
        onChange={(event) => {
          const value = event.currentTarget.value as PatioNode[K]
          if (key === 'finish') {
            const previous = finishColor[patio.finish]
            update({ finish: value as PatioNode['finish'],
              fieldColor: patio.fieldColor === previous ? finishColor[value as PatioNode['finish']] : patio.fieldColor })
          } else update({ [key]: value })
        }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  const fit = () => {
    if (!chosen || !levelId) return
    const pergola = PergolaNode.parse(chosen)
    const [pergolaWidth, , pergolaDepth] = pergolaDimensions(pergola)
    const width = pergolaWidth + 2 * margin
    const depth = pergolaDepth + 2 * margin
    if (width > 30 || depth > 30) return
    const position: [number, number, number] = [
      pergola.position[0], pergola.position[1] - patio.thickness - Math.min(0.045, patio.thickness / 3) + 0.02,
      pergola.position[2],
    ]
    const patch = { width, depth, position, rotation: pergola.rotation, elevation: 0, slopePercent: 0,
      shape: 'rectangle' as const, outline: [] }
    if (selected) update(patch)
    else {
      const { id: _id, ...fields } = PatioNode.parse({ ...patio, ...patch, name: `Patio for ${pergola.name}` })
      const placed = PatioNode.parse(fields)
      useScene.getState().createNode(placed as unknown as AnyNode, levelId as AnyNodeId)
      useViewer.getState().setSelection({ selectedIds: [placed.id] })
      useEditor.getState().setTool(null)
      useEditor.getState().setMode('select')
    }
  }
  return <section aria-label="Patio settings" style={{ marginTop: 20 }}>
    <h3 style={{ fontSize: 14, margin: '0 0 5px' }}>{selected ? 'Selected patio' : 'New patio settings'}</h3>
    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: 0 }}>
      {selected ? 'Changes update this patio.' : 'Draw the next patio on the level. These settings apply to it.'}
    </p>
    {selected && patio.shape !== 'freehand' && !isCurvedSurface(patio.shape) && <p style={{ fontSize: 11,
      color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
      Drag a corner dot to reshape the patio. Drag a midpoint dot to add a corner, or drag an edge to extend it. In the floor plan, double-click a corner dot to remove it.
    </p>}
    {!selected && <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, marginBottom: 6 }}>Drawing mode</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 5 }}>
        {drawingModes.map((shape) =>
          <button key={shape} type="button" aria-pressed={patio.shape === shape}
            onClick={() => update({ shape })}
            style={{ ...input, cursor: 'pointer',
              borderColor: patio.shape === shape ? '#818cf8' : 'var(--border)',
              textTransform: 'capitalize' }}>{shape}</button>)}
      </div>
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        Press T to switch modes. Rectangle: two corners. Custom: click points, then click the first point or press Enter. Freehand: drag a loop. Circle: click center and radius. Oval: click opposite bounds. Backspace removes the last point.
      </p>
      {placing && drawingStatus.message && <p role="status" style={{ fontSize: 11, color: '#dc6b61' }}>
        {drawingStatus.message}
      </p>}
    </div>}
    {selected ? <>{number('width', patio.shape === 'circle' ? 'Diameter (m)' : 'Width (m)', 0.2, 30, 0.1)}
      {patio.shape !== 'circle' && number('depth', 'Depth (m)', 0.2, 30, 0.1)}</> :
      <p style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>Width and depth come from the outline you draw.</p>}
    {number('thickness', 'Base thickness (m)', 0.03, 2, 0.01)}
    {number('elevation', 'Base elevation (m)', -2, 2, 0.01)}
    {number('slopePercent', 'Drainage slope (%)', 0, 5, 0.25)}
    {patio.slopePercent > 0 && select('drainDirection', 'Drain toward', [
      { value: 'front', label: 'Front' }, { value: 'back', label: 'Back' },
      { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' },
    ])}
    {select('finish', 'Paver material', [
      { value: 'stone', label: 'Stone' }, { value: 'concrete', label: 'Concrete' }, { value: 'brick', label: 'Brick' },
    ])}
    {select('pattern', 'Laying pattern', [
      { value: 'grid', label: 'Stacked grid' }, { value: 'running-bond', label: 'Running bond' },
    ])}
    {number('paverWidth', 'Paver width (m)', 0.2, 2, 0.05)}
    {number('paverDepth', 'Paver depth (m)', 0.2, 2, 0.05)}
    {number('jointWidth', 'Joint width (m)', 0.003, 0.04, 0.001)}
    <label style={label}>Paver color
      <input type="color" style={{ ...input, padding: 2, height: 35, marginTop: 4 }} value={patio.fieldColor}
        onChange={(event) => update({ fieldColor: event.currentTarget.value })} />
    </label>
    {select('borderStyle', 'Border', [
      { value: 'none', label: 'None' }, { value: 'contrast', label: 'Contrasting course' },
    ])}
    {patio.borderStyle !== 'none' && <>
      {number('borderWidth', 'Border width (m)', 0.08, 0.6, 0.01)}
      <label style={label}>Border color
        <input type="color" style={{ ...input, padding: 2, height: 35, marginTop: 4 }} value={patio.borderColor}
          onChange={(event) => update({ borderColor: event.currentTarget.value })} />
      </label>
    </>}
    <h4 style={{ fontSize: 12, margin: '20px 0 0' }}>Fit around a pergola</h4>
    <label style={label}>Pergola
      <select style={{ ...input, marginTop: 4 }} value={chosen?.id ?? ''} disabled={!pergolas.length}
        onChange={(event) => setPergolaId(event.currentTarget.value)}>
        {!pergolas.length && <option value="">No pergola on this level</option>}
        {pergolas.map((node) => <option key={node.id} value={node.id}>{node.name}</option>)}
      </select>
    </label>
    <label style={label}>Clearance on each side (m)
      <input style={{ ...input, marginTop: 4 }} type="number" min={0} max={3} step={0.05} value={margin}
        onChange={(event) => {
          const value = event.currentTarget.valueAsNumber
          if (Number.isFinite(value) && value >= 0 && value <= 3) setMargin(value)
        }} />
    </label>
    <button type="button" style={{ ...input, marginTop: 10, cursor: pergolas.length ? 'pointer' : 'default' }}
      disabled={!chosen || fitTooLarge} onClick={fit}>{selected ? 'Fit selected patio' : 'Create patio around pergola'}</button>
    {fitTooLarge && <p role="status" style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
      Reduce the clearance to keep the patio within its 30 m size limit.
    </p>}
    <p style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
      Aligns the patio with the pergola roof footprint and makes the surface level under its posts.
      Pergola posts remain independent of the paving.
    </p>
  </section>
}
