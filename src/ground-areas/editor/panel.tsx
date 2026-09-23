'use client'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { useState, type CSSProperties } from 'react'
import { GROUND_AREA_KIND, GROUND_SURFACES, type GroundSurface } from '../domain/schema'
import { sendGroundAreaCommand, useGroundAreaStatus, type GroundAreaShape } from './session'

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
const help: CSSProperties = {
  color: 'var(--muted-foreground)',
  fontSize: 11,
  lineHeight: 1.6,
}
const surfaces: { value: GroundSurface; label: string; color: string }[] = [
  { value: 'grass', label: 'Grass', color: '#718451' },
  { value: 'soil', label: 'Soil', color: '#5b5841' },
  { value: 'mulch', label: 'Mulch', color: '#76523b' },
  { value: 'gravel', label: 'Gravel', color: '#918f83' },
  { value: 'sand', label: 'Sand', color: '#cbb78d' },
  { value: 'mud', label: 'Mud', color: '#614533' },
]
const shapes: { value: GroundAreaShape; label: string; hint: string }[] = [
  { value: 'rectangle', label: 'Rectangle', hint: 'Click two corners' },
  { value: 'custom', label: 'Custom outline', hint: 'Click to add corners' },
  { value: 'freehand', label: 'Freehand', hint: 'Drag a smooth loop' },
]

function ShapeDrawing({ shape }: { shape: GroundAreaShape }) {
  const path = shape === 'rectangle'
    ? 'M14 14H66V38H14Z'
    : shape === 'custom'
      ? 'M12 33 21 13 54 11 68 28 51 40 27 36Z'
      : 'M12 30C13 17 25 11 37 15S64 9 69 26 53 42 39 37 17 42 12 30Z'
  return (
    <svg viewBox="0 0 80 52" aria-hidden="true" style={{ display: 'block', width: '100%', height: 60 }}>
      <path d={path} fill="#718451" fillOpacity="0.22" stroke="#718451" strokeWidth="2.5" strokeLinejoin="round" />
      {shape !== 'freehand' && (shape === 'rectangle'
        ? [[14, 14], [66, 38]]
        : [[12, 33], [21, 13], [54, 11], [68, 28], [51, 40], [27, 36]]
      ).map(([x, y], index) => <circle key={index} cx={x} cy={y} r="2.5" fill="#fff" stroke="#718451" strokeWidth="1.5" />)}
    </svg>
  )
}

export function GroundAreaPanel() {
  const levelId = useViewer((state) => state.selection.levelId)
  const active = useEditor((state) => state.tool === GROUND_AREA_KIND)
  const defaults = useEditor((state) => state.toolDefaults[GROUND_AREA_KIND])
  const [surface, setSurface] = useState<GroundSurface>(() =>
    GROUND_SURFACES.find((value) => value === defaults?.surface) ?? 'grass',
  )
  const [shape, setShape] = useState<GroundAreaShape>(() =>
    defaults?.shape === 'custom' || defaults?.shape === 'freehand' ? defaults.shape
      : defaults?.shape === 'polygon' ? 'custom' : 'rectangle',
  )
  const status = useGroundAreaStatus()
  const displayedShape = active ? status.shape : shape

  const start = (nextShape: GroundAreaShape) => {
    if (!levelId) return
    setShape(nextShape)
    const editor = useEditor.getState()
    editor.setToolDefaults(GROUND_AREA_KIND, { surface, shape: nextShape })
    editor.setMode('build')
    editor.setTool(GROUND_AREA_KIND)
  }
  const stop = () => sendGroundAreaCommand('cancel')

  return (
    <section aria-label="Ground areas">
      <label style={{ display: 'block', fontSize: 12 }}>
        Surface
        <select
          aria-label="Ground surface"
          value={surface}
          disabled={active}
          onChange={(event) => setSurface(event.target.value as GroundSurface)}
          style={{ ...field, marginTop: 5 }}
        >
          {GROUND_SURFACES.map((value) => (
            <option key={value} value={value}>
              {surfaces.find((item) => item.value === value)?.label ?? value}
            </option>
          ))}
        </select>
      </label>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, marginBottom: 7, fontWeight: 600 }}>Draw a shape</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {shapes.map((item) => (
            <button
              type="button"
              key={item.value}
              disabled={!levelId}
              aria-pressed={displayedShape === item.value}
              onClick={() => start(item.value)}
              style={{
                ...field,
                padding: 0,
                overflow: 'hidden',
                textAlign: 'left',
                borderColor: displayedShape === item.value ? '#56745a' : 'var(--border)',
                background: displayedShape === item.value ? 'var(--secondary)' : 'transparent',
                cursor: levelId ? 'pointer' : 'default',
                opacity: levelId ? 1 : 0.5,
              }}
            >
              <ShapeDrawing shape={item.value} />
              <span style={{ display: 'block', padding: '0 8px 9px' }}>
                <span style={{ display: 'block', fontWeight: 600, fontSize: 12 }}>{item.label}</span>
                <span style={help}>{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      {active && <button type="button" onClick={stop} style={{ ...field, marginTop: 14, fontWeight: 600 }}>Stop drawing</button>}
      {active && (
        <>
          {displayedShape === 'custom' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" style={field} disabled={status.points === 0} onClick={() => sendGroundAreaCommand('back')}>
                Undo point
              </button>
              <button type="button" style={field} disabled={status.points < 3} onClick={() => sendGroundAreaCommand('finish')}>
                Finish area
              </button>
            </div>
          )}
          <p role="status" style={help}>
            {status.message || (displayedShape === 'rectangle'
              ? 'Click the first corner, then click the opposite corner to place the area.'
              : displayedShape === 'custom'
                ? 'Click each corner. Click the first point, double-click, or press Enter to finish. Backspace removes a point.'
                : 'Press and drag a loop. Return to the start or release to finish a smooth area.')}
          </p>
        </>
      )}
    </section>
  )
}
