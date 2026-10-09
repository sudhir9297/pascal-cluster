'use client'
import AreaSummary from './guided/area-summary'
import AreaHeading from './guided/area-heading'

import { useEffect, useId, useState } from 'react'
import {
  useScene,
  type AnyNode,
  type AnyNodeId,
  type LevelNode,
} from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import BathSpaceCatalog from './catalog-panel'
import LayoutBuilder from './guided/layout-builder'
import { bathroomReviewFix } from './guided/review-state'
import { bathroomWashAreaFlow, bathroomLayoutPatch } from './guided/layout'
import { adjacentBathroomStage, includedBathroomAreas } from './guided/setup'
import WorkflowOverview from './guided/workflow-overview'
import type { BathroomStage } from './guided/workflow'
import FinishingBuilder from './guided/finishing-builder'
import { type ReviewIssue } from './guided/bathroom-review'
import ToiletBuilder from './guided/toilet-builder'
import BathingBuilder from './guided/bathing-builder'
import { vanityLevelId } from './freestanding-vanity/wall-placement'
import { setGuidedPlacementContext } from './guided/placement-context'
import {
  acceptWashAreaPlacement,
  emptyWashArea,
  readWashArea,
  reconcileWashArea,
  washAreaMetadataKey,
  washAreaTap,
  type WashAreaFlow,
  type WashAreaStep,
} from './guided/wash-area'

