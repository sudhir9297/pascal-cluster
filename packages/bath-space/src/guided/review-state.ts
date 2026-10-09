import type { AnyNode } from '@pascal-app/core'
import { tapOccupancySlot } from '../countertop-basin/tap-attachment'
import { isBasinKind } from '../countertop-basin/schema'
import { accessoryChoices, areaAnchors, areas, bathroomIssues, levelFixtures, matchedAccessories, type ReviewIssue } from './bathroom-review'
import { bathroomLayout } from './layout'
import { readWashArea, washAreaMetadataKey } from './wash-area'
import { readToilet, toiletMetadataKey } from './toilet'
import { readBathingArea, bathingMetadataKey } from './bathing-area'

export function bathroomReviewState(levelId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const metadata = nodes[levelId]?.metadata
  const excluded = Array.isArray(metadata?.bathSpaceExcludedAreas) ? metadata.bathSpaceExcludedAreas.filter((value): value is string => typeof value === 'string') : []
  const fixtures = levelFixtures(levelId, nodes)
  const issues = bathroomIssues(levelId, nodes, excluded)
  const saved = metadata?.bathSpaceAccessories as { skipped?: unknown } | undefined
  const skipped = Array.isArray(saved?.skipped) ? saved.skipped : []
  const tracked = readBathingArea(metadata?.[bathingMetadataKey])
  const groups = areas.map((area) => {
    const anchors = areaAnchors(area.id, fixtures)
    const included = anchors.length > 0 || !excluded.includes(area.id)
    const ids = new Set<string>(anchors.map((node) => node.id))
    if (area.id === 'bathing' && tracked.controlId && tracked.showerId && ids.has(tracked.showerId)) ids.add(tracked.controlId)
    // Follow attachment identities, including wall-mounted fittings that are siblings of their hosts.
    let changed = true
    while (changed) {
      changed = false
      for (const node of fixtures) {
        if (ids.has(node.id)) continue
        const raw = node as unknown as { servesToiletId?: string }
        const kit = node.metadata?.showerKit as { anchorId?: string } | undefined
        const hosts = [node.parentId, tapOccupancySlot(node)?.hostId, raw.servesToiletId, node.metadata?.bathSpaceShowerId, kit?.anchorId]
        if (hosts.some((host) => typeof host === 'string' && ids.has(host))) { ids.add(node.id); changed = true }
      }
    }
    const optional = included ? accessoryChoices[area.id].map((choice) => {
      const matches = matchedAccessories(area.id, choice.kind, fixtures)
      for (const node of matches) ids.add(node.id)
      return { ...choice, count: matches.length, status: matches.length ? 'Added' as const : skipped.includes(`${area.id}:${choice.kind}`) ? 'Skipped' as const : 'Optional' as const }
    }) : []
    return { ...area, included, issues: issues.filter((issue) => issue.area === area.id), fixtures: fixtures.filter((node) => ids.has(node.id)), optional }
  })
  const layout = bathroomLayout(levelId, nodes)
  const layoutReady = layout.length > 0 && layout.every((fixture) => fixture.node)
  const canFinish = !issues.length && layoutReady
  return { groups, issues, layoutReady, canFinish, finished: metadata?.bathSpaceReviewed === true && canFinish, fixtureCount: fixtures.length, areaCount: groups.filter((group) => group.included).length, optionalCount: groups.reduce((sum, group) => sum + group.optional.reduce((count, choice) => count + choice.count, 0), 0) }
}

export function reviewFixLabel(issue: ReviewIssue) {
  return issue.area === 'wash-area' ? issue.step === 'tap' ? 'Add tap' : issue.step === 'basin' ? 'Add basin' : 'Add wash area'
    : issue.area === 'toilet' ? issue.step === 'flush' ? 'Restore flush control' : 'Add toilet'
    : issue.step === 'head' ? 'Add shower head' : issue.step === 'control' ? 'Add shower control' : issue.step === 'bath' ? 'Add bath' : issue.step === 'review' ? 'Add bath tap' : issue.step === 'shower' ? issue.hostId ? 'Repair shower' : 'Add shower' : 'Choose bath or shower'
}

export function bathroomReviewFix(levelId: string, issueId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const level = nodes[levelId]
  const issue = bathroomReviewState(levelId, nodes).issues.find((candidate) => candidate.id === issueId)
  if (!level || !issue) return null
  const host = issue.hostId ? nodes[issue.hostId] : undefined
  const patch: Record<string, unknown> = { bathSpaceStage: issue.area, bathSpaceReviewed: false }
  let focusId: string | null = host?.id ?? null
  if (issue.area === 'wash-area') {
    const saved = readWashArea(level.metadata?.[washAreaMetadataKey])
    const vanity = issue.step === 'basin' ? host : host?.parentId && /vanity$/.test(String(nodes[host.parentId]?.type)) ? nodes[host.parentId] : undefined
    patch[washAreaMetadataKey] = { ...saved, step: issue.step, vanityId: vanity?.id ?? null, basinId: host && isBasinKind(String(host.type)) ? host.id : null, withoutVanity: issue.step === 'tap' && !vanity }
  } else if (issue.area === 'toilet') {
    const saved = readToilet(level.metadata?.[toiletMetadataKey])
    patch[toiletMetadataKey] = { ...saved, step: issue.step, toiletId: host?.id ?? null, mounting: host ? String(host.type).includes('wall-hung') ? 'wall' : 'floor' : saved.mounting, holderId: saved.toiletId === host?.id ? saved.holderId : null, holderSkipped: saved.toiletId === host?.id && saved.holderSkipped }
  } else {
    const saved = readBathingArea(level.metadata?.[bathingMetadataKey])
    const fixtures = levelFixtures(levelId, nodes)
    const bathId = String(host?.type) === 'bath-space:bathtub' ? host!.id : saved.bathId && nodes[saved.bathId] ? saved.bathId : null
    const showerId = host && /(?:shower-arm|shower-assembly)$/.test(String(host.type)) ? host.id : saved.showerId && nodes[saved.showerId] ? saved.showerId : null
    const control = fixtures.find((node) => String(node.type) === 'bath-space:shower-control' && (node.metadata?.bathSpaceShowerId === showerId || (node.metadata?.showerKit as { anchorId?: string } | undefined)?.anchorId === showerId || saved.showerId === showerId && saved.controlId === node.id))
    patch[bathingMetadataKey] = { ...saved, step: issue.step, bathId, showerId, controlId: control?.id ?? null, kind: saved.kind === 'both' || bathId && showerId ? 'both' : bathId ? 'bath' : showerId ? 'shower' : saved.kind, system: issue.system ?? saved.system }
    focusId ??= bathId ?? showerId
  }
  return { metadata: { ...level.metadata, ...patch }, focusId }
}
