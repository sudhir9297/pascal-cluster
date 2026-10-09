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
import BathSpaceCatalog from './catalog-panel'
import FinishingBuilder from './guided/finishing-builder'
import { type ReviewIssue } from './guided/bathroom-review'
import { emptyToilet, toiletMetadataKey } from './guided/toilet'
import { emptyBathingArea, bathingMetadataKey } from './guided/bathing-area'
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
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-sm font-semibold">Build your wash area</h1>
          <button
            type="button"
            className="text-xs text-muted-foreground underline"
            onClick={() => {
              stopPlacement()
              onBrowse()
            }}
          >
            Browse all
          </button>
        </div>
        <nav aria-label="Wash area steps" className="mt-4 flex gap-2">
          {steps.map((step, index) => (
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
              className={`${button} flex-1 px-1 ${flow.step === step.id ? 'border-primary bg-primary/10 text-primary' : ''}`}
              onClick={() => go({ ...flow, step: step.id })}
            >
              {index + 1}. {step.label}
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
          <div className="space-y-2 px-4">
            {[vanity, basin, tap]
              .filter((node): node is AnyNode => Boolean(node))
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
              Next: Choose toilet
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
  const levelId = useViewer((state) => state.selection.levelId)
  const readOnly = useScene((state) => state.readOnly)
  const stage = useScene((state) =>
    levelId ? state.nodes[levelId]?.metadata?.bathSpaceStage : undefined,
  )
  const setStage = (
    next: 'wash-area' | 'toilet' | 'bathing' | 'accessories' | 'review',
  ) => {
    stopPlacement()
    const state = useScene.getState(),
      level = levelId ? state.nodes[levelId] : undefined
    if (level)
      state.updateNode(
        level.id as AnyNodeId,
        {
          metadata: { ...level.metadata, bathSpaceStage: next },
        } as Partial<AnyNode>,
      )
  }
  if (browse || readOnly)
    return (
      <div className="flex h-full min-h-0 flex-col">
        {!readOnly && (
          <button
            type="button"
            className={`${button} mx-4 mt-4`}
            onClick={() => {
              stopPlacement()
              setBrowse(false)
            }}
          >
            Return to guided bathroom
          </button>
        )}
        <div className="min-h-0 flex-1">
          <BathSpaceCatalog />
        </div>
      </div>
    )
  if (!levelId)
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Select a floor to begin.
      </div>
    )
  const fix = (issue: ReviewIssue) => {
    stopPlacement()
    const state = useScene.getState(),
      level = state.nodes[levelId],
      host = issue.hostId ? state.nodes[issue.hostId as AnyNodeId] : undefined
    if (!level) return
    let patch: Record<string, unknown> = {}
    if (issue.area === 'wash-area')
      patch = {
        [washAreaMetadataKey]: {
          ...emptyWashArea,
          step: issue.step,
          vanityId:
            issue.step === 'basin'
              ? issue.hostId
              : host?.parentId &&
                  /vanity$/.test(
                    String(state.nodes[host.parentId as AnyNodeId]?.type),
                  )
                ? host.parentId
                : null,
          basinId: issue.step === 'tap' ? issue.hostId : null,
          withoutVanity:
            issue.step === 'tap' &&
            !/vanity$/.test(
              String(
                host?.parentId
                  ? state.nodes[host.parentId as AnyNodeId]?.type
                  : '',
              ),
            ),
        },
      }
    if (issue.area === 'toilet')
      patch = {
        [toiletMetadataKey]: {
          ...emptyToilet,
          step: issue.step,
          toiletId: issue.hostId,
          mounting: String(host?.type).includes('wall-hung') ? 'wall' : 'floor',
        },
      }
    if (issue.area === 'bathing')
      patch = {
        [bathingMetadataKey]: {
          ...emptyBathingArea,
          step: issue.step,
          kind: issue.hostId
            ? String(host?.type) === 'bath-space:bathtub'
              ? 'bath'
              : 'shower'
            : null,
          system: issue.system ?? 'kit',
          bathId:
            String(host?.type) === 'bath-space:bathtub' ? issue.hostId : null,
          showerId:
            String(host?.type) === 'bath-space:bathtub' ? null : issue.hostId,
        },
      }
    state.updateNode(levelId, {
      metadata: {
        ...level.metadata,
        ...patch,
        bathSpaceStage: issue.area,
        bathSpaceReviewed: false,
      },
    } as Partial<AnyNode>)
    if (host)
      useViewer
        .getState()
        .setSelection({ levelId, selectedIds: [host.id as AnyNodeId] })
  }
  if (stage === 'accessories' || stage === 'review')
    return (
      <FinishingBuilder
        key={levelId}
        levelId={levelId}
        review={stage === 'review'}
        onStage={setStage}
        onFix={fix}
      />
    )
  const content =
    stage === 'bathing' ? (
      <BathingBuilder
        key={levelId}
        levelId={levelId}
        onToilet={() => setStage('toilet')}
        onAccessories={() => setStage('accessories')}
        onBrowse={() => setBrowse(true)}
      />
    ) : stage === 'toilet' ? (
      <ToiletBuilder
        key={levelId}
        levelId={levelId}
        onWashArea={() => setStage('wash-area')}
        onBathing={() => setStage('bathing')}
        onBrowse={() => setBrowse(true)}
      />
    ) : (
      <WashAreaBuilder
        key={levelId}
        levelId={levelId}
        onBrowse={() => setBrowse(true)}
        onToilet={() => setStage('toilet')}
      />
    )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        className={`${button} mx-4 mt-3`}
        onClick={() => setStage('review')}
      >
        Review bathroom
      </button>
      <div className="min-h-0 flex-1">{content}</div>
    </div>
  )
}
