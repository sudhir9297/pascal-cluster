'use client'
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
import { CatalogScrollArea } from '../catalog-ui'
import {
  accessoryChoices,
  areaAnchors,
  areas,
  bathroomIssues,
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
  onStage: (stage: Area | 'accessories' | 'review') => void
  onFix: (issue: ReviewIssue) => void
}) {
  const nodes = useScene((s) => s.nodes),
    level = nodes[levelId]
  const saved = level?.metadata?.bathSpaceAccessories as
    | { area?: Area; choice?: string; skipped?: string[] }
    | undefined
  const area = areas.some((a) => a.id === saved?.area)
    ? saved!.area!
    : 'wash-area'
  const choices = accessoryChoices[area],
    choice = choices.find((c) => c.kind === saved?.choice) ?? choices[0]
  const skipped = Array.isArray(saved?.skipped) ? saved.skipped : []
  const excludedRaw = level?.metadata?.bathSpaceExcludedAreas
  const excluded = Array.isArray(excludedRaw)
    ? excludedRaw.filter((v): v is string => typeof v === 'string')
    : []
  const fixtures = levelFixtures(levelId, nodes),
    issues = bathroomIssues(levelId, nodes, excluded)
  const finished = level?.metadata?.bathSpaceReviewed === true
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
    if (review) return
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
      const i = areas.findIndex((a) => a.id === area)
      if (i < areas.length - 1) change(areas[i + 1]!.id)
      else onStage('review')
    }
  }
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
          {review ? 'Review bathroom' : 'Add accessories'}
        </h1>
        <p className="text-xs text-muted-foreground" role="status">
          {review
            ? issues.length
              ? `${issues.length} basic ${issues.length === 1 ? 'item needs' : 'items need'} attention. Accessories are optional.`
              : finished
                ? 'Bathroom reviewed.'
                : 'Basics ready. Check the room before finishing.'
            : 'Accessories are optional.'}
        </p>
        {!review && (
          <>
            <nav aria-label="Accessory areas" className="flex gap-1">
              {areas.map((a) => (
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
            {matches.map((n) => (
              <button
                key={n.id}
                className={`${button} w-full`}
                onClick={() => select(n.id)}
              >
                {n.name || choice.label} · Edit
              </button>
            ))}
          </>
        )}
      </header>
      <CatalogScrollArea
        resetKey={`${review}:${area}:${choice.kind}`}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="space-y-4 px-4 pb-4">
          {review ? (
            <>
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="space-y-2 rounded-md border border-border p-3"
                >
                  <p className="text-xs">{issue.message}</p>
                  <button className={button} onClick={() => onFix(issue)}>
                    Fix{' '}
                    {areas
                      .find((a) => a.id === issue.area)
                      ?.label.toLowerCase()}
                  </button>
                  {!issue.hostId && (
                    <button
                      className={`${button} ml-1`}
                      onClick={() =>
                        save({
                          bathSpaceExcludedAreas: [...excluded, issue.area],
                        })
                      }
                    >
                      Not included
                    </button>
                  )}
                </div>
              ))}
              {areas.map((a) => (
                <section key={a.id} className="space-y-2">
                  <h2 className="text-sm font-semibold">{a.label}</h2>
                  {excluded.includes(a.id) &&
                    !areaAnchors(a.id, fixtures).length && (
                      <button
                        className={button}
                        onClick={() =>
                          save({
                            bathSpaceExcludedAreas: excluded.filter(
                              (id) => id !== a.id,
                            ),
                          })
                        }
                      >
                        Not included · Include this area
                      </button>
                    )}
                  {areaAnchors(a.id, fixtures).map((n) => (
                    <button
                      key={n.id}
                      className={`${button} w-full text-left`}
                      onClick={() => select(n.id)}
                    >
                      {n.name || String(n.type).replace('bath-space:', '')} ·
                      Edit
                    </button>
                  ))}
                  {accessoryChoices[a.id].map((c) => {
                    const count = matchedAccessories(
                        a.id,
                        c.kind,
                        fixtures,
                      ).length,
                      skip = skipped.includes(`${a.id}:${c.kind}`)
                    return (
                      <button
                        key={c.kind}
                        className={`${button} w-full text-left`}
                        onClick={() => {
                          change(a.id, c.kind)
                          onStage('accessories')
                        }}
                      >
                        {c.label}:{' '}
                        {count
                          ? `${count} added`
                          : skip
                            ? 'skipped'
                            : 'Optional'}
                      </button>
                    )
                  })}
                </section>
              ))}
              <p className="text-xs text-muted-foreground">
                Check spacing in the scene. This review checks fixtures only.
              </p>
            </>
          ) : choice.kind === 'mirror' ? (
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
        {review ? (
          <>
            <button
              className={`${primary} w-full`}
              disabled={issues.length > 0}
              onClick={() => {
                stopFinishingPlacement()
                save({ bathSpaceReviewed: true })
              }}
            >
              Finish bathroom
            </button>
            <button
              className={`${button} w-full`}
              onClick={() => onStage('accessories')}
            >
              Back to accessories
            </button>
          </>
        ) : (
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
              onClick={() => onStage('bathing')}
            >
              Back to bath or shower
            </button>
          </>
        )}
      </footer>
    </div>
  )
}
