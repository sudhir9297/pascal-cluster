'use client'
import { useEffect, useState } from 'react'
import {
  useScene,
  type AnyNode,
  type AnyNodeId,
  type LevelNode,
} from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import TapCatalog from '../taps/catalog'
import BathCatalog from '../bathtub/catalog'
import ShowerKitCatalog from '../shower-kit/catalog'
import ShowerAssemblyCatalog from '../shower-assembly/catalog'
import ShowerArmCatalog from '../shower-arm/catalog'
import ShowerHeadCatalog from '../shower-head/catalog'
import ShowerControlCatalog from '../shower-control/catalog'
import DividerCatalog from '../shower-divider/catalog'
import { SHOWER_ARM } from '../shower-arm/schema'
import { SHOWER_HEAD } from '../shower-head/schema'
import { SHOWER_DIVIDER } from '../shower-divider/schema'
import { CatalogScrollArea } from '../catalog-ui'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { setGuidedPlacementContext } from './placement-context'
import {
  acceptBathingPlacement,
  bathingFixtures,
  bathingHead,
  bathingMetadataKey,
  bathingShowerReady,
  emptyBathingArea,
  readBathingArea,
  reconcileBathingArea,
  type BathingFlow,
  type BathingStep,
} from './bathing-area'

const button =
  'rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed'
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`
export default function BathingBuilder({
  levelId,
  onToilet,
  onAccessories,
  onBrowse,
}: {
  levelId: LevelNode['id']
  onAccessories: () => void
  onToilet: () => void
  onBrowse: () => void
}) {
  const [showShowerOptions, setShowShowerOptions] = useState(false)
  const [showParts, setShowParts] = useState(false)
  const nodes = useScene((state) => state.nodes)
  const flow = reconcileBathingArea(
    readBathingArea(nodes[levelId]?.metadata?.[bathingMetadataKey]),
    nodes,
  )
  const fixtures = bathingFixtures(flow, nodes)
  const head = bathingHead(flow, nodes)
  const showerReady = bathingShowerReady(flow, nodes)
  const save = (next: BathingFlow) => {
    const state = useScene.getState(),
      level = state.nodes[levelId]
    if (level && !state.readOnly)
      state.updateNode(levelId, {
        metadata: { ...level.metadata, [bathingMetadataKey]: next },
      } as Partial<AnyNode>)
  }
  const stop = () => {
    useEditor.getState().setTool(null)
    useEditor.getState().setMode('select')
  }
  const select = (id: string | null) => {
    stop()
    if (id && useScene.getState().nodes[id as AnyNodeId])
      useViewer
        .getState()
        .setSelection({ levelId, selectedIds: [id as AnyNodeId] })
  }
  const go = (next: BathingFlow) => {
    stop()
    save(next)
    select(
      next.step === 'bath' || next.kind === 'bath'
        ? next.bathId
        : next.showerId,
    )
  }
  useEffect(() => {
    setGuidedPlacementContext({
      vanityId: null,
      basinId: null,
      showerArmId:
        flow.system === 'custom' && ['head', 'control'].includes(flow.step)
          ? flow.showerId
          : null,
    })
    return () => setGuidedPlacementContext(null)
  }, [flow.step, flow.system, flow.showerId])
  useEffect(() => {
    let previous = useScene.getState().nodes
    return useScene.subscribe((state) => {
      const before = previous
      previous = state.nodes
      if (
        before === state.nodes ||
        state.readOnly ||
        !useEditor.getState().tool
      )
        return
      const current = reconcileBathingArea(
        readBathingArea(state.nodes[levelId]?.metadata?.[bathingMetadataKey]),
        state.nodes,
      )
      const created = Object.values(state.nodes).filter(
        (node) =>
          !before[node.id] &&
          vanityLevelId(node.parentId, state.nodes) === levelId,
      )
      let next: BathingFlow | null = null
      if (current.step === 'divider') {
        const dividers = created.filter(
          (node) => String(node.type) === SHOWER_DIVIDER,
        )
        if (dividers.length)
          next = {
            ...current,
            dividerIds: [
              ...current.dividerIds,
              ...dividers.map((node) => node.id),
            ],
            dividerSkipped: false,
            step: 'complete',
          }
      } else
        for (const node of created) {
          if (
            current.step === 'head' &&
            String(node.type) === SHOWER_HEAD &&
            bathingHead(current, state.nodes)?.id === node.id
          )
            next = { ...current, step: 'control' }
          else next = acceptBathingPlacement(current, node)
          if (next) break
        }
      if (!next) return
      stop()
      if (next.controlId && next.showerId && current.step === 'control') {
        const control = state.nodes[next.controlId as AnyNodeId]
        if (control)
          state.updateNode(
            control.id as AnyNodeId,
            {
              metadata: {
                ...control.metadata,
                bathSpaceShowerId: next.showerId,
              },
            } as Partial<AnyNode>,
          )
      }
      const level = state.nodes[levelId]!
      state.updateNode(levelId, {
        metadata: { ...level.metadata, [bathingMetadataKey]: next },
      } as Partial<AnyNode>)
    })
  }, [levelId])
  const choose = (kind: BathingFlow['kind']) =>
    go({
      ...(flow.kind === kind ? flow : { ...emptyBathingArea, dividerIds: [] }),
      kind,
      step: kind === 'shower' ? 'shower' : 'bath',
    })
  const changeSystem = (system: BathingFlow['system']) => {
    if (system !== flow.system)
      go({ ...flow, system, showerId: null, controlId: null })
  }
  const title: Record<BathingStep, string> = {
    choice: 'Bath or shower?',
    bath: 'Choose a bath',
    shower:
      flow.system === 'custom' ? '1. Place the shower arm' : 'Choose a shower',
    head: '2. Choose the shower head',
    control: '3. Add the water control',
    review: 'Review your bathing area',
    divider: 'Add a glass divider',
    complete: 'Bathing area complete',
  }
  const description: Record<BathingStep, string> = {
    choice: '',
    bath: flow.bathId
      ? 'Bath added. Select it to edit.'
      : 'Choose a shape, then click the floor.',
    shower:
      flow.system === 'custom' &&
      flow.showerId &&
      nodes[flow.showerId as AnyNodeId]
        ? 'Arm added. Choose a shower head next.'
        : flow.showerId && showerReady
          ? 'Shower added. Continue to review.'
          : flow.system === 'custom'
            ? 'Choose an arm, then click a wall.'
            : flow.system === 'assembly'
              ? 'Choose a style, then click a wall.'
              : 'Choose a style, then click a wall. All parts included.',
    head: 'Choose a head, then click the highlighted arm.',
    control: 'Place the control on the wall below the shower arm.',
    review: 'Check the placement. Select an item to edit.',
    divider:
      'Click two points to draw. Press Enter to finish a rectangle, or skip.',
    complete: 'Bathing area ready. Select an item to edit.',
  }
  const ready =
    flow.step === 'bath'
      ? Boolean(flow.bathId)
      : flow.step === 'shower'
        ? flow.system === 'custom'
          ? Boolean(
              flow.showerId &&
                String(nodes[flow.showerId as AnyNodeId]?.type) === SHOWER_ARM,
            )
          : showerReady
        : flow.step === 'head'
          ? Boolean(head)
          : flow.step === 'control'
            ? Boolean(flow.controlId)
            : true
  const nextStep = (): BathingStep =>
    flow.step === 'bath'
      ? flow.kind === 'both'
        ? 'shower'
        : 'review'
      : flow.step === 'shower'
        ? flow.system === 'custom'
          ? 'head'
          : 'review'
        : flow.step === 'head'
          ? 'control'
          : flow.step === 'control'
            ? 'review'
            : flow.step === 'review'
              ? flow.kind === 'bath'
                ? 'complete'
                : 'divider'
              : 'complete'
  const backStep = (): BathingStep =>
    flow.step === 'bath'
      ? 'choice'
      : flow.step === 'shower'
        ? flow.kind === 'both'
          ? 'bath'
          : 'choice'
        : flow.step === 'head'
          ? 'shower'
          : flow.step === 'control'
            ? 'head'
            : flow.step === 'review'
              ? flow.kind === 'bath'
                ? 'bath'
                : flow.system === 'custom'
                  ? 'control'
                  : 'shower'
              : 'review'
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex justify-between gap-2">
          <h1 className="text-sm font-semibold">Build your bathing area</h1>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => {
              stop()
              onBrowse()
            }}
          >
            Browse all
          </button>
        </div>
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground underline"
          onClick={() => {
            stop()
            onToilet()
          }}
        >
          Back to toilet area
        </button>
        <h2 className="mt-3 text-sm font-semibold">{title[flow.step]}</h2>
        {description[flow.step] && (
          <p
            role="status"
            className="mt-1 text-xs leading-relaxed text-muted-foreground"
          >
            {description[flow.step]}
          </p>
        )}
      </header>
      <CatalogScrollArea
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
        resetKey={`${flow.step}:${flow.system}`}
      >
        {flow.step === 'choice' && (
          <div className="space-y-2">
            {(['shower', 'bath', 'both'] as const).map((kind) => (
              <button
                type="button"
                key={kind}
                className={`${button} w-full text-left`}
                onClick={() => choose(kind)}
              >
                {kind === 'shower'
                  ? 'Shower'
                  : kind === 'bath'
                    ? 'Bath'
                    : 'Bath + shower'}
              </button>
            ))}
          </div>
        )}
        {flow.step === 'bath' && (
          <>
            <BathCatalog query="" />
            {flow.bathId && (
              <button
                type="button"
                className={`${button} mt-3 w-full`}
                onClick={() => select(flow.bathId)}
              >
                Edit my bath
              </button>
            )}
          </>
        )}
        {flow.step === 'shower' && (
          <>
            <div className="mb-3 space-y-2">
              {flow.system === 'kit' && !showShowerOptions && (
                <div className="rounded-md bg-accent p-3">
                  <p className="text-xs font-medium">
                    Complete shower · Recommended
                  </p>
                </div>
              )}
              <button
                type="button"
                className="text-xs underline"
                aria-expanded={showShowerOptions}
                onClick={() => setShowShowerOptions(!showShowerOptions)}
              >
                {showShowerOptions
                  ? 'Hide shower options'
                  : 'Other shower options'}
              </button>
              {showShowerOptions && (
                <div className="space-y-2">
                  {(
                    [
                      {
                        id: 'kit',
                        label: 'Complete shower · Recommended',
                        detail: 'All parts included.',
                      },
                      {
                        id: 'assembly',
                        label: 'Shower column or panel',
                        detail: 'One unit with built-in outlets.',
                      },
                      {
                        id: 'custom',
                        label: 'Choose each part separately',
                        detail: 'Arm, head, then water control.',
                      },
                    ] as const
                  ).map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      className={`${button} w-full text-left ${flow.system === option.id ? 'border-primary bg-primary/10' : ''}`}
                      aria-pressed={flow.system === option.id}
                      onClick={() => changeSystem(option.id)}
                    >
                      <span className="block">{option.label}</span>
                      <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                        {option.detail}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {flow.system === 'kit' ? (
              <ShowerKitCatalog query="" />
            ) : flow.system === 'assembly' ? (
              <ShowerAssemblyCatalog query="" />
            ) : (
              <ShowerArmCatalog query="" />
            )}
          </>
        )}
        {flow.step === 'head' && (
          <>
            <button
              type="button"
              className={`${button} mb-3 w-full`}
              onClick={() => select(flow.showerId)}
            >
              Highlight my shower arm
            </button>
            <ShowerHeadCatalog query="" />
          </>
        )}
        {flow.step === 'control' && <ShowerControlCatalog query="" />}
        {flow.step === 'divider' && <DividerCatalog query="" />}
        {flow.step === 'review' && flow.bathId && (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Choose a tap, then click the bath's tap target.
            </p>
            <TapCatalog query="" />
          </>
        )}
        {['review', 'complete'].includes(flow.step) && (
          <div className="space-y-2">
            {flow.showerId && (
              <button
                type="button"
                className={`${button} w-full text-left`}
                onClick={() => select(flow.showerId)}
              >
                My shower · Edit
              </button>
            )}
            {flow.showerId &&
              fixtures.some(
                (n) =>
                  n.id !== flow.showerId &&
                  n.id !== flow.bathId &&
                  !flow.dividerIds.includes(n.id),
              ) && (
                <button
                  type="button"
                  className="text-xs underline"
                  aria-expanded={showParts}
                  onClick={() => setShowParts(!showParts)}
                >
                  {showParts ? 'Hide shower parts' : 'Adjust shower parts'}
                </button>
              )}
            {fixtures
              .filter(
                (node) =>
                  node.id !== flow.showerId &&
                  (showParts ||
                    node.id === flow.bathId ||
                    flow.dividerIds.includes(node.id)),
              )
              .map((node) => (
                <button
                  type="button"
                  key={node.id}
                  className={`${button} w-full text-left`}
                  onClick={() => select(node.id)}
                >
                  {node.name ||
                    String(node.type)
                      .replace('bath-space:', '')
                      .replaceAll('-', ' ')}{' '}
                  · Edit
                </button>
              ))}
          </div>
        )}
      </CatalogScrollArea>
      <footer className="shrink-0 space-y-2 border-t border-border p-4">
        {flow.step === 'complete' ? (
          <>
            <button
              type="button"
              className={`${button} w-full`}
              onClick={() => go({ ...emptyBathingArea, dividerIds: [] })}
            >
              Add another bathing area
            </button>
            <button
              type="button"
              className={`${primary} w-full`}
              onClick={() => {
                stop()
                onAccessories()
              }}
            >
              Next: Accessories
            </button>
          </>
        ) : flow.step !== 'choice' ? (
          <div className="flex gap-2">
            <button
              type="button"
              className={button}
              onClick={() => go({ ...flow, step: backStep() })}
            >
              Back
            </button>
            <button
              type="button"
              className={`${primary} flex-1`}
              disabled={!ready}
              onClick={() =>
                go({
                  ...flow,
                  step: nextStep(),
                  ...(flow.step === 'divider' ? { dividerSkipped: true } : {}),
                })
              }
            >
              {flow.step === 'bath' && flow.kind === 'both'
                ? 'Next: Choose shower'
                : flow.step === 'shower' && flow.system === 'custom'
                  ? 'Next: Shower head'
                  : ['bath', 'shower', 'control'].includes(flow.step)
                    ? 'Next: Review bathing area'
                    : flow.step === 'head'
                      ? 'Next: Shower control'
                      : flow.step === 'review'
                        ? flow.kind === 'bath'
                          ? 'Finish bathing area'
                          : 'Next: Glass divider'
                        : 'Skip glass divider'}
            </button>
          </div>
        ) : null}
      </footer>
    </div>
  )
}
