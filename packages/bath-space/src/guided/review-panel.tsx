'use client'
import { useScene, type AnyNode, type LevelNode } from '@pascal-app/core'
import { useEditor } from '@pascal-app/editor'
import { CatalogScrollArea } from '../catalog-ui'
import AreaSummary from './area-summary'
import { bathroomReviewState, reviewFixLabel } from './review-state'
import type { BathroomStage } from './workflow'
import type { Area, ReviewIssue } from './bathroom-review'

const button = 'rounded-md border border-border px-3 py-2 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40'
export default function BathroomReviewPanel({ levelId, onStage, onFix, onAccessory }: { levelId: LevelNode['id']; onStage: (stage: BathroomStage) => void; onFix: (issue: ReviewIssue) => void; onAccessory: (area: Area, kind: string) => void }) {
  const nodes = useScene((state) => state.nodes)
  const review = bathroomReviewState(levelId, nodes)
  const save = (patch: Record<string, unknown>) => {
    useEditor.getState().setTool(null)
    useEditor.getState().setMode('select')
    const state = useScene.getState(), level = state.nodes[levelId]
    if (level && !state.readOnly) state.updateNode(levelId, { metadata: { ...level.metadata, ...patch } } as Partial<AnyNode>)
  }
  const exclude = (area: Area) => {
    const state = useScene.getState()
    const group = bathroomReviewState(levelId, state.nodes).groups.find((group) => group.id === area)
    if (!group || group.fixtures.length) return
    const raw = state.nodes[levelId]?.metadata?.bathSpaceExcludedAreas
    save({ bathSpaceExcludedAreas: [...new Set([...(Array.isArray(raw) ? raw : []), area])], bathSpaceReviewed: false })
  }
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 space-y-2 p-4">
        <h1 className="text-sm font-semibold">{review.finished ? 'Your bathroom is complete' : 'Review your bathroom'}</h1>
        <p role="status" className="text-xs text-muted-foreground">{review.finished ? 'Essentials reviewed. Your fixtures are ready to edit or replace below.' : review.issues.length ? `${review.issues.length} essential ${review.issues.length === 1 ? 'item needs' : 'items need'} attention.` : !review.layoutReady ? 'Check your main fixture layout before finishing.' : 'Essentials are ready. You can finish or add optional accessories.'}</p>
      </header>
      <CatalogScrollArea resetKey={review.finished ? 'finished' : 'review'} className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 px-4 pb-4">
          {review.finished && <div aria-label="Bathroom summary" className="grid grid-cols-3 gap-2">
            {[{ label: 'Areas', count: review.areaCount }, { label: 'Fixtures & fittings', count: review.fixtureCount }, { label: 'Accessories', count: review.optionalCount }].map((item) => <div key={item.label} className="rounded-md border border-border bg-secondary/30 p-2"><strong className="block text-lg">{item.count}</strong><span className="text-[10px] text-muted-foreground">{item.label}</span></div>)}
          </div>}
          {!review.layoutReady && <section aria-label="Layout check" className="space-y-2 rounded-md border border-border p-3"><h2 className="text-xs font-semibold">Layout needs attention</h2><p className="text-xs text-muted-foreground">Place all selected main fixtures and check their positions.</p><button type="button" className={button} onClick={() => onStage('layout')}>Check layout</button></section>}
          <section aria-label={review.finished ? 'Completed areas' : 'Essential fixtures'} className="space-y-3">
            <h2 className="text-xs font-semibold">{review.finished ? 'Completed areas' : 'Essential fixtures'}</h2>
            {review.groups.filter((group) => group.included).map((group) => <section key={group.id} aria-label={`${group.label} review`} className="space-y-3 border-t border-border/60 pt-3">
              <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-semibold">{group.label}</h3><span className="text-[11px] text-muted-foreground">{group.issues.length ? 'Needs attention' : 'Ready'}</span></div>
              {group.issues.map((issue) => <div key={issue.id} className="space-y-2 border-t border-border pt-2">
                <p className="text-xs">{issue.message}</p>
                <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => onFix(issue)}>{reviewFixLabel(issue)}</button>
                  {issue.id === group.id && !group.fixtures.length && <button type="button" className={button} onClick={() => exclude(group.id)}>Not included</button>}
                </div>
              </div>)}
              {group.fixtures.length > 0 && <details open className="group space-y-3"><summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[11px] text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"><span>{group.fixtures.length} {group.fixtures.length === 1 ? 'item' : 'items'}</span><svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" className="group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg></summary><AreaSummary visual hideHeading title={`${group.label} items`} nodes={group.fixtures} levelId={levelId} /></details>}
            </section>)}
            {review.groups.some((group) => !group.included) && <p className="text-[11px] text-muted-foreground">Not included: {review.groups.filter((group) => !group.included).map((group) => group.label).join(', ')}.</p>}
          </section>
          <details className="space-y-3 rounded-md border border-border p-3">
            <summary className="cursor-pointer text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring">Optional accessories</summary>
            <p className="text-[11px] text-muted-foreground">These suggestions do not prevent you from finishing.</p>
            {review.groups.filter((group) => group.included).map((group) => <section key={group.id} className="space-y-2"><h3 className="text-xs font-medium">{group.label}</h3>{group.optional.map((choice) => <div key={choice.kind} className="flex items-center justify-between gap-2"><div><span className="block text-xs">{choice.label}</span><span className="text-[11px] text-muted-foreground">{choice.count ? `${choice.count} added` : choice.status === 'Skipped' ? 'Skipped' : choice.hint}</span></div><button type="button" className={button} onClick={() => onAccessory(group.id, choice.kind)}>{choice.count ? 'Edit' : 'Add'}</button></div>)}</section>)}
          </details>
          {!review.finished && <p className="text-[11px] text-muted-foreground">Check spacing, door access, and reach in the scene. This review checks fixture completeness.</p>}
        </div>
      </CatalogScrollArea>
      <footer className="shrink-0 space-y-2 border-t border-border p-4">
        {review.finished ? <button type="button" className={`${button} w-full`} onClick={() => save({ bathSpaceReviewed: false })}>Review again</button> : <button type="button" className={`${button} w-full bg-primary text-primary-foreground hover:bg-primary/90`} onClick={() => {
          const state = useScene.getState()
          const latest = bathroomReviewState(levelId, state.nodes)
          if (latest.issues[0]) { onFix(latest.issues[0]); return }
          if (!latest.layoutReady) { onStage('layout'); return }
          save({ bathSpaceLayoutComplete: true, bathSpaceReviewed: true })
        }}>Finish bathroom</button>}
        <button type="button" className={`${button} w-full`} onClick={() => onStage('accessories')}>{review.finished ? 'Add accessories' : 'Back to accessories'}</button>
      </footer>
    </div>
  )
}
