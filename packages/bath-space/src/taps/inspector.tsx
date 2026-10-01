'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'

import { bathFromNode } from '../bathtub/targets'
import { SectionAccordion } from '../section/section-card'
import { tapSection } from '../section/model'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { attachedTapPose } from './attachment'
import { tapDimensions } from './geometry'
import { TapDetails } from './details'
import { basinTapMaximumHoleSpacing, BasinNode, isBasinKind } from '../countertop-basin/schema'
import { basinTapHoleSpacing, basinTapLayoutChanges } from '../countertop-basin/tap-layout'
import { tapPresets, tapMountingLayout } from './presets'
import { TapNode } from './schema'

function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  onChange: (value: T) => void
}) {
  return (
    <div className="mb-3">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
        {options.map((option) => (
          <PanelButton
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded px-2 py-1.5 text-xs capitalize focus-visible:outline-2 focus-visible:outline-ring ${value === option ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
          >
            {option}
          </PanelButton>
        ))}
      </div>
    </div>
  )
}

export default function TapInspector({ node: raw }: { node: TapNode }) {
  const node = TapNode.parse(raw),
    p = tapDimensions(node)
  const setSelection = useViewer((state) => state.setSelection)
  const update = (patch: Partial<TapNode>) => {
    if (patch.position && (node.servesBasinId || node.servesBathId) && node.linkOffset) {
      const current = attachedTapPose(node, useScene.getState().nodes).local.position
      patch = {
        ...patch,
        linkOffset: [
          node.linkOffset[0] + patch.position[0] - current[0],
          node.linkOffset[1] + patch.position[1] - current[1],
        ],
      }
    }
    const state = useScene.getState(),
      parent = state.nodes[(node.parentId ?? '') as AnyNodeId]
    if (
      (patch.mountingLayout || patch.holeSpacing !== undefined) &&
      parent &&
      isBasinKind(String(parent.type))
    ) {
      const changes = basinTapLayoutChanges(
        BasinNode.parse(parent),
        patch.mountingLayout ?? p.mountingLayout,
        state.nodes,
        patch.holeSpacing ?? BasinNode.parse(parent).tapHoleSpacing,
      )
      const entry = changes.update.find((entry) => String(entry.id) === node.id)
      if (entry) entry.data = { ...entry.data, ...patch } as Partial<AnyNode>
      state.applyNodeChanges(changes)
    } else state.updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
  }
  const parent = useScene.getState().nodes[(node.parentId ?? '') as AnyNodeId]
  const bath = bathFromNode(parent)
  const basin = parent && isBasinKind(String(parent.type)) ? BasinNode.parse(parent) : null
  const mountedPosition = attachedTapPose(node, useScene.getState().nodes).local.position
  const square = p.design === 'lever' || p.design === 'waterfall'
  const sideControl = ![
    'lever',
    'waterfall',
    'vintage',
    'vintage-arc',
    'sculpted',
    'mixer',
    'plate',
    'twin',
  ].includes(p.design)
  return (
    <PanelWrapper title={p.label} onClose={() => setSelection({ selectedIds: [] })}>
      <SectionAccordion node={node} model={tapSection} onChange={update} />
      {p.mount === 'wall' && node.wallId && (
        <PanelSection title="Wall placement" defaultExpanded>
          <SliderControl
            label="Mounting height"
            value={mountedPosition[1]}
            min={0.3}
            max={3}
            step={0.01}
            precision={2}
            unit="m"
            onChange={(height) =>
              update({ position: [mountedPosition[0], height, mountedPosition[2]] })
            }
          />
          <PanelButton
            type="button"
            className="rounded bg-accent px-2 py-1.5 text-xs"
            onClick={() => useEditor.getState().setMovingNode(node as unknown as AnyNode)}
          >
            Reposition on wall
          </PanelButton>
        </PanelSection>
      )}
      <PanelSection title="Design" defaultExpanded>
        {p.mount === 'countertop' && !bath && (
          <Choices
            label="Mounting layout"
            value={p.mountingLayout}
            options={['single-hole', 'three-hole']}
            onChange={(mountingLayout) => update({ mountingLayout })}
          />
        )}
        {p.mountingLayout === 'three-hole' && (
          <SliderControl
            label="Hot-to-cold spacing"
            value={basin ? basinTapHoleSpacing(basin) : p.holeSpacing}
            min={0.1}
            max={basin ? basinTapMaximumHoleSpacing(basin) : 0.4}
            step={0.005}
            precision={3}
            unit="m"
            onChange={(holeSpacing) => update({ holeSpacing })}
          />
        )}
        <div className="grid grid-cols-3 gap-1">
          {tapPresets
            .filter(
              (preset) =>
                preset.mount === p.mount &&
                (!bath || tapMountingLayout({ presetId: preset.id }) === 'single-hole'),
            )
            .map((preset) => (
              <PanelButton
                key={preset.id}
                type="button"
                aria-pressed={node.presetId === preset.id}
                onClick={() =>
                  update({
                    ...TapDetails.parse({}),
                    presetId: preset.id,
                    mountingLayout:
                      'mountingLayout' in preset ? preset.mountingLayout : 'single-hole',
                    height: undefined,
                    reach: undefined,
                    bodyRadius: undefined,
                    handleLength: undefined,
                    handleThickness: undefined,
                    spoutDiameter: undefined,
                    baseWidth: undefined,
                    springRadius: undefined,
                    handleAngle: 0,
                  })
                }
                className={`rounded px-2 py-1.5 text-xs focus-visible:outline-2 focus-visible:outline-ring ${node.presetId === preset.id ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
              >
                {preset.label}
              </PanelButton>
            ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        <SliderControl
          label={p.design === 'plate' ? 'Plate height' : 'Height'}
          value={p.height}
          min={0.12}
          max={0.6}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(height) => update({ height })}
        />
        <SliderControl
          label="Spout reach"
          value={p.reach}
          min={0.1}
          max={0.3}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(reach) => update({ reach })}
        />
        <SliderControl
          label={p.design === 'plate' ? 'Plate width' : 'Body diameter'}
          value={p.bodyRadius * 2 * (p.design === 'plate' ? 0.052 / 0.024 : 1)}
          min={0.024 * (p.design === 'plate' ? 0.052 / 0.024 : 1)}
          max={0.08 * (p.design === 'plate' ? 0.052 / 0.024 : 1)}
          step={0.002}
          precision={3}
          unit="m"
          onChange={(diameter) =>
            update({ bodyRadius: diameter / 2 / (p.design === 'plate' ? 0.052 / 0.024 : 1) })
          }
        />
        <SliderControl
          label={square ? 'Spout thickness' : 'Spout diameter'}
          value={p.spoutDiameter}
          min={0.012}
          max={0.05}
          step={0.001}
          precision={3}
          unit="m"
          onChange={(spoutDiameter) => update({ spoutDiameter })}
        />
        {!square && p.mount !== 'wall' && (
          <SliderControl
            label="Outlet drop"
            value={p.outletDrop}
            min={0.12}
            max={0.4}
            step={0.01}
            precision={2}
            onChange={(outletDrop) => update({ outletDrop })}
          />
        )}
      </PanelSection>
      <PanelSection title="Handle" defaultExpanded>
        <Choices
          label="Handle style"
          value={node.handleStyle}
          options={['auto', 'lever', 'pin', 'cross', 'wheel']}
          onChange={(handleStyle) => update({ handleStyle })}
        />
        {sideControl && (
          <Choices
            label="Handle side"
            value={node.handleSide}
            options={['left', 'right']}
            onChange={(handleSide) => update({ handleSide })}
          />
        )}
        <SliderControl
          label="Handle length"
          value={p.handleLength}
          min={0.035}
          max={0.12}
          step={0.001}
          precision={3}
          unit="m"
          onChange={(handleLength) => update({ handleLength })}
        />
        <SliderControl
          label="Grip thickness"
          value={p.handleThickness}
          min={0.004}
          max={0.018}
          step={0.001}
          precision={3}
          unit="m"
          onChange={(handleThickness) => update({ handleThickness })}
        />
        <SliderControl
          label={
            p.handleStyle === 'wheel' || p.handleStyle === 'cross'
              ? 'Handle turn'
              : 'Handle opening'
          }
          value={node.handleAngle}
          min={-0.5}
          max={0.5}
          step={0.05}
          precision={2}
          unit="rad"
          onChange={(handleAngle) => update({ handleAngle })}
        />
        <ToggleControl
          label="Temperature markers"
          checked={node.temperatureMarkers}
          onChange={(temperatureMarkers) => update({ temperatureMarkers })}
        />
      </PanelSection>
      {p.mount === 'countertop' && (
        <PanelSection title="Base" defaultExpanded>
          <Choices
            label="Base shape"
            value={node.baseStyle}
            options={['auto', 'round', 'square', 'none']}
            onChange={(baseStyle) => update({ baseStyle })}
          />
          {node.baseStyle !== 'none' && (
            <>
              <SliderControl
                label="Base width"
                value={p.baseWidth}
                min={p.bodyRadius * 2.1}
                max={0.14}
                step={0.001}
                precision={3}
                unit="m"
                onChange={(baseWidth) => update({ baseWidth })}
              />
              <SliderControl
                label="Base height"
                value={p.baseHeight}
                min={0.004}
                max={0.025}
                step={0.001}
                precision={3}
                unit="m"
                onChange={(baseHeight) => update({ baseHeight })}
              />
            </>
          )}
        </PanelSection>
      )}
      <PanelSection title="Outlet and trim" defaultExpanded>
        <ToggleControl
          label="Aerator insert"
          checked={node.aeratorEnabled}
          onChange={(aeratorEnabled) => update({ aeratorEnabled })}
        />
        {node.aeratorEnabled && (
          <Choices
            label="Aerator grille"
            value={node.aeratorStyle}
            options={['honeycomb', 'slotted', 'plain']}
            onChange={(aeratorStyle) => update({ aeratorStyle })}
          />
        )}
        <ToggleControl
          label="Decorative rings"
          checked={node.decorativeRings}
          onChange={(decorativeRings) => update({ decorativeRings })}
        />
      </PanelSection>
      {p.design === 'spring' && (
        <PanelSection title="Pullout assembly" defaultExpanded>
          <SliderControl
            label="Spring turns"
            value={p.springTurns}
            min={12}
            max={44}
            step={1}
            precision={0}
            onChange={(springTurns) => update({ springTurns })}
          />
          <SliderControl
            label="Spring radius"
            value={p.springRadius}
            min={0.012}
            max={0.035}
            step={0.001}
            precision={3}
            unit="m"
            onChange={(springRadius) => update({ springRadius })}
          />
          <SliderControl
            label="Spray head length"
            value={p.sprayHeadLength}
            min={0.035}
            max={0.09}
            step={0.001}
            precision={3}
            unit="m"
            onChange={(sprayHeadLength) => update({ sprayHeadLength })}
          />
          <ToggleControl
            label="Spray mode button"
            checked={node.sprayButton}
            onChange={(sprayButton) => update({ sprayButton })}
          />
        </PanelSection>
      )}
      {p.design === 'mixer' && (
        <PanelSection title="Wall fittings" defaultExpanded>
          <SliderControl
            label="Connection spacing"
            value={p.wallSpacing}
            min={0.12}
            max={0.22}
            step={0.005}
            precision={3}
            unit="m"
            onChange={(wallSpacing) => update({ wallSpacing })}
          />
        </PanelSection>
      )}
    </PanelWrapper>
  )
}
