import type { AnyNode } from '@pascal-app/core'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { isBasinKind } from '../countertop-basin/schema'
import { tapOccupancySlot } from '../countertop-basin/tap-attachment'
import { toiletFlushControls } from '../flush-control/attachment'
import {
  bathingHead,
  bathingShowerReady,
  emptyBathingArea,
} from './bathing-area'
export type Area = 'wash-area' | 'toilet' | 'bathing'
export const areas: { id: Area; label: string }[] = [
  { id: 'wash-area', label: 'Wash area' },
  { id: 'toilet', label: 'Toilet area' },
  { id: 'bathing', label: 'Bath or shower' },
]
export const accessoryChoices = {
  'wash-area': [
    { kind: 'mirror', label: 'Mirror', hint: 'Place above your basin.' },
    {
      kind: 'wall-light',
      label: 'Light',
      hint: 'Place beside or above your mirror.',
    },
    {
      kind: 'towel-rail',
      label: 'Hand towel',
      hint: 'Place within reach of your basin.',
    },
  ],
  toilet: [
    {
      kind: 'toilet-paper-holder',
      label: 'Paper holder',
      hint: 'Place beside your toilet, within reach.',
    },
  ],
  bathing: [
    {
      kind: 'towel-rail',
      label: 'Bath towel',
      hint: 'Place outside the wet area, within reach.',
    },
  ],
} as const
export function levelFixtures(
  levelId: string,
  nodes: Readonly<Record<string, AnyNode>>,
) {
  return Object.values(nodes).filter(
    (n) =>
      String(n.type).startsWith('bath-space:') &&
      vanityLevelId(n.parentId, nodes) === levelId,
  )
}
export function areaAnchors(area: Area, fixtures: AnyNode[]) {
  return fixtures.filter((n) =>
    area === 'wash-area'
      ? isBasinKind(String(n.type)) || /vanity$/.test(String(n.type))
      : area === 'toilet'
        ? /(?:wall-hung|floor-standing)-toilet$/.test(String(n.type))
        : /(?:bathtub|shower-arm|shower-assembly)$/.test(String(n.type)),
  )
}
export function matchedAccessories(
  area: Area,
  kind: string,
  fixtures: AnyNode[],
) {
  return fixtures.filter(
    (n) =>
      String(n.type) === `bath-space:${kind}` &&
      (n.metadata?.bathSpaceAccessoryArea === area ||
        (kind === 'toilet-paper-holder' && area === 'toilet') ||
        (['mirror', 'wall-light'].includes(kind) && area === 'wash-area')),
  )
}
export type ReviewIssue = {
  id: string
  area: Area
  message: string
  hostId: string | null
  step: string
  system?: 'kit' | 'assembly' | 'custom'
}
export function bathroomIssues(
  levelId: string,
  nodes: Readonly<Record<string, AnyNode>>,
  excluded: readonly string[] = [],
): ReviewIssue[] {
  const fixtures = levelFixtures(levelId, nodes),
    issues: ReviewIssue[] = []
  for (const area of areas)
    if (!areaAnchors(area.id, fixtures).length && !excluded.includes(area.id))
      issues.push({
        id: area.id,
        area: area.id,
        message: `Add a ${area.id === 'wash-area' ? 'wash area' : area.id === 'toilet' ? 'toilet' : 'bath or shower'}, or mark this area as not included.`,
        hostId: null,
        step:
          area.id === 'wash-area'
            ? 'vanity'
            : area.id === 'toilet'
              ? 'toilet'
              : 'choice',
      })
  for (const n of fixtures) {
    const type = String(n.type),
      name = n.name || type.replace('bath-space:', '').replaceAll('-', ' ')
    const add = (
      area: Area,
      step: string,
      message: string,
      system?: ReviewIssue['system'],
    ) =>
      issues.push({
        id: `${n.id}:${step}`,
        area,
        step,
        hostId: n.id,
        message: `${name}: ${message}`,
        system,
      })
    if (
      /vanity$/.test(type) &&
      !fixtures.some((b) => b.parentId === n.id && isBasinKind(String(b.type)))
    )
      add('wash-area', 'basin', 'add a basin.')
    if (
      isBasinKind(type) &&
      !fixtures.some(
        (t) =>
          String(t.type) === 'bath-space:tap' &&
          tapOccupancySlot(t)?.hostId === n.id,
      )
    )
      add('wash-area', 'tap', 'add a tap.')
    if (
      /(?:wall-hung|floor-standing)-toilet$/.test(type) &&
      !toiletFlushControls(n.id, nodes).length
    )
      add('toilet', 'flush', 'restore the flush control.')
    if (
      type === 'bath-space:bathtub' &&
      (n as unknown as { tapMount?: string }).tapMount !== 'none' &&
      !fixtures.some(
        (t) =>
          String(t.type) === 'bath-space:tap' &&
          tapOccupancySlot(t)?.hostId === n.id,
      )
    )
      add('bathing', 'review', 'add a tap, or select No tap on the bath.')
    if (
      type === 'bath-space:shower-arm' ||
      type === 'bath-space:shower-assembly'
    ) {
      const system: 'assembly' | 'kit' | 'custom' = type.endsWith('assembly')
        ? 'assembly'
        : n.metadata?.showerKit
          ? 'kit'
          : 'custom'
      const tracked = nodes[levelId]?.metadata?.bathSpaceBathingArea as
        | { showerId?: string; controlId?: string }
        | undefined
      const control = fixtures.find(
        (c) =>
          String(c.type) === 'bath-space:shower-control' &&
          ((c.metadata?.showerKit as { anchorId?: string } | undefined)
            ?.anchorId === n.id ||
            c.metadata?.bathSpaceShowerId === n.id ||
            (tracked?.showerId === n.id && tracked.controlId === c.id)),
      )
      const flow = {
        ...emptyBathingArea,
        kind: 'shower' as const,
        system,
        showerId: n.id,
        controlId: control?.id ?? null,
      }
      if (!bathingShowerReady(flow, nodes))
        add(
          'bathing',
          system !== 'custom'
            ? 'shower'
            : !bathingHead(flow, nodes)
              ? 'head'
              : 'control',
          system === 'custom'
            ? !bathingHead(flow, nodes)
              ? 'add a shower head.'
              : 'add a shower control.'
            : 'missing shower parts. Restore them or remove this shower.',
          system,
        )
    }
  }
  return issues
}
