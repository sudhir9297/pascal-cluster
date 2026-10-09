import { bathroomLayout } from './layout'
import type { AnyNode } from '@pascal-app/core'
import { accessoryChoices, areaAnchors, areas, bathroomIssues, levelFixtures, matchedAccessories } from './bathroom-review'

export type BathroomStage = 'layout' | 'wash-area' | 'toilet' | 'bathing' | 'accessories' | 'review'
export type WorkflowStatus = 'Not started' | 'In progress' | 'Complete' | 'Not included'
export type WorkflowArea = { id: BathroomStage; label: string; status: WorkflowStatus }

export function bathroomWorkflow(levelId: string, nodes: Readonly<Record<string, AnyNode>>): WorkflowArea[] {
  const metadata = nodes[levelId]?.metadata
  const excluded = Array.isArray(metadata?.bathSpaceExcludedAreas) ? metadata.bathSpaceExcludedAreas : []
  const fixtures = levelFixtures(levelId, nodes)
  const issues = bathroomIssues(levelId, nodes, excluded)
  const result: WorkflowArea[] = areas.map((area) => {
    const placed = areaAnchors(area.id, fixtures).length > 0
    return {
      ...area,
      status: !placed && excluded.includes(area.id) ? 'Not included' : !placed ? 'Not started' : issues.some((issue) => issue.area === area.id) ? 'In progress' : 'Complete',
    }
  })
  if (metadata?.bathSpaceSetupComplete === true) {
    const layout = bathroomLayout(levelId, nodes)
    const placed = layout.filter((fixture) => fixture.node).length
    result.unshift({ id: 'layout', label: 'Layout', status: metadata.bathSpaceLayoutComplete === true && placed === layout.length ? 'Complete' : placed ? 'In progress' : 'Not started' })
  }
  const saved = metadata?.bathSpaceAccessories as { skipped?: unknown } | undefined
  const skipped = Array.isArray(saved?.skipped) ? saved.skipped : []
  const choices = areas.flatMap((area) => !areaAnchors(area.id, fixtures).length && excluded.includes(area.id) ? [] : accessoryChoices[area.id].map((choice) => ({ area: area.id, kind: choice.kind })))
  const done = choices.filter((choice) => skipped.includes(`${choice.area}:${choice.kind}`) || matchedAccessories(choice.area, choice.kind, fixtures).length > 0).length
  result.push({ id: 'accessories', label: 'Accessories', status: done === choices.length ? 'Complete' : done > 0 ? 'In progress' : 'Not started' })
  const layoutReady = !result.some((area) => area.id === 'layout' && area.status !== 'Complete')
  result.push({ id: 'review', label: 'Review', status: metadata?.bathSpaceReviewed === true && !issues.length && layoutReady ? 'Complete' : metadata?.bathSpaceReviewed === true || metadata?.bathSpaceStage === 'review' ? 'In progress' : 'Not started' })
  return result
}

export function nextBathroomStage(workflow: WorkflowArea[]): BathroomStage {
  if (workflow.find((area) => area.id === 'review')?.status === 'Complete') return 'review'
  return workflow.find((area) => area.status !== 'Complete' && area.status !== 'Not included')?.id ?? 'review'
}
