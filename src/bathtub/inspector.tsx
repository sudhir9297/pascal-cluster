'use client'
import {
  PanelSection,
  PanelWrapper,
  SliderControl,
  ToggleControl,
  PanelButton,
} from '../inspector-controls'
import { bathBackrestPresets, bathBackrestAngleLimit, bathWellFloor } from './backrest'
import { bathDrainPosition, bathDrainDistanceLimit, bathDrainCrossLimits } from './drain'
import { useScene, type AnyNode, type AnyNodeId } from '@pascal-app/core'

import { useViewer } from '@pascal-app/viewer'
import { SectionAccordion } from '../section/section-card'
import {
  BathtubNode,
  bathtubPresets,
  bathBowlDepth,
  bathRimWidth,
  bathBaseHeight,
  bathUsesDeck,
} from './schema'
import { bathDeckParent, attachBathToDeck, detachBathFromDeck } from '../bath-deck/attachment'
import { bathDimensionLimits, fitBathToDeck } from '../bath-deck/fit'
import { BATH_DECK, BathDeckNode } from '../bath-deck/schema'
import { bathSection } from './section'
import { BathScreenNode, BATH_SCREEN } from '../bath-screen/schema'
import { BATH_SHOWER } from '../bath-shower/schema'
import { createBathShower } from '../bath-shower/creation'
import { attachBathScreen } from '../bath-screen/attachment'
export default function BathInspector({ node: raw }: { node: BathtubNode }) {
  const nodes = useScene((state) => state.nodes),
    node = BathtubNode.parse(raw),
    deck = bathDeckParent(node, nodes),
    limits = bathDimensionLimits(node, deck)
  const update = (patch: Partial<BathtubNode>) => {
    const candidate = BathtubNode.parse({ ...node, ...patch }),
      valid = deck ? fitBathToDeck(candidate, deck) : candidate
    if (valid)
      useScene.getState().updateNode(node.id as AnyNodeId, valid as unknown as Partial<AnyNode>)
  }
  const combination = node.children
    .map((id) => nodes[id as AnyNodeId])
    .find((raw) => raw && String(raw.type) === BATH_SHOWER)
  const canCombine = (end: 'left' | 'right') => {
    try {
      return Boolean(createBathShower(node, nodes, end))
    } catch {
      return false
    }
  }
  const section = (bath: BathtubNode) => {
    const model = bathSection(bath),
      bounds = bathDimensionLimits(bath, deck)
    return {
      ...model,
      dimensions: model.dimensions.map((field) =>
        field.key in bounds ? { ...field, max: bounds[field.key as keyof typeof bounds] } : field,
      ),
    }
  }
  return (
    <PanelWrapper
      title={
        node.shape === 'walk-in'
          ? 'Walk-in Bath'
          : node.shape === 'undermount'
            ? 'Undermount Bath'
            : node.shape === 'drop-in'
              ? 'Drop-in Bath'
              : node.shape === 'corner'
                ? 'Corner Bath'
                : node.shape === 'alcove'
                  ? 'Alcove Bath'
                  : node.shape === 'back-to-wall'
                    ? 'Back-to-wall Bath'
                    : 'Freestanding Bath'
      }
      onClose={() => useViewer.getState().setSelection({ selectedIds: [] })}
    >
      <PanelSection title="Shape" defaultExpanded>
        <div className="flex flex-wrap gap-2">
          {bathtubPresets.map((p) => (
            <PanelButton
              key={p.shape}
              type="button"
              disabled={
                Boolean(deck && p.shape !== node.shape) ||
                Boolean(p.shape === 'corner' && combination) ||
                Boolean(
                  p.shape === 'corner' &&
                    node.children.some(
                      (id) => String(nodes[id as AnyNodeId]?.type) === BATH_SCREEN,
                    ),
                )
              }
              aria-pressed={node.shape === p.shape}
              onClick={() =>
                update({
                  shape: p.shape,
                  height: p.shape === 'walk-in' ? 0.99 : Math.min(0.75, node.height),
                  width:
                    p.shape === 'corner' ? Math.max(1.2, node.width) : Math.min(1.1, node.width),
                })
              }
              className={`rounded px-2 py-1 text-xs ${node.shape === p.shape ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
            >
              {p.label}
            </PanelButton>
          ))}
        </div>
      </PanelSection>
      <PanelSection title="Dimensions" defaultExpanded>
        {(
          [
            ['length', 'Length', 1.2, limits.length],
            ['width', 'Width', 0.65, limits.width],
            ['height', 'Rim height', node.shape === 'walk-in' ? 0.85 : 0.45, limits.height],
            [
              'bowlDepth',
              'Bowl depth',
              Math.min(0.3, bathBowlDepth(node)),
              Math.min(0.55, node.height - bathBaseHeight(node) - 0.07),
            ],
            ['rimWidth', 'Rim width', node.tapMount === 'rim' ? 0.09 : 0.035, 0.12],
          ] as const
        )
          .filter(([key]) => node.shape !== 'walk-in' || key !== 'bowlDepth')
          .map(([key, label, min, max]) => (
            <SliderControl
              key={key}
              label={label}
              value={
                key === 'bowlDepth'
                  ? bathBowlDepth(node)
                  : key === 'rimWidth'
                    ? bathRimWidth(node)
                    : node[key]
              }
              min={min}
              max={max}
              step={0.005}
              precision={3}
              unit="m"
              onChange={(value) => update({ [key]: value })}
            />
          ))}
      </PanelSection>
      <PanelSection title="Bath fittings" defaultExpanded>
        <div className="flex gap-2">
          {(['wall', 'rim', 'none'] as const).map((tapMount) => (
            <PanelButton
              key={tapMount}
              type="button"
              aria-pressed={node.tapMount === tapMount}
              disabled={node.shape === 'undermount' && tapMount === 'rim'}
              onClick={() => update({ tapMount })}
              className={`rounded px-2 py-1 text-xs ${node.tapMount === tapMount ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
            >
              {tapMount === 'wall'
                ? 'Wall mounted'
                : tapMount === 'rim'
                  ? 'On the rim'
                  : 'No tap'}
            </PanelButton>
          ))}
        </div>

        <ToggleControl
          label="Drain cover"
          checked={node.drainCover}
          onChange={(drainCover) => update({ drainCover })}
        />
        <ToggleControl
          label="Overflow trim"
          checked={node.overflow}
          onChange={(overflow) => update({ overflow })}
        />
      </PanelSection>
      <SectionAccordion node={node} model={section} onChange={update} />
      {bathUsesDeck(node) && (
        <PanelSection title="Deck attachment" defaultExpanded>
          {deck && (
            <>
              <PanelButton
                type="button"
                onClick={() => useViewer.getState().setSelection({ selectedIds: [deck.id] })}
              >
                Select deck
              </PanelButton>
              <PanelButton
                type="button"
                onClick={() =>
                  useScene.getState().applyNodeChanges(detachBathFromDeck(node, nodes))
                }
              >
                Detach onto floor
              </PanelButton>
            </>
          )}
          {Object.values(nodes)
            .filter((raw) => String(raw.type) === BATH_DECK && String(raw.id) !== deck?.id)
            .map((raw) => BathDeckNode.parse(raw))
            .filter((target) =>
              Boolean(fitBathToDeck({ ...node, position: [0, 0, 0], rotation: 0 }, target)),
            )
            .map((target) => (
              <PanelButton
                key={target.id}
                type="button"
                onClick={() =>
                  useScene.getState().applyNodeChanges(attachBathToDeck(node, target, nodes))
                }
              >
                Attach to {target.name ?? 'Bath Deck'}
              </PanelButton>
            ))}
        </PanelSection>
      )}
      {node.shape !== 'corner' && (
        <PanelSection title="Bath shower" defaultExpanded={false}>
          {(['left', 'right'] as const).map((end) => (
            <PanelButton
              key={end}
              type="button"
              disabled={!canCombine(end)}
              onClick={() => {
                const result = createBathShower(node, nodes, end)
                useScene.getState().applyNodeChanges(result.changes)
                useViewer.getState().setSelection({ selectedIds: [result.node.id] })
              }}
            >
              Add shower at {end} end
            </PanelButton>
          ))}
          {combination && (
            <PanelButton
              type="button"
              onClick={() => useViewer.getState().setSelection({ selectedIds: [combination.id] })}
            >
              Edit bath shower
            </PanelButton>
          )}
        </PanelSection>
      )}
      {node.shape !== 'corner' && !combination && (
        <PanelSection title="Bath shower screen" defaultExpanded={false}>
          <PanelButton
            type="button"
            onClick={() => {
              const result = attachBathScreen(
                BathScreenNode.parse({ name: 'Bath screen' }),
                node,
                nodes,
              )
              useScene.getState().applyNodeChanges(result.changes)
              useViewer.getState().setSelection({ selectedIds: [result.placed.id] })
            }}
          >
            Add or replace bath screen
          </PanelButton>
          {node.children
            .filter((id) => String(nodes[id as AnyNodeId]?.type) === BATH_SCREEN)
            .map((id) => (
              <PanelButton
                key={id}
                type="button"
                onClick={() =>
                  useViewer.getState().setSelection({ selectedIds: [id as AnyNodeId] })
                }
              >
                Edit bath screen
              </PanelButton>
            ))}
        </PanelSection>
      )}
      {node.shape !== 'walk-in' && (
        <PanelSection title="Backrest profiles" defaultExpanded={false}>
          <div className="flex flex-wrap gap-2">
            {bathBackrestPresets.map((p) => (
              <PanelButton
                key={p.id}
                type="button"
                aria-pressed={node.backrestProfile === p.id}
                onClick={() =>
                  update({
                    backrestProfile: p.id,
                    backrestLeftAngle: p.angle,
                    backrestRightAngle: p.angle,
                  })
                }
              >
                {p.label}
              </PanelButton>
            ))}
          </div>
          {node.backrestProfile !== 'classic' && (
            <>
              {(['left', 'right'] as const).map((side) => (
                <SliderControl
                  key={side}
                  label={`${side === 'left' ? 'Left' : 'Right'} backrest angle from vertical`}
                  value={
                    side === 'left' ? bathWellFloor(node).leftAngle : bathWellFloor(node).rightAngle
                  }
                  min={10}
                  max={bathBackrestAngleLimit(node)}
                  step={1}
                  precision={0}
                  unit="°"
                  onChange={(value) =>
                    update({
                      [side === 'left' ? 'backrestLeftAngle' : 'backrestRightAngle']: value,
                    })
                  }
                />
              ))}
            </>
          )}
        </PanelSection>
      )}
      <PanelSection title="Waste connections" defaultExpanded={false}>
        <ToggleControl
          label="Show waste plumbing"
          checked={node.showPlumbing}
          onChange={(showPlumbing) => update({ showPlumbing })}
        />
        {node.showPlumbing && (
          <>
            <SliderControl
              label="Waste recess depth"
              value={node.wasteRecessDepth}
              min={0.1}
              max={0.25}
              step={0.005}
              precision={3}
              unit="m"
              onChange={(wasteRecessDepth) => update({ wasteRecessDepth })}
            />
            <SliderControl
              label="Waste outlet length"
              value={node.wasteOutletLength}
              min={0.08}
              max={0.4}
              step={0.005}
              precision={3}
              unit="m"
              onChange={(wasteOutletLength) => update({ wasteOutletLength })}
            />
            <SliderControl
              label="Waste outlet direction"
              value={(node.wasteOutletAngle * 180) / Math.PI}
              min={-180}
              max={180}
              step={5}
              precision={0}
              unit="°"
              onChange={(degrees) => update({ wasteOutletAngle: (degrees * Math.PI) / 180 })}
            />
          </>
        )}
      </PanelSection>
      {node.shape === 'undermount' && (
        <PanelSection title="Bathing well" defaultExpanded>
          {(['oval', 'rectangle'] as const).map((builtInShape) => (
            <PanelButton
              key={builtInShape}
              type="button"
              aria-pressed={node.builtInShape === builtInShape}
              className={`rounded px-2 py-1 text-xs ${node.builtInShape === builtInShape ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
              onClick={() => update({ builtInShape })}
            >
              {builtInShape === 'oval' ? 'Oval well' : 'Rectangular well'}
            </PanelButton>
          ))}
        </PanelSection>
      )}
      {node.shape === 'walk-in' && (
        <PanelSection title="Access and seat" defaultExpanded>
          <PanelButton
            type="button"
            onClick={() => update({ doorOpening: node.doorOpening > 0 ? 0 : 1 })}
          >
            {node.doorOpening > 0 ? 'Close bath door' : 'Open bath door'}
          </PanelButton>

          {(['left', 'right'] as const).map((doorSide) => (
            <PanelButton
              key={doorSide}
              type="button"
              aria-pressed={node.doorSide === doorSide}
              className={`rounded px-2 py-1 text-xs ${node.doorSide === doorSide ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
              onClick={() => update({ doorSide })}
            >
              {doorSide === 'left' ? 'Left entry' : 'Right entry'}
            </PanelButton>
          ))}
          {(
            [
              [
                'doorWidth',
                'Door width',
                0.38,
                Math.min(0.65, node.width - node.rimWidth * 2 - 0.025, node.length * 0.45),
              ],
              ['thresholdHeight', 'Entry threshold', 0.04, 0.15],
              ['seatHeight', 'Seat height', 0.3, 0.55],
              ['seatDepth', 'Seat depth', 0.3, 0.55],
              ['doorOpening', 'Door opening', 0, 1],
            ] as const
          ).map(([key, label, min, max]) => (
            <SliderControl
              key={key}
              label={label}
              value={node[key]}
              min={min}
              max={max}
              step={0.005}
              precision={3}
              unit={key === 'doorOpening' ? '' : 'm'}
              onChange={(value) => update({ [key]: value })}
            />
          ))}
          <SliderControl
            label="Seat backrest lean"
            value={node.seatBackrestAngle}
            min={0}
            max={12}
            step={1}
            precision={0}
            unit="°"
            onChange={(seatBackrestAngle) => update({ seatBackrestAngle })}
          />
          <ToggleControl
            label="Grab handle"
            checked={node.grabHandles}
            onChange={(grabHandles) => update({ grabHandles })}
          />
        </PanelSection>
      )}
      {
        <PanelSection title="Drain position" defaultExpanded={false}>
          <div className="flex gap-2">
            {(['left', 'center', 'right'] as const).map((drainEnd) => (
              <PanelButton
                key={drainEnd}
                type="button"
                aria-pressed={node.drainEnd === drainEnd}
                onClick={() => update({ drainEnd })}
                className={`rounded px-2 py-1 text-xs ${node.drainEnd === drainEnd ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
              >
                {drainEnd === 'center'
                  ? 'Centre drain'
                  : `${drainEnd === 'left' ? 'Left' : 'Right'} drain`}
              </PanelButton>
            ))}
          </div>
          {node.drainEnd !== 'center' && bathDrainDistanceLimit(node) > 0.001 && (
            <SliderControl
              label="Drain from centre"
              value={Math.abs(bathDrainPosition(node)[0])}
              min={0}
              max={bathDrainDistanceLimit(node)}
              step={0.001}
              precision={3}
              unit="m"
              onChange={(drainDistance) => update({ drainDistance })}
            />
          )}
          {bathDrainCrossLimits(node).max - bathDrainCrossLimits(node).min > 0.001 && (
            <SliderControl
              label="Drain across floor"
              value={bathDrainPosition(node)[1]}
              min={bathDrainCrossLimits(node).min}
              max={bathDrainCrossLimits(node).max}
              step={0.001}
              precision={3}
              unit="m"
              onChange={(drainCrossOffset) => update({ drainCrossOffset })}
            />
          )}

          {node.shape === 'alcove' && (
            <SliderControl
              label="Apron thickness"
              value={node.apronThickness}
              min={0.015}
              max={0.05}
              step={0.001}
              precision={3}
              unit="m"
              onChange={(apronThickness) => update({ apronThickness })}
            />
          )}
        </PanelSection>
      }
      {node.shape !== 'alcove' &&
        node.shape !== 'corner' &&
        node.shape !== 'walk-in' &&
        !bathUsesDeck(node) && (
          <PanelSection title="Feet and base" defaultExpanded={false}>
            <div className="flex flex-wrap gap-2">
              {(['automatic', 'integrated', 'claw', 'rounded', 'pedestal'] as const).map(
                (baseStyle) => (
                  <PanelButton
                    key={baseStyle}
                    type="button"
                    aria-pressed={node.baseStyle === baseStyle}
                    onClick={() => update({ baseStyle })}
                    className={`rounded px-2 py-1 text-xs ${node.baseStyle === baseStyle ? 'bg-primary text-primary-foreground' : 'bg-accent'}`}
                  >
                    {
                      {
                        automatic: 'By shape',
                        integrated: 'Integrated',
                        claw: 'Ball and claw',
                        rounded: 'Rounded feet',
                        pedestal: 'Pedestal',
                      }[baseStyle]
                    }
                  </PanelButton>
                ),
              )}
            </div>
            <SliderControl
              label="Support height"
              value={node.baseHeight}
              min={0.08}
              max={0.2}
              step={0.005}
              precision={3}
              unit="m"
              onChange={(baseHeight) => update({ baseHeight })}
            />
          </PanelSection>
        )}
    </PanelWrapper>
  )
}
