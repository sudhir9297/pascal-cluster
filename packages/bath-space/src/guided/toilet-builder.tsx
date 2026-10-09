'use client'
import AreaSummary from './area-summary'
import AreaHeading from './area-heading'
import { useEffect } from 'react'
import {
  useScene,
  type AnyNode,
  type AnyNodeId,
  type LevelNode,
} from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import ToiletCatalog from '../wall-hung-toilet/catalog'
import FloorToiletCatalog from '../floor-standing-toilet/catalog'
import HolderCatalog from '../toilet-paper-holder/catalog'
import { CatalogScrollArea } from '../catalog-ui'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import {
  defaultToiletControl,
  ToiletNode,
  toiletFlushControls,
} from '../flush-control/attachment'
import {
  acceptToiletPlacement,
  emptyToilet,
  readToilet,
  reconcileToilet,
  toiletMetadataKey,
  type ToiletFlow,
  type ToiletStep,
} from './toilet'
const button =
  'rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 disabled:cursor-not-allowed'
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`
const steps: { id: ToiletStep; label: string }[] = [
  { id: 'toilet', label: 'Toilet' },
  { id: 'flush', label: 'Flush' },
  { id: 'holder', label: 'Holder' },
]
function stop() {
  useEditor.getState().setTool(null)
  useEditor.getState().setMode('select')
}
export default function ToiletBuilder({
  levelId,
  onWashArea,
  onBathing,
  onBrowse,
}: {
  levelId: LevelNode['id']
  onWashArea: () => void
  onBathing: () => void
  onBrowse: () => void
}) {
  const nodes = useScene((state) => state.nodes)
  const flow = reconcileToilet(
    readToilet(nodes[levelId]?.metadata?.[toiletMetadataKey]),
    nodes,
  )
  const toilet = flow.toiletId ? nodes[flow.toiletId as AnyNodeId] : undefined
  const control = flow.toiletId
    ? toiletFlushControls(flow.toiletId, nodes)[0]
    : undefined
  const holder = flow.holderId ? nodes[flow.holderId as AnyNodeId] : undefined
  const save = (next: ToiletFlow) => {
    const state = useScene.getState(),
      level = state.nodes[levelId]
    if (level && !state.readOnly)
      state.updateNode(levelId, {
        metadata: { ...level.metadata, [toiletMetadataKey]: next },
      } as Partial<AnyNode>)
  }
  const select = (id?: string) => {
    stop()
    if (id)
      useViewer
        .getState()
        .setSelection({ levelId, selectedIds: [id as AnyNodeId] })
  }
  const go = (next: ToiletFlow) => {
    stop()
    save(next)
    select(next.step === 'flush' ? control?.id : (next.toiletId ?? undefined))
  }
  useEffect(() => {
    let previous = useScene.getState().nodes
    return useScene.subscribe((state) => {
      const before = previous
      previous = state.nodes
      if (before === state.nodes || !useEditor.getState().tool) return
      const current = reconcileToilet(
        readToilet(state.nodes[levelId]?.metadata?.[toiletMetadataKey]),
        state.nodes,
      )
      for (const node of Object.values(state.nodes)) {
        if (
          before[node.id] ||
          vanityLevelId(node.parentId, state.nodes) !== levelId
        )
          continue
        const next = acceptToiletPlacement(current, node)
        if (!next) continue
        stop()
        const level = state.nodes[levelId]!
        state.updateNode(levelId, {
          metadata: { ...level.metadata, [toiletMetadataKey]: next },
        } as Partial<AnyNode>)
        return
      }
    })
  }, [levelId])
  const restoreControl = () => {
    const state = useScene.getState()
    if (
      !toilet ||
      state.readOnly ||
      toiletFlushControls(toilet.id, state.nodes).length
    )
      return
    const parsed = ToiletNode.safeParse(toilet)
    const replacement = parsed.success
      ? defaultToiletControl(parsed.data, state.nodes)
      : null
    if (!replacement) return
    state.applyNodeChanges({
      create: [
        {
          node: replacement as unknown as AnyNode,
          parentId: replacement.parentId as AnyNodeId,
        },
      ],
    })
    select(replacement.id)
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-4 pb-3 pt-4">
        <AreaHeading title="Toilet area" onBrowse={onBrowse} />
        <nav aria-label="Toilet area steps" className="mt-4 flex gap-2">
          {steps.map((step) => (
            <button
              type="button"
              key={step.id}
              className={`min-h-8 flex-1 rounded-md border-0 px-2 py-1.5 text-xs disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring motion-safe:[&:active:not(:focus-visible)]:scale-[0.98] ${flow.step === step.id ? 'bg-secondary font-medium text-foreground' : 'bg-transparent text-muted-foreground hover:bg-accent/40 hover:text-foreground'}`}
              aria-current={flow.step === step.id ? 'step' : undefined}
              disabled={
                step.id !== 'toilet' &&
                (!toilet || (step.id === 'holder' && !control))
              }
              onClick={() => go({ ...flow, step: step.id })}
            >
              {step.label}
            </button>
          ))}
        </nav>
        <h2 className="mt-4 text-sm font-semibold">
          {flow.step === 'toilet'
            ? 'Choose a toilet'
            : flow.step === 'flush'
              ? 'Check the flush control'
              : flow.step === 'holder'
                ? 'Add a paper holder'
                : 'Toilet area complete'}
        </h2>
        <p
          role="status"
          className="mt-1 text-xs leading-relaxed text-muted-foreground"
        >
          {flow.step === 'toilet'
            ? toilet
              ? 'Toilet added. Check the flush control next.'
              : 'Choose a style, then click a wall.'
            : flow.step === 'flush'
              ? control
                ? 'Flush control included. Select it to edit.'
                : 'Restore the missing flush control.'
              : flow.step === 'holder'
                ? 'Place on a wall beside the toilet, or skip.'
                : holder
                  ? 'Toilet area ready.'
                  : 'Toilet area ready. Paper holder skipped.'}
        </p>
      </header>
      <CatalogScrollArea
        className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"
        resetKey={flow.step}
      >
        {flow.step === 'toilet' && (
          <>
            <div className="mb-4 flex gap-2">
              {(['wall', 'floor'] as const).map((mounting) => (
                <button
                  type="button"
                  key={mounting}
                  className={`${button} flex-1 ${flow.mounting === mounting ? 'border-primary bg-primary/10' : ''}`}
                  aria-pressed={flow.mounting === mounting}
                  onClick={() => go({ ...flow, mounting })}
                >
                  {mounting === 'wall' ? 'Wall-hung' : 'Floor-standing'}
                </button>
              ))}
            </div>
            {flow.mounting === 'wall' ? (
              <ToiletCatalog query="" />
            ) : flow.mounting === 'floor' ? (
              <FloorToiletCatalog query="" />
            ) : null}
          </>
        )}
        {flow.step === 'flush' && (
          <button
            type="button"
            className={`${primary} w-full`}
            onClick={control ? () => select(control.id) : restoreControl}
          >
            {control ? 'Edit my flush control' : 'Restore flush control'}
          </button>
        )}
        {flow.step === 'holder' && (
          <>
            <button
              type="button"
              className={`${button} mb-3 w-full`}
              onClick={() => select(toilet?.id)}
            >
              Highlight my toilet
            </button>
            <HolderCatalog query="" />
          </>
        )}
        {flow.step === 'complete' && (
          <AreaSummary title="Toilet area fixtures" levelId={levelId} nodes={[toilet, control, holder].filter((node): node is AnyNode => Boolean(node))} />
        )}
      </CatalogScrollArea>
      <footer className="shrink-0 space-y-2 border-t border-border p-4">
        {flow.step === 'complete' ? (
          <>
            <button
              type="button"
              className={`${button} w-full`}
              onClick={() => go({ ...emptyToilet })}
            >
              Add another toilet area
            </button>
            <button
              type="button"
              className={`${primary} w-full`}
              onClick={() => {
                stop()
                onBathing()
              }}
            >
              Continue to next area
            </button>
          </>
        ) : (
          <div className="flex gap-2">
            {flow.step !== 'toilet' && (
              <button
                type="button"
                className={button}
                onClick={() =>
                  go({
                    ...flow,
                    step: flow.step === 'flush' ? 'toilet' : 'flush',
                  })
                }
              >
                Back
              </button>
            )}
            <button
              type="button"
              className={`${primary} flex-1`}
              disabled={
                flow.step === 'toilet'
                  ? !toilet
                  : flow.step === 'flush'
                    ? !control
                    : false
              }
              onClick={() =>
                go({
                  ...flow,
                  step:
                    flow.step === 'toilet'
                      ? 'flush'
                      : flow.step === 'flush'
                        ? 'holder'
                        : 'complete',
                  ...(flow.step === 'holder' ? { holderSkipped: true } : {}),
                })
              }
            >
              {flow.step === 'toilet'
                ? 'Next: Review flush control'
                : flow.step === 'flush'
                  ? 'Next: Paper holder'
                  : 'Skip paper holder'}
            </button>
          </div>
        )}
      </footer>
    </div>
  )
}