const button =
  'rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed'
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`
const steps: {
  id: WashAreaStep
  label: string
  title: string
  description: string
}[] = [
  {
    id: 'vanity',
    label: 'Vanity',
    title: 'Choose your vanity',
    description: 'Choose a style, then click to place.',
  },
  {
    id: 'basin',
    label: 'Basin',
    title: 'Add your basin',
    description: 'Choose a basin. Place it on the highlighted vanity.',
  },
  {
    id: 'tap',
    label: 'Tap',
    title: 'Choose a tap',
    description:
      'Click the basin for a countertop tap, or the wall behind it for a wall tap.',
  },
]

function stopPlacement() {
  useEditor.getState().setTool(null)
  useEditor.getState().setMode('select')
}

function WashAreaBuilder({
  levelId,
  onBrowse,
  onToilet,
}: {
  levelId: LevelNode['id']
  onBrowse: () => void
  onToilet: () => void
}) {
  const nodes = useScene((state) => state.nodes)
  const level = nodes[levelId]
  const flow = reconcileWashArea(
    readWashArea(level?.metadata?.[washAreaMetadataKey]),
    nodes,
  )
  const vanity = flow.vanityId ? nodes[flow.vanityId as AnyNodeId] : undefined
  const basin = flow.basinId ? nodes[flow.basinId as AnyNodeId] : undefined
  const tap = washAreaTap(flow, nodes)
  const current = steps.find((step) => step.id === flow.step)
  const ready =
    flow.step === 'vanity'
      ? Boolean(vanity)
      : flow.step === 'basin'
        ? Boolean(basin)
        : Boolean(tap)

  const save = (next: WashAreaFlow) => {
    const state = useScene.getState()
    const host = state.nodes[levelId]
    if (!host || state.readOnly) return
    state.updateNode(
      host.id as AnyNodeId,
      {
        metadata: { ...host.metadata, [washAreaMetadataKey]: next },
      } as Partial<AnyNode>,
    )
  }
  const select = (id: string | null) => {
    if (id && useScene.getState().nodes[id as AnyNodeId])
      useViewer
        .getState()
        .setSelection({ levelId, selectedIds: [id as AnyNodeId] })
  }
  const go = (next: WashAreaFlow) => {
    stopPlacement()
    save(next)
    select(next.step === 'tap' ? next.basinId : next.vanityId)
  }

  useEffect(() => {
    setGuidedPlacementContext({
      vanityId: flow.step === 'basin' ? flow.vanityId : null,
      basinId: flow.step === 'tap' ? flow.basinId : null,
    })
    return () => setGuidedPlacementContext(null)
  }, [flow.step, flow.vanityId, flow.basinId])

  useEffect(() => {
    let previous = useScene.getState().nodes
    return useScene.subscribe((state) => {
      const before = previous
      previous = state.nodes
      if (before === state.nodes || !useEditor.getState().tool) return
      const current = reconcileWashArea(
        readWashArea(state.nodes[levelId]?.metadata?.[washAreaMetadataKey]),
        state.nodes,
      )
      for (const node of Object.values(state.nodes)) {
        if (
          before[node.id] ||
          vanityLevelId(node.parentId, state.nodes) !== levelId
        )
          continue
        const next = acceptWashAreaPlacement(current, node)
        if (!next) continue
        stopPlacement()
        const host = state.nodes[levelId]!
        state.updateNode(
          host.id as AnyNodeId,
          {
            metadata: { ...host.metadata, [washAreaMetadataKey]: next },
          } as Partial<AnyNode>,
        )
        return
      }
    })
  }, [levelId])

  const category =
    flow.step === 'vanity' ? 'Vanity' : flow.step === 'basin' ? 'Basin' : 'Taps'
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pb-3 pt-4">
        <AreaHeading title="Wash area" onBrowse={onBrowse} />
        <nav aria-label="Wash area steps" className="mt-4 flex gap-2">
          {steps.map((step) => (
            <button
              type="button"
              key={step.id}
              aria-current={flow.step === step.id ? 'step' : undefined}
              disabled={
                step.id === 'basin'
                  ? !vanity && !flow.withoutVanity
                  : step.id === 'tap'
                    ? !basin
                    : false
              }
              className={`min-h-8 flex-1 rounded-md border-0 px-2 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-ring motion-safe:[&:active:not(:focus-visible)]:scale-[0.98] ${flow.step === step.id ? 'bg-secondary font-medium text-foreground' : 'bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground'}`}
              onClick={() => go({ ...flow, step: step.id })}
            >
              {step.label}
            </button>
          ))}
        </nav>
        <h2 className="mt-4 text-sm font-semibold">
          {current?.title ?? 'Wash area complete'}
        </h2>
        <p
          className="mt-1 text-xs leading-relaxed text-muted-foreground"
          role="status"
        >
          {flow.step === 'complete'
            ? 'Select an item to edit.'
            : flow.step === 'vanity' && vanity
              ? 'Vanity added. Continue to the basin.'
              : flow.step === 'basin' && flow.withoutVanity
                ? 'Choose a basin, then click a wall.'
                : current?.description}
        </p>
        {flow.step === 'vanity' && !vanity && (
          <button
            type="button"
            className="mt-3 text-xs underline"
            onClick={() =>
              go({ ...emptyWashArea, withoutVanity: true, step: 'basin' })
            }
          >
            Use a basin without a vanity
          </button>
        )}
        {flow.step === 'basin' && vanity && (
          <button
            type="button"
            className={`${button} mt-3 w-full`}
            onClick={() => select(vanity.id)}
          >
            Highlight my vanity
          </button>
        )}
        {flow.step === 'tap' && basin && (
          <button
            type="button"
            className={`${button} mt-3 w-full`}
            onClick={() => select(basin.id)}
          >
            Highlight my basin
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1">
        {flow.step === 'complete' ? (
          <div className="h-full space-y-2 overflow-y-auto px-4 pb-4">
            <AreaSummary visual title="Wash area fixtures" levelId={levelId} nodes={[vanity, basin, tap].filter((node): node is AnyNode => Boolean(node))} />
          </div>
        ) : (
          <BathSpaceCatalog
            key={`${flow.step}:${flow.withoutVanity}`}
            category={category}
            basinMount={flow.withoutVanity ? 'wall' : 'vanity'}
          />
        )}
      </div>
      <footer className="shrink-0 space-y-2 border-t border-border bg-background p-4">
        {flow.step === 'complete' ? (
          <>
            <button
              type="button"
              className={`${primary} w-full`}
              onClick={() => {
                stopPlacement()
                onToilet()
              }}
            >
              Continue to next area
            </button>
            <button
              type="button"
              className={`${button} w-full`}
              onClick={() => go({ ...emptyWashArea })}
            >
              Add another wash area
            </button>
            <button
              type="button"
              className={`${button} w-full`}
              onClick={onBrowse}
            >
              Browse all items
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            {flow.step !== 'vanity' && (
              <button
                type="button"
                className={button}
                onClick={() =>
                  go({
                    ...flow,
                    step: flow.step === 'tap' ? 'basin' : 'vanity',
                    ...(flow.step === 'basin' && flow.withoutVanity
                      ? { withoutVanity: false, basinId: null }
                      : {}),
                  })
                }
              >
                Back
              </button>
            )}
            <button
              type="button"
              className={`${primary} flex-1`}
              disabled={!ready}
              onClick={() =>
                go({
                  ...flow,
                  step:
                    flow.step === 'vanity'
                      ? 'basin'
                      : flow.step === 'basin'
                        ? 'tap'
                        : 'complete',
                })
              }
            >
              {flow.step === 'vanity'
                ? 'Next: Choose basin'
                : flow.step === 'basin'
                  ? 'Next: Choose tap'
                  : 'Finish wash area'}
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}

export default function BathSpacePanel() {
  const [browse, setBrowse] = useState(false)
  const modeId = useId()
  const readOnly = useScene((state) => state.readOnly)
  const catalog = browse || readOnly

  const switchTab = (next: boolean) => {
    stopPlacement()
    setGuidedPlacementContext(null)
    setBrowse(next)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <nav aria-label="Bath Space mode" role="tablist" className="mx-4 mt-4 flex shrink-0 gap-1 rounded-lg bg-secondary/60 p-1">
        {[{ label: 'Guided', catalog: false }, { label: 'Catalog', catalog: true }].map((tab) => (
          <button
            key={tab.label}
            id={`${modeId}-${tab.label}`}
            type="button"
            role="tab"
            aria-controls={`${modeId}-content`}
            aria-selected={catalog === tab.catalog}
            tabIndex={catalog === tab.catalog ? 0 : -1}
            disabled={readOnly && !tab.catalog}
            onClick={() => switchTab(tab.catalog)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
              event.preventDefault()
              const buttons = Array.from(event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'))
              const index = buttons.indexOf(event.currentTarget)
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + buttons.length) % buttons.length
              buttons[next]?.focus()
              buttons[next]?.click()
            }}
            className={`min-h-9 flex-1 rounded-md border-0 px-3 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40 motion-safe:[&:active:not(:focus-visible)]:scale-[0.98] ${catalog === tab.catalog ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div id={`${modeId}-content`} role="tabpanel" aria-labelledby={`${modeId}-${catalog ? 'Catalog' : 'Guided'}`} className="min-h-0 flex-1">
        <BathSpaceContent browse={catalog} onBrowse={() => switchTab(true)} />
      </div>
    </div>
  )
}

