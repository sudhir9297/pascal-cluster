'use client'
import BathroomReviewPanel from './review-panel'
import AreaSummary from './area-summary'
import { useEffect } from 'react'
import {
  useScene,
  type AnyNode,
  type AnyNodeId,
  type LevelNode,
} from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { useEditor } from '@pascal-app/editor'
import MirrorCatalog from '../mirror/catalog'
import LightCatalog from '../wall-light/catalog'
import TowelCatalog from '../towel-rail/catalog'
import HolderCatalog from '../toilet-paper-holder/catalog'
import type { BathroomStage } from './workflow'
import { includedBathroomAreas } from './setup'
import { CatalogScrollArea } from '../catalog-ui'
import {
  accessoryChoices,
  areaAnchors,
  areas,
  levelFixtures,
  matchedAccessories,
  type Area,
  type ReviewIssue,
} from './bathroom-review'
const button =
  'rounded-md border border-border px-3 py-2 text-xs hover:bg-accent disabled:opacity-40'
const primary = `${button} bg-primary text-primary-foreground hover:bg-primary/90`
export function stopFinishingPlacement() {
  useEditor.getState().setTool(null)
  useEditor.getState().setMode('select')
}
export default function FinishingBuilder({
  levelId,
  review,
  onStage,
  onFix,
}: {
  levelId: LevelNode['id']
  review: boolean
  onStage: (stage: BathroomStage) => void
  onFix: (issue: ReviewIssue) => void
}) {
  const nodes = useScene((s) => s.nodes),
    level = nodes[levelId]
  const saved = level?.metadata?.bathSpaceAccessories as
    | { area?: Area; choice?: string; skipped?: string[] }
    | undefined
  const included = includedBathroomAreas(levelId, nodes)
  const activeAreas = areas.filter((a) => included.includes(a.id))
  const area = activeAreas.some((a) => a.id === saved?.area) ? saved!.area! : activeAreas[0]?.id ?? 'wash-area'
  const choices = accessoryChoices[area],
    choice = choices.find((c) => c.kind === saved?.choice) ?? choices[0]
  const skipped = Array.isArray(saved?.skipped) ? saved.skipped : []
  const fixtures = levelFixtures(levelId, nodes)
  const save = (patch: Record<string, unknown>) => {
    stopFinishingPlacement()
    const state = useScene.getState(),
      host = state.nodes[levelId]
    if (host && !state.readOnly)
      state.updateNode(levelId, {
        metadata: { ...host.metadata, ...patch },
      } as Partial<AnyNode>)
  }
  const change = (nextArea: Area, nextChoice?: string) => {
    const current = useScene.getState().nodes[levelId]?.metadata
      ?.bathSpaceAccessories as typeof saved
    save({
      bathSpaceAccessories: {
        ...current,
        area: nextArea,
        choice: nextChoice ?? accessoryChoices[nextArea][0].kind,
        skipped: current?.skipped ?? [],
      },
    })
  }
  const select = (id: string) => {
    stopFinishingPlacement()
    useViewer
      .getState()
      .setSelection({ levelId, selectedIds: [id as AnyNodeId] })
  }
  useEffect(() => {
    if (review || !activeAreas.length) return
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
      const newItems = levelFixtures(levelId, state.nodes).filter(
        (n) => !before[n.id] && String(n.type) === `bath-space:${choice.kind}`,
      )
      if (!newItems.length) return
      stopFinishingPlacement()
      for (const n of newItems)
        state.updateNode(
          n.id as AnyNodeId,
          {
            metadata: { ...n.metadata, bathSpaceAccessoryArea: area },
          } as Partial<AnyNode>,
        )
      const host = state.nodes[levelId]
      if (host)
        state.updateNode(levelId, {
          metadata: {
            ...host.metadata,
            bathSpaceAccessories: {
              ...saved,
              area,
              choice: choice.kind,
              skipped: skipped.filter((k) => k !== `${area}:${choice.kind}`),
            },
          },
        } as Partial<AnyNode>)
    })
  }, [levelId, review, area, choice.kind])
  const next = () => {
    const index = choices.findIndex((c) => c.kind === choice.kind)
    if (index + 1 < choices.length) change(area, choices[index + 1]!.kind)
    else {
      const i = activeAreas.findIndex((a) => a.id === area)
      if (i < activeAreas.length - 1) change(activeAreas[i + 1]!.id)
      else onStage('review')
    }
  }
  if (review) return <BathroomReviewPanel levelId={levelId} onStage={onStage} onFix={onFix} onAccessory={(area, kind) => { change(area, kind); onStage('accessories') }} />
  if (!review && !activeAreas.length) return <div className="space-y-3 p-4"><p className="text-xs text-muted-foreground">No areas need accessories.</p><button type="button" className={primary} onClick={() => onStage('review')}>Review bathroom</button></div>
  const matches = matchedAccessories(area, choice.kind, fixtures)
  const unassigned = fixtures.filter(
    (n) =>
      String(n.type) === `bath-space:${choice.kind}` &&
      !n.metadata?.bathSpaceAccessoryArea &&
      !matches.some((m) => m.id === n.id),
  )
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="space-y-3 p-4">
        <h1 className="text-sm font-semibold">
          Add accessories
        </h1>
        <p className="text-xs text-muted-foreground" role="status">
          Accessories are optional.
        </p>
        {!review && (
          <>
            <nav aria-label="Accessory areas" className="flex gap-1">
              {activeAreas.map((a) => (
                <button
                  key={a.id}
                  className={button}
                  aria-current={a.id === area ? 'step' : undefined}
                  onClick={() => change(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </nav>
            <div className="flex flex-wrap gap-1">
              {choices.map((c) => (
                <button
                  key={c.kind}
                  className={button}
                  aria-pressed={choice.kind === c.kind}
                  onClick={() => change(area, c.kind)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <h2 className="text-sm font-semibold">{choice.label}</h2>
            {unassigned.map((n) => (
              <button
                key={n.id}
                className={`${button} w-full`}
                onClick={() => {
                  stopFinishingPlacement()
                  useScene.getState().updateNode(
                    n.id as AnyNodeId,
                    {
                      metadata: {
                        ...n.metadata,
                        bathSpaceAccessoryArea: area,
                      },
                    } as Partial<AnyNode>,
                  )
                }}
              >
                Use {n.name || choice.label} in this area
              </button>
            ))}
            <p className="text-xs text-muted-foreground">
              {choice.hint}{' '}
              {matches.length
                ? `${matches.length} added. Select to edit.`
                : 'Choose a style, then click a wall.'}
            </p>
            {areaAnchors(area, fixtures).map((n) => (
              <button
                key={n.id}
                className={`${button} mr-1`}
                onClick={() => select(n.id)}
              >
                Highlight {n.name || 'area fixture'}
              </button>
            ))}
            {matches.length > 0 && <AreaSummary title="Added accessories" levelId={levelId} nodes={matches} />}
          </>
        )}
      </header>
      <CatalogScrollArea
        resetKey={`${review}:${area}:${choice.kind}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="space-y-4 px-4 pb-4">
          {choice.kind === 'mirror' ? (
            <MirrorCatalog query="" />
          ) : choice.kind === 'wall-light' ? (
            <LightCatalog query="" />
          ) : choice.kind === 'toilet-paper-holder' ? (
            <HolderCatalog query="" />
          ) : (
            <TowelCatalog query="" />
          )}
        </div>
      </CatalogScrollArea>
      <footer className="space-y-2 border-t border-border p-4">
        {(
          <>
            <button className={`${primary} w-full`} onClick={next}>
              Next
            </button>
            <button
              className={`${button} w-full`}
              onClick={() => {
                save({
                  bathSpaceAccessories: {
                    ...saved,
                    area,
                    choice: choice.kind,
                    skipped: [
                      ...new Set([...skipped, `${area}:${choice.kind}`]),
                    ],
                  },
                })
                next()
              }}
            >
              Skip this accessory
            </button>
            <button
              className={`${button} w-full`}
              onClick={() => onStage('review')}
            >
              Review bathroom
            </button>
            <button
              className={`${button} w-full`}
              onClick={() => onStage(activeAreas.at(-1)?.id ?? 'review')}
            >
              Back to bathroom areas
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
