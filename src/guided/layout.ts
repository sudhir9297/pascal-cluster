import type { AnyNode } from '@pascal-app/core'
import { isBasinKind } from '../countertop-basin/schema'
import { includedBathroomAreas } from './setup'
import { levelFixtures } from './bathroom-review'
import { readWashArea, washAreaMetadataKey } from './wash-area'
import { readToilet, toiletMetadataKey } from './toilet'
import { readBathingArea, bathingMetadataKey } from './bathing-area'

export type LayoutTarget = 'wash-area' | 'toilet' | 'bath' | 'shower'
export type LayoutFixture = { id: LayoutTarget; label: string; node: AnyNode | undefined }

export function bathroomLayout(levelId: string, nodes: Readonly<Record<string, AnyNode>>): LayoutFixture[] {
  const fixtures = levelFixtures(levelId, nodes)
  const included = includedBathroomAreas(levelId, nodes)
  const metadata = nodes[levelId]?.metadata
  const wash = readWashArea(metadata?.[washAreaMetadataKey])
  const toilet = readToilet(metadata?.[toiletMetadataKey])
  const bathing = readBathingArea(metadata?.[bathingMetadataKey])
  const find = (saved: string | null, matches: (node: AnyNode) => boolean) => fixtures.find((node) => node.id === saved && matches(node)) ?? fixtures.find(matches)
  const result: LayoutFixture[] = []
  if (included.includes('wash-area')) result.push({ id: 'wash-area', label: 'Vanity or basin', node: find(wash.withoutVanity ? wash.basinId : wash.vanityId, (node) => /vanity$/.test(String(node.type)) || (isBasinKind(String(node.type)) && !/vanity$/.test(String(nodes[node.parentId ?? '']?.type)))) })
  if (included.includes('toilet')) result.push({ id: 'toilet', label: 'Toilet', node: find(toilet.toiletId, (node) => /(?:wall-hung|floor-standing)-toilet$/.test(String(node.type))) })
  if (included.includes('bathing')) {
    const kind = bathing.kind ?? (fixtures.some((node) => String(node.type) === 'bath-space:bathtub') ? fixtures.some((node) => /(?:shower-arm|shower-assembly)$/.test(String(node.type))) ? 'both' : 'bath' : 'shower')
    if (kind !== 'shower') result.push({ id: 'bath', label: 'Bath', node: find(bathing.bathId, (node) => String(node.type) === 'bath-space:bathtub') })
    if (kind !== 'bath') result.push({ id: 'shower', label: 'Shower', node: find(bathing.showerId, (node) => /(?:shower-arm|shower-assembly)$/.test(String(node.type))) })
  }
  return result
}

export function bathroomLayoutPatch(levelId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const layout = bathroomLayout(levelId, nodes)
  if (!layout.length || layout.some((fixture) => !fixture.node)) return null
  const metadata = nodes[levelId]?.metadata
  const patch: Record<string, unknown> = { bathSpaceLayoutComplete: true, bathSpaceReviewed: false, bathSpaceStage: includedBathroomAreas(levelId, nodes)[0] ?? 'review' }
  const wash = layout.find((fixture) => fixture.id === 'wash-area')?.node
  if (wash) {
    patch[washAreaMetadataKey] = bathroomWashAreaFlow(levelId, nodes)
  }
  const toilet = layout.find((fixture) => fixture.id === 'toilet')?.node
  if (toilet) {
    const saved = readToilet(metadata?.[toiletMetadataKey])
    patch[toiletMetadataKey] = saved.toiletId === toilet.id ? { ...saved, step: saved.step === 'toilet' ? 'flush' : saved.step } : { ...saved, toiletId: toilet.id, mounting: String(toilet.type).includes('wall-hung') ? 'wall' : 'floor', holderId: null, holderSkipped: false, step: 'flush' }
  }
  const bath = layout.find((fixture) => fixture.id === 'bath')?.node
  const shower = layout.find((fixture) => fixture.id === 'shower')?.node
  if (bath || shower) {
    const saved = readBathingArea(metadata?.[bathingMetadataKey])
    const system = shower ? String(shower.type).endsWith('assembly') ? 'assembly' : shower.metadata?.showerKit ? 'kit' : 'custom' : saved.system
    patch[bathingMetadataKey] = { ...saved, kind: bath && shower ? 'both' : bath ? 'bath' : 'shower', bathId: bath?.id ?? null, showerId: shower?.id ?? null, system, step: saved.bathId === (bath?.id ?? null) && saved.showerId === (shower?.id ?? null) && !['choice', 'bath', 'shower'].includes(saved.step) ? saved.step : system === 'custom' && shower ? 'head' : 'review' }
  }
  return patch
}

export function bathroomWashAreaFlow(levelId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const wash = bathroomLayout(levelId, nodes).find((fixture) => fixture.id === 'wash-area')?.node
  if (!wash) return null
  const metadata = nodes[levelId]?.metadata
  const saved = readWashArea(metadata?.[washAreaMetadataKey])
  const basin = isBasinKind(String(wash.type)) ? wash : Object.values(nodes).find((node) => node.parentId === wash.id && isBasinKind(String(node.type)))
  return saved.vanityId === wash.id || saved.withoutVanity && saved.basinId === wash.id ? { ...saved, step: saved.step === 'vanity' ? basin ? 'tap' : 'basin' : saved.step } : { ...saved, vanityId: basin === wash ? null : wash.id, withoutVanity: basin === wash, basinId: basin?.id ?? null, step: basin ? 'tap' : 'basin' }
}