function BathSpaceContent({ browse, onBrowse }: { browse: boolean; onBrowse: () => void }) {
  const nodes = useScene((state) => state.nodes)
  const levelId = useViewer((state) => state.selection.levelId)
  const readOnly = useScene((state) => state.readOnly)
  const stage = useScene((state) =>
    levelId ? state.nodes[levelId]?.metadata?.bathSpaceStage : undefined,
  )
  const setStage = (next: BathroomStage) => {
    stopPlacement()
    const state = useScene.getState(),
      level = levelId ? state.nodes[levelId] : undefined
    if (level)
      state.updateNode(
        level.id as AnyNodeId,
        {
          metadata: {
            ...level.metadata,
            bathSpaceStage: next,
            ...(next === 'wash-area' && stage === 'layout' && bathroomWashAreaFlow(levelId!, state.nodes) ? { [washAreaMetadataKey]: bathroomWashAreaFlow(levelId!, state.nodes) } : {}),
            ...(['wash-area', 'toilet', 'bathing'].includes(next) && Array.isArray(level.metadata?.bathSpaceExcludedAreas) && level.metadata.bathSpaceExcludedAreas.includes(next)
              ? { bathSpaceExcludedAreas: level.metadata.bathSpaceExcludedAreas.filter((area) => area !== next), bathSpaceReviewed: false }
              : {}),
          },
        } as Partial<AnyNode>,
      )
  }
  if (browse || readOnly) return <BathSpaceCatalog />
  if (!levelId)
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Select a floor to begin.
      </div>
    )
  const included = includedBathroomAreas(levelId, nodes)
  const fix = (issue: ReviewIssue) => {
    stopPlacement()
    const state = useScene.getState(),
      level = state.nodes[levelId]
    if (!level) return
    const repair = bathroomReviewFix(levelId, issue.id, state.nodes)
    if (!repair || state.readOnly) return
    state.updateNode(levelId, { metadata: repair.metadata } as Partial<AnyNode>)
    useViewer.getState().setSelection({ levelId, selectedIds: repair.focusId ? [repair.focusId as AnyNodeId] : [] })
  }
  const content =
    stage === 'layout' ? (
      <LayoutBuilder key={levelId} levelId={levelId} onWashArea={() => setStage('wash-area')} onFinish={() => {
        stopPlacement()
        const state = useScene.getState()
        const level = state.nodes[levelId]
        const patch = bathroomLayoutPatch(levelId, state.nodes)
        if (level && patch && !state.readOnly) state.updateNode(levelId, { metadata: { ...level.metadata, ...patch } } as Partial<AnyNode>)
      }} />
    ) : stage === 'accessories' || stage === 'review' ? (
      <FinishingBuilder key={levelId} levelId={levelId} review={stage === 'review'} onStage={setStage} onFix={fix} />
    ) : stage === 'bathing' ? (
      <BathingBuilder
        key={levelId}
        levelId={levelId}
        onToilet={() => setStage(adjacentBathroomStage('bathing', 'back', included))}
        onAccessories={() => setStage('accessories')}
        onBrowse={onBrowse}
      />
    ) : stage === 'toilet' ? (
      <ToiletBuilder
        key={levelId}
        levelId={levelId}
        onWashArea={() => setStage(adjacentBathroomStage('toilet', 'back', included))}
        onBathing={() => setStage(adjacentBathroomStage('toilet', 'next', included))}
        onBrowse={onBrowse}
      />
    ) : (
      <WashAreaBuilder
        key={levelId}
        levelId={levelId}
        onBrowse={onBrowse}
        onToilet={() => setStage(adjacentBathroomStage('wash-area', 'next', included))}
      />
    )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <WorkflowOverview levelId={levelId} stage={['layout', 'toilet', 'bathing', 'accessories', 'review'].includes(String(stage)) ? stage as BathroomStage : 'wash-area'} onStage={setStage} />
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  )
}
