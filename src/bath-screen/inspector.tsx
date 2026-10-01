'use client'
import { ShowerSectionAccordion } from '../section/shower-section-card'
import { bathScreenSection } from './section'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { screenBath, bathScreenWallMount } from './attachment'
import { BathtubNode } from '../bathtub/schema'
import { BathScreenNode } from './schema'
export default function BathScreenInspector({ node }: { node: BathScreenNode }) {
  const nodes = useScene((s) => s.nodes),
    bath = screenBath(node, nodes)!,
    wall = bathScreenWallMount(node, bath, nodes),
    available = bathScreenWallMount({ ...node, wallId: null }, bath, nodes)
  const update = (patch: Partial<BathScreenNode>) =>
    useScene.getState().updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
  return (
    <PanelWrapper
      title="Bath Screen"
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <ShowerSectionAccordion node={node} model={bathScreenSection} onChange={update} />
      <PanelSection title="Glass panel" defaultExpanded>
        {(['square', 'rounded'] as const).map((profile) => (
          <PanelButton
            key={profile}
            type="button"
            aria-pressed={node.profile === profile}
            className="rounded bg-accent px-2 py-1 text-xs"
            onClick={() => update({ profile })}
          >
            {profile === 'square' ? 'Square screen' : 'Rounded screen'}
          </PanelButton>
        ))}
        {(
          [
            ['width', 'Panel width', 0.4, 1.1],
            ['height', 'Panel height', 1, 1.6],
            ['thickness', 'Glass thickness', 0.004, 0.012],
            ['cornerRadius', 'Top corner radius', 0.02, 0.25],
            ['opening', 'Opening angle', -90, 90],
          ] as const
        )
          .filter(([key]) => key !== 'cornerRadius' || node.profile === 'rounded')
          .map(([key, label, min, max]) => (
            <SliderControl
              key={key}
              label={label}
              value={node[key]}
              min={min}
              max={max}
              step={key === 'opening' ? 1 : 0.001}
              precision={key === 'opening' ? 0 : 3}
              unit={key === 'opening' ? '°' : 'm'}
              onChange={(value) => update({ [key]: value })}
            />
          ))}
        <ToggleControl
          label="Metal frame"
          checked={node.framed}
          onChange={(framed) => update({ framed })}
        />
      </PanelSection>
      <PanelSection title="Mounting and opening" defaultExpanded>
        <p className="text-xs text-muted-foreground">
          {node.mounting === 'wall'
            ? wall
              ? 'Mounted on bath-end wall'
              : 'Wall support unavailable; screen hidden until the bath and wall fit again'
            : 'Preview placement; no wall attachment'}
        </p>
        {available && (
          <PanelButton
            type="button"
            onClick={() => update({ mounting: 'wall', wallId: available.wallId })}
          >
            Mount on bath-end wall
          </PanelButton>
        )}
        {node.mounting === 'wall' && (
          <PanelButton type="button" onClick={() => update({ mounting: 'preview', wallId: null })}>
            Use preview placement
          </PanelButton>
        )}
        {(['automatic', 'left', 'right'] as const).map((side) => (
          <PanelButton
            key={side}
            type="button"
            aria-pressed={node.side === side}
            onClick={() => update({ side, wallId: null })}
          >
            {side === 'automatic'
              ? 'By bath entry'
              : side === 'left'
                ? 'Left hinge'
                : 'Right hinge'}
          </PanelButton>
        ))}
        <PanelButton type="button" onClick={() => update({ opening: node.opening !== 0 ? 0 : 90 })}>
          {node.opening !== 0 ? 'Close screen' : 'Open screen'}
        </PanelButton>
        <PanelButton
          type="button"
          onClick={() => useViewer.getState().setSelection({ selectedIds: [bath.id as AnyNodeId] })}
        >
          Select bath
        </PanelButton>
      </PanelSection>
    </PanelWrapper>
  )
}
