import type { AnyNode, AnyNodeId } from '@pascal-app/core'
import { vanityLevelId } from '../freestanding-vanity/wall-placement'
import { VanityNode } from '../freestanding-vanity/schema'
import { vanityPresets } from '../freestanding-vanity/presets'
import { BasinNode, isBasinKind } from '../countertop-basin/schema'
import { TapNode } from '../taps/schema'
import { getTapPreset, tapMountingLayout, tapPresets } from '../taps/presets'
import { WallHungToiletNode, toiletPresets } from '../wall-hung-toilet/schema'
import { FloorStandingToiletNode } from '../floor-standing-toilet/schema'
import { BathtubNode, bathtubPresets } from '../bathtub/schema'
import { ShowerArmNode, showerArmPresets } from '../shower-arm/schema'
import { ShowerHeadNode, showerHeadPresets } from '../shower-head/schema'
import { ShowerAssemblyNode } from '../shower-assembly/schema'
import { ShowerControlNode } from '../shower-control/schema'
import { HandShowerNode, handShowerPresets } from '../hand-shower/schema'
import { ToiletPaperHolderNode, holderPresets } from '../toilet-paper-holder/schema'
import { WallFlushPlateNode, CisternFlushControlNode, flushPlatePresets } from '../flush-control/schema'
import { MirrorNode, mirrorPresets } from '../mirror/schema'
import { TowelRailNode, towelRailPresets } from '../towel-rail/schema'
import { readWashArea, reconcileWashArea, washAreaMetadataKey } from './wash-area'
import { readToilet, reconcileToilet, toiletMetadataKey } from './toilet'
import { readBathingArea, reconcileBathingArea, bathingMetadataKey } from './bathing-area'

export type ReplacementOption = { id: string; label: string; parameters: Record<string, unknown> }
type Schema = { safeParse: (value: unknown) => { success: boolean } }
const variants = (field: string, values: readonly string[]): ReplacementOption[] => values.map((value) => ({ id: value, label: value.replaceAll('-', ' '), parameters: { [field]: value } }))

function replacementDefinition(node: AnyNode): { schema: Schema; options: ReplacementOption[] } | null {
  const raw = node as unknown as Record<string, unknown>
  const type = String(node.type)
  const presets = (field: string, values: readonly { label: string; [key: string]: unknown }[]) => values.map((value) => ({ id: String(value[field]), label: value.label, parameters: { [field]: value[field] } }))
  if (/vanity$/.test(type)) return { schema: VanityNode, options: vanityPresets.map((preset) => {
    const { legHeight, countertopEnabled, backsplashHeight, ...settings } = preset.settings
    return { id: preset.id, label: preset.label, parameters: type === 'bath-space:corner-vanity' ? { frontStyle: settings.frontStyle, handleStyle: settings.handleStyle, frontMount: settings.frontMount } : settings }
  }) }
  if (isBasinKind(type)) return { schema: BasinNode, options: variants('shape', ['round', 'oval', 'rectangle']) }
  if (type === 'bath-space:tap') {
    const tap = TapNode.safeParse(node)
    if (!tap.success) return null
    const mount = getTapPreset(tap.data.presetId).mount
    const layout = tapMountingLayout(tap.data)
    return { schema: TapNode, options: tapPresets.filter((preset) => preset.mount === mount && tapMountingLayout({ presetId: preset.id }) === layout).map((preset) => ({ id: preset.id, label: preset.label, parameters: { presetId: preset.id } })) }
  }
  if (type === 'bath-space:wall-hung-toilet') return { schema: WallHungToiletNode, options: presets('style', toiletPresets) }
  if (type === 'bath-space:floor-standing-toilet') return { schema: FloorStandingToiletNode, options: presets('style', toiletPresets) }
  if (type === 'bath-space:bathtub') {
    const freestanding = ['oval', 'rectangle', 'slipper', 'clawfoot']
    return { schema: BathtubNode, options: freestanding.includes(String(raw.shape)) ? presets('shape', bathtubPresets.filter((preset) => freestanding.includes(preset.shape))) : ['drop-in', 'undermount'].includes(String(raw.shape)) ? variants('builtInShape', ['oval', 'rectangle']) : variants('backrestProfile', ['classic', 'curved', 'straight', 'reclined', 'upright']) }
  }
  if (type === 'bath-space:shower-arm') return { schema: ShowerArmNode, options: presets('style', showerArmPresets) }
  if (type === 'bath-space:shower-head') return { schema: ShowerHeadNode, options: presets('style', showerHeadPresets) }
  if (type === 'bath-space:hand-shower') return { schema: HandShowerNode, options: presets('style', handShowerPresets) }
  if (type === 'bath-space:shower-assembly') return { schema: ShowerAssemblyNode, options: variants('profile', ['round', 'square', 'rounded', 'curved']) }
  if (type === 'bath-space:shower-control') return { schema: ShowerControlNode, options: variants('handleStyle', ['lever', 'cross', 'knob']) }
  if (type === 'bath-space:toilet-paper-holder') return { schema: ToiletPaperHolderNode, options: presets('shape', holderPresets) }
  if (type === 'bath-space:wall-flush-plate' || type === 'bath-space:cistern-flush-control') return { schema: type.endsWith('plate') ? WallFlushPlateNode : CisternFlushControlNode, options: presets('shape', flushPlatePresets) }
  if (type === 'bath-space:mirror') return { schema: MirrorNode, options: presets('shape', mirrorPresets.filter((preset) => preset.shape !== 'round' || raw.width === raw.height)) }
  if (type === 'bath-space:towel-rail') return { schema: TowelRailNode, options: presets('shape', towelRailPresets) }
  return null
}

