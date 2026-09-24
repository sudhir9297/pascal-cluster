'use client'

import { roadSurfaceDescription } from './road-surface-material'
import { ActionButton, SliderControl } from '@pascal-app/editor'
import { RoadPanelSubheading } from './road-panel-controls'
import {
  editRoadEdgeRoadway,
  editRoadEdgeSide,
  editRoadNetworkDefaultRoadway,
  editRoadNetworkDefaultSide,
  editRoadNetworkSharedSide,
  resetRoadEdgeStyle,
  resolveRoadNetworkSharedSideValue,
  resolveRoadStyleEditingScope,
  type RoadSharedSideStyleNumberKey,
  type RoadSideStyleNumberKey,
  type RoadwayStyleNumberKey,
} from './road-network-style-editing'
import { resolveRoadSideComponents, type RoadSide } from './road-cross-section'
import type { RoadNetworkNode } from './schema'
import { useStreetscapeStore } from './store'

const ROADWAY_CONTROLS: Array<{
  key: RoadwayStyleNumberKey
  label: string
  max: number
  min: number
  step: number
}> = [
  { key: 'laneCount', label: 'Lane count', min: 1, max: 12, step: 1 },
  { key: 'laneWidth', label: 'Lane width', min: 2.4, max: 5, step: 0.05 },
  { key: 'shoulderWidth', label: 'Shoulder width', min: 0, max: 4, step: 0.05 },
  { key: 'medianWidth', label: 'Median width', min: 0, max: 12, step: 0.1 },
  {
    key: 'surfaceThickness',
    label: 'Surface thickness',
    min: 0.02,
    max: 1,
    step: 0.01,
  },
]

const SHARED_SIDE_CONTROLS: Array<{
  key: RoadSharedSideStyleNumberKey
  label: string
  max: number
  step: number
}> = [
  { key: 'gutterWidth', label: 'Gutter', max: 2, step: 0.05 },
  { key: 'curbWidth', label: 'Kerb', max: 1, step: 0.05 },
  { key: 'vergeWidth', label: 'Verge', max: 8, step: 0.1 },
  { key: 'sidewalkWidth', label: 'Sidewalk', max: 6, step: 0.1 },
]

const SIDE_CONTROLS: Array<{
  key: RoadSideStyleNumberKey
  label: string
  max: number
  step: number
}> = [
  { key: 'parkingLaneWidth', label: 'Parking lane', max: 4, step: 0.1 },
  { key: 'bikeLaneWidth', label: 'Bike lane', max: 3, step: 0.1 },
]

function RoadDimension({
  accessibilityLabel,
  label,
  max,
  min = 0,
  onChange,
  step,
  value,
}: {
  accessibilityLabel: string
  label: string
  max: number
  min?: number
  onChange: (value: number) => void
  step: number
  value: number
}) {
  return (
    <div aria-label={`${accessibilityLabel} in metres`}>
      <SliderControl
        label={label}
        max={max}
        min={min}
        onChange={onChange}
        precision={step >= 1 ? 0 : step >= 0.1 ? 1 : 2}
        step={step}
        unit={label === 'Lane count' ? '' : 'm'}
        value={value}
      />
    </div>
  )
}

export function RoadCrossSectionInspector({
  node,
  onUpdate,
}: {
  node: RoadNetworkNode
  onUpdate: (patch: Partial<RoadNetworkNode>) => void
}) {
  const selection = useStreetscapeStore((state) => state.roadElementSelection)
  const selectedEdgeId =
    selection?.networkId === node.id && selection.kind === 'edge' ? selection.id : null
  const scope = resolveRoadStyleEditingScope(node, selectedEdgeId)
  const style = scope.style
  const surfaceStyles =
    scope.edgeId || node.applyStyleToAll || Object.keys(node.edges).length === 0
      ? [style]
      : Object.values(node.edges).map((edge) => node.stylePresets[edge.styleId] ?? style)
  const surfaceDescriptions = [...new Set(surfaceStyles.map(roadSurfaceDescription))]
  const updateRoadway = (key: RoadwayStyleNumberKey, value: number) => {
    if (scope.edgeId) {
      const patch = editRoadEdgeRoadway(node, scope.edgeId, key, value)
      if (patch) onUpdate(patch)
      return
    }
    onUpdate({ stylePresets: editRoadNetworkDefaultRoadway(node, key, value) })
  }
  const updateSide = (side: RoadSide, key: RoadSideStyleNumberKey, value: number) => {
    if (scope.edgeId) {
      const patch = editRoadEdgeSide(node, scope.edgeId, side, key, value)
      if (patch) onUpdate(patch)
      return
    }
    onUpdate({ stylePresets: editRoadNetworkDefaultSide(node, side, key, value) })
  }
  const updateSharedSide = (key: RoadSharedSideStyleNumberKey, value: number) => {
    onUpdate({ stylePresets: editRoadNetworkSharedSide(node, key, value) })
  }
  return (
    <div className="flex flex-col gap-2">
      {scope.edgeId ? (
        <ActionButton
          label="Use network style"
          onClick={() => {
            const patch = resetRoadEdgeStyle(node, scope.edgeId!)
            if (patch) onUpdate(patch)
          }}
          type="button"
        />
      ) : null}
      <div className="flex flex-col gap-1">
        <RoadPanelSubheading>Roadway</RoadPanelSubheading>
        <p className="text-xs text-muted-foreground" aria-label="Road surface source">
          {surfaceDescriptions.join('; ')}
        </p>
        {ROADWAY_CONTROLS.map((control) => (
          <RoadDimension
            accessibilityLabel={control.label}
            key={control.key}
            label={control.label}
            max={control.max}
            min={control.min}
            onChange={(value) => updateRoadway(control.key, value)}
            step={control.step}
            value={style[control.key]}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <RoadPanelSubheading>Shared roadside</RoadPanelSubheading>
        {SHARED_SIDE_CONTROLS.map((control) => (
          <RoadDimension
            accessibilityLabel={`Shared ${control.label.toLowerCase()}`}
            key={control.key}
            label={control.label}
            max={control.max}
            onChange={(value) => updateSharedSide(control.key, value)}
            step={control.step}
            value={resolveRoadNetworkSharedSideValue(node, control.key)}
          />
        ))}
      </div>
      {(['left', 'right'] as const).map((side: RoadSide) => {
        const components = resolveRoadSideComponents(style, side)
        const sideLabel = side === 'left' ? 'Left side' : 'Right side'
        return (
          <div key={side} className="flex flex-col gap-1">
            <RoadPanelSubheading>{sideLabel}</RoadPanelSubheading>
            {SIDE_CONTROLS.map((control) => (
              <RoadDimension
                accessibilityLabel={`${sideLabel} ${control.label.toLowerCase()}`}
                key={control.key}
                label={control.label}
                max={control.max}
                onChange={(value) => updateSide(side, control.key, value)}
                step={control.step}
                value={components[control.key] ?? 0}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
