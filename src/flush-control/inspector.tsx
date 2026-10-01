'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  PanelSelect,
  PanelButton,
} from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { SectionAccordion } from '../section/section-card'
import {
  WallFlushPlateNode,
  CisternFlushControlNode,
  type FlushControlNode,
  WALL_FLUSH_PLATE,
} from './schema'
import { flushPlatePlacement } from './placement'
import { flushControlSection } from './section'
export default function FlushControlInspector({ node: raw }: { node: FlushControlNode }) {
  const n: FlushControlNode =
      raw.type === WALL_FLUSH_PLATE
        ? WallFlushPlateNode.parse(raw)
        : CisternFlushControlNode.parse(raw),
    setSelection = useViewer((s) => s.setSelection)
  const prepare = (patch: Partial<FlushControlNode>) => {
    if (n.type !== WALL_FLUSH_PLATE) return patch
    const next = WallFlushPlateNode.parse({ ...n, ...patch }),
      wall = useScene.getState().nodes[(next.wallId ?? next.parentId) as AnyNodeId]
    return {
      ...patch,
      ...(wall?.type === 'wall'
        ? flushPlatePlacement(next, wall, next.position[0], next.side, 0, true)
        : {}),
    }
  }
  const update = (patch: Partial<FlushControlNode>) =>
    useScene.getState().updateNode(n.id as AnyNodeId, prepare(patch) as Partial<AnyNode>)
  const slider = (
    key: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step = 0.005,
  ) => (
    <SliderControl
      key={key}
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      precision={3}
      unit="m"
      onChange={(value) => update({ [key]: value })}
    />
  )
  const choice = (key: string, label: string, value: string, options: string[]) => (
    <label className="flex flex-col gap-1 text-xs">
      {label}
      <PanelSelect
        value={value}
        onChange={(e) => update({ [key]: e.target.value })}
        className="rounded border border-border bg-background p-2"
      >
        {options.map((v) => (
          <option key={v} value={v}>
            {v.replaceAll('-', ' ')}
          </option>
        ))}
      </PanelSelect>
    </label>
  )
  return (
    <PanelWrapper
      title={n.type === WALL_FLUSH_PLATE ? 'Wall flush plate' : 'Cistern flush control'}
      onClose={() => setSelection({ selectedIds: [] })}
    >
      <SectionAccordion
        node={n}
        model={flushControlSection}
        onChange={update}
        preparePreview={prepare}
      />
      <PanelSection title="Plate and buttons" defaultExpanded>
        {choice('shape', 'Surround shape', n.shape, [
          'rectangle',
          'rounded',
          'square',
          'round',
          'oval',
        ])}
        {choice('flushMode', 'Flush operation', n.flushMode, ['single', 'dual', 'touchless'])}
        {n.flushMode !== 'touchless' &&
          choice('buttonShape', 'Button shape', n.buttonShape, ['round', 'rectangle', 'oval'])}
        {slider('width', 'Width', n.width, 0.03, 0.35)}
        {!['round', 'square'].includes(n.shape) && slider('height', 'Height', n.height, 0.03, 0.25)}
        {slider('thickness', 'Surround thickness', n.thickness, 0.003, 0.03, 0.001)}
        {slider('edgeRadius', 'Edge bevel radius', n.edgeRadius, 0.0003, 0.004, 0.0001)}
        {slider('seamWidth', 'Button reveal width', n.seamWidth, 0.0003, 0.002, 0.0001)}
        {n.flushMode !== 'touchless' &&
          slider('buttonSize', 'Button size', n.buttonSize, 0.012, 0.08, 0.001)}
        {slider('buttonProjection', 'Control projection', n.buttonProjection, 0.002, 0.015, 0.001)}
      </PanelSection>
      <PanelSection title="Placement" defaultExpanded>
        {n.type === WALL_FLUSH_PLATE ? (
          <>
            {slider(
              'mountingHeight',
              'Height from floor',
              n.mountingHeight,
              Math.min(0, n.mountingHeight),
              Math.max(3, n.mountingHeight + 1),
              0.01,
            )}
            <SliderControl
              label="Position along wall"
              value={n.position[0]}
              min={0}
              max={(() => {
                const wall = useScene.getState().nodes[(n.wallId ?? n.parentId) as AnyNodeId]
                return wall?.type === 'wall'
                  ? Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1])
                  : 5
              })()}
              step={0.01}
              precision={3}
              unit="m"
              onChange={(x) => update({ position: [x, n.position[1], n.position[2]] })}
            />
            <PanelButton
              type="button"
              className="rounded bg-accent px-3 py-2 text-xs"
              onClick={() => update({ side: n.side === 'front' ? 'back' : 'front' })}
            >
              Switch wall face
            </PanelButton>
            {n.servesToiletId && (
              <PanelButton
                type="button"
                className="rounded bg-accent px-3 py-2 text-xs"
                onClick={() => setSelection({ selectedIds: [n.servesToiletId!] })}
              >
                Select linked toilet
              </PanelButton>
            )}
          </>
        ) : (
          <>
            {choice('mount', 'Tank attachment', n.mount, ['top', 'side', 'pull-chain'])}
            {n.mount === 'pull-chain'
              ? slider('chainLength', 'Pull chain length', n.chainLength, 0.3, 1.4, 0.01)
              : slider('offsetX', 'Horizontal offset', n.offsetX, -0.25, 0.25)}
            {n.mount === 'top' && slider('offsetZ', 'Front / back offset', n.offsetZ, -0.1, 0.1)}
            {n.parentId && (
              <PanelButton
                type="button"
                className="rounded bg-accent px-3 py-2 text-xs"
                onClick={() => setSelection({ selectedIds: [n.parentId!] })}
              >
                Select cistern toilet
              </PanelButton>
            )}
          </>
        )}
      </PanelSection>
    </PanelWrapper>
  )
}