export function fixtureReplacementOptions(node: AnyNode): ReplacementOption[] {
  const definition = replacementDefinition(node)
  const raw = node as unknown as Record<string, unknown>
  return definition?.options.filter((option) => Object.entries(option.parameters).some(([key, value]) => raw[key] !== value) && definition.schema.safeParse({ ...node, ...option.parameters }).success) ?? []
}

/** Updates the existing identity so attachments, mounting, dimensions, and finishes survive. */
export function fixtureReplacementChanges(levelId: string, nodeId: string, optionId: string, nodes: Readonly<Record<string, AnyNode>>) {
  const node = nodes[nodeId], level = nodes[levelId]
  if (!node || !level || vanityLevelId(node.parentId, nodes) !== levelId) return null
  const option = fixtureReplacementOptions(node).find((candidate) => candidate.id === optionId)
  if (!option) return null
  const data = { ...option.parameters, name: option.label } as Partial<AnyNode>
  const nextNodes = { ...nodes, [nodeId]: { ...node, ...data } as AnyNode }
  const metadata = { ...level.metadata, bathSpaceReviewed: false }
  const linkedTo = (ids: (string | null)[]) => {
    const hosts = new Set(ids.filter((id): id is string => Boolean(id)))
    const raw = node as unknown as Record<string, unknown>
    if ([raw.servesBasinId, raw.servesBathId, raw.servesToiletId, node.metadata?.bathSpaceShowerId, (node.metadata?.showerKit as { anchorId?: string } | undefined)?.anchorId].some((id) => typeof id === 'string' && hosts.has(id))) return true
    let current: AnyNode | undefined = node
    const seen = new Set<string>()
    while (current && !seen.has(current.id)) {
      if (hosts.has(current.id)) return true
      seen.add(current.id)
      current = current.parentId ? nodes[current.parentId] : undefined
    }
    return false
  }
  const wash = readWashArea(level.metadata?.[washAreaMetadataKey])
  if (level.metadata?.[washAreaMetadataKey] && linkedTo([wash.vanityId, wash.basinId])) Object.assign(metadata, { [washAreaMetadataKey]: reconcileWashArea(wash, nextNodes) })
  const toilet = readToilet(level.metadata?.[toiletMetadataKey])
  if (level.metadata?.[toiletMetadataKey] && linkedTo([toilet.toiletId, toilet.holderId])) Object.assign(metadata, { [toiletMetadataKey]: reconcileToilet(toilet, nextNodes) })
  const bathing = readBathingArea(level.metadata?.[bathingMetadataKey])
  if (level.metadata?.[bathingMetadataKey] && linkedTo([bathing.bathId, bathing.showerId, bathing.controlId, ...bathing.dividerIds])) Object.assign(metadata, { [bathingMetadataKey]: reconcileBathingArea(bathing, nextNodes) })
  return { update: [{ id: node.id as AnyNodeId, data }, { id: level.id as AnyNodeId, data: { metadata } as Partial<AnyNode> }] }
}
