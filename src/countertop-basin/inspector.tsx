'use client'
import {BasinSliderControl as SliderControl,BasinSizingProvider} from '../countertop-basin/size-controls'

import {
  PanelSection,
  PanelWrapper,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { SectionAccordion } from '../section/section-card'
import { basinSection } from '../section/model'
import TapSlotsPanel from '../countertop-basin/tap-slots-panel'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import {
  BasinNode,
  semiRecessedBasinPresets,
  basinPresets,
  UNDERMOUNT_BASIN,
  DROP_IN_BASIN,
  SEMI_RECESSED_BASIN,
  isInsetBasinKind,
} from './schema'
import {
  basinLevelPose,
  basinVanityParent,
  vanityFrame,
  basinDetachPatch,
  basinEditSupportPatch,
} from './attachment'
import { basinParameterGroups } from './definition'
export default function CountertopBasinInspector({ node: raw }: { node: BasinNode }) {
  const node = BasinNode.parse(raw)
  const nodes = useScene((state) => state.nodes)
  const levelPose = basinLevelPose(node, nodes)
  const parent = basinVanityParent(node, nodes)
  const setSelection = useViewer((state) => state.setSelection)
  const update = (patch: Partial<BasinNode>) => {
    let updated = BasinNode.parse({ ...node, ...patch })
    const support = basinEditSupportPatch(node, updated, nodes)
    updated = { ...updated, ...support }
    patch = { ...patch, ...support, ...basinDetachPatch(updated, nodes) }
    useScene.getState().updateNode(node.id as AnyNodeId, patch as Partial<AnyNode>)
  }
  return (
    <BasinSizingProvider node={node}><PanelWrapper
      title={
        node.type === SEMI_RECESSED_BASIN
          ? 'Semi-recessed Basin'
          : node.type === DROP_IN_BASIN
            ? 'Drop-in Basin'
            : node.type === UNDERMOUNT_BASIN
              ? 'Undermount Basin'
              : 'Countertop Basin'
      }
      onClose={() => setSelection({ selectedIds: [] })}
    >
      <SectionAccordion
        node={node}
        model={(item) => basinSection(item, levelPose.position[1] - node.position[1])}
        onChange={update}
        preparePreview={(patch) => ({
          ...patch,
          ...basinEditSupportPatch(node, BasinNode.parse({ ...node, ...patch }), nodes),
        })}
      />
      <TapSlotsPanel node={node} />
      <PanelSection title="Design" defaultExpanded>
        <div className="flex flex-wrap gap-1">
          {(node.type === SEMI_RECESSED_BASIN ? semiRecessedBasinPresets : basinPresets).map(
            (preset) => (
              <PanelButton
                key={preset.shape}
                type="button"
                aria-pressed={node.shape === preset.shape}
                onClick={() =>
                  update(
                    node.type === SEMI_RECESSED_BASIN ? { ...preset, height: node.height } : preset,
                  )
                }
                className={`rounded-md px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${node.shape === preset.shape ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/70'}`}
              >
                {preset.label}
              </PanelButton>
            ),
          )}
        </div>
      </PanelSection>
      {basinParameterGroups.map((group) => (
        <PanelSection key={group.label} title={group.label} defaultExpanded>
          {group.fields.map((field) => {
            if (field.visibleIf && !field.visibleIf(node)) return null
            if (field.kind === 'number')
              return (
                <SliderControl dimensionKey={field.key}
                  key={field.key}
                  label={field.label ?? field.key}
                  value={node[field.key] as number}
                  min={
                    field.key === 'height' && node.type === SEMI_RECESSED_BASIN
                      ? 0.12
                      : (field.min ?? 0)
                  }
                  max={field.max ?? 1}
                  step={field.step ?? 0.01}
                  precision={Math.ceil(-Math.log10(field.step ?? 0.01))}
                  unit={field.unit}
                  onChange={(value) => update({ [field.key]: value })}
                />
              )
            if (field.kind === 'boolean')
              return (
                <ToggleControl
                  key={field.key}
                  label={field.label ?? field.key}
                  checked={node[field.key] as boolean}
                  onChange={(value) => update({ [field.key]: value })}
                />
              )
            return null
          })}
        </PanelSection>
      ))}
      {node.type === SEMI_RECESSED_BASIN && (
        <PanelSection title="Recess and projection" defaultExpanded>
          <SliderControl dimensionKey="frontProjection"
            label="Front projection"
            value={node.frontProjection}
            min={0.04}
            max={0.18}
            step={0.005}
            precision={3}
            unit="m"
            onChange={(frontProjection) => update({ frontProjection })}
          />
          <SliderControl dimensionKey="recessDepth"
            label="Recess depth"
            value={node.recessDepth}
            min={0.03}
            max={0.1}
            step={0.005}
            precision={3}
            unit="m"
            onChange={(recessDepth) => update({ recessDepth })}
          />
        </PanelSection>
      )}
      <PanelSection title="Placement" defaultExpanded>
        {isInsetBasinKind(node.type) && node.type !== SEMI_RECESSED_BASIN && (
          <SliderControl dimensionKey="flangeWidth"
            label={node.type === DROP_IN_BASIN ? 'Rim overhang' : 'Mounting flange'}
            value={node.flangeWidth}
            min={0.01}
            max={0.04}
            step={0.001}
            precision={3}
            unit="m"
            onChange={(flangeWidth) => update({ flangeWidth })}
          />
        )}
        {node.type === DROP_IN_BASIN && (
          <SliderControl dimensionKey="rimHeight"
            label="Rim height"
            value={node.rimHeight}
            min={0.004}
            max={0.02}
            step={0.001}
            precision={3}
            unit="m"
            onChange={(rimHeight) => update({ rimHeight })}
          />
        )}
        <SliderControl
          label={isInsetBasinKind(node.type) ? 'Mount height from floor' : 'Base height from floor'}
          value={levelPose.position[1]}
          step={0.01}
          precision={2}
          unit="m"
          onChange={(height) =>
            update({
              position: [
                node.position[0],
                height - (parent ? vanityFrame(parent, nodes).position[1] : 0),
                node.position[2],
              ],
            })
          }
        />
      </PanelSection>
    </PanelWrapper></BasinSizingProvider>
  )
}
