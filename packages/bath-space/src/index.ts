import { wallLightDefinition } from './wall-light/definition'
import { towelRailDefinition } from './towel-rail/definition'
import { mirrorDefinition } from './mirror/definition'
import { toiletPaperHolderDefinition } from './toilet-paper-holder/definition'
import { showerDividerDefinition } from './shower-divider/definition'
import { showerFlangeDefinition } from './shower-flange/definition'
import { showerConnectorDefinition } from './shower-connector/definition'
import { showerValveDefinition } from './shower-valve/definition'
import {bathShowerDefinition} from './bath-shower/definition'
import {bathScreenDefinition} from './bath-screen/definition'
import {showerAssemblyDefinition} from './shower-assembly/definition'
import {wallSpoutDefinition} from './wall-spout/definition'
import {bodyJetDefinition} from './body-jet/definition'
import {showerControlDefinition} from './shower-control/definition'
import { bathDeckDefinition } from './bath-deck/definition'
import { showerHoseDefinition } from './shower-hose/definition'
import { showerMountDefinition } from './shower-mount/definition'
import { handShowerDefinition } from './hand-shower/definition'
import { showerHeadDefinition } from './shower-head/definition'
import { floorStandingToiletDefinition } from './floor-standing-toilet/definition'
import { wallFlushPlateDefinition, cisternFlushControlDefinition } from './flush-control/definition'
import { bathtubDefinition } from './bathtub/definition'
import { showerArmDefinition } from './shower-arm/definition'
import { wallHungToiletDefinition } from './wall-hung-toilet/definition'
import { halfPedestalBasinDefinition } from './half-pedestal-basin/definition'
import { fullPedestalBasinDefinition } from './full-pedestal-basin/definition'
import { tapDefinition } from './taps/definition'
import { wallHungBasinDefinition } from './wall-hung-basin/definition'
import { semiRecessedBasinDefinition } from './countertop-basin/semi-recessed-definition'
import { dropInBasinDefinition } from './countertop-basin/drop-in-definition'
import { undermountBasinDefinition } from './countertop-basin/undermount-definition'
import { countertopBasinDefinition } from './countertop-basin/definition'
import { bathroomDrawingSchedule } from './workspace/drawing-schedule'
import type { AnyNodeDefinition, Plugin } from '@pascal-app/core'
import { freestandingVanityDefinition } from './freestanding-vanity/definition'
import { wallMountedVanityDefinition } from './freestanding-vanity/wall-mounted-definition'
import { cornerVanityDefinition } from './freestanding-vanity/corner-definition'
import { BATH_SPACE_ICON } from './bath-space-icon'

type BathSpaceHostPanel = {
  id: string
  pluginId: string
  label: string
  description: string
  creator: { name: string; url?: string }
  pluginUrl: string
  icon: { kind: 'url'; src: string }
  component: () => Promise<{ default: React.ComponentType }>
  defaultInstalled: boolean
}

export const bathSpacePlugin: Plugin = {
  id: 'pascal:bath-space',
  apiVersion: 1,
  nodes: [wallLightDefinition as unknown as AnyNodeDefinition,towelRailDefinition as unknown as AnyNodeDefinition,mirrorDefinition as unknown as AnyNodeDefinition,toiletPaperHolderDefinition as unknown as AnyNodeDefinition,showerConnectorDefinition as unknown as AnyNodeDefinition,showerDividerDefinition as unknown as AnyNodeDefinition,showerFlangeDefinition as unknown as AnyNodeDefinition,showerValveDefinition as unknown as AnyNodeDefinition,bathShowerDefinition as unknown as AnyNodeDefinition,bathScreenDefinition as unknown as AnyNodeDefinition,showerAssemblyDefinition as unknown as AnyNodeDefinition, wallSpoutDefinition as unknown as AnyNodeDefinition, bodyJetDefinition as unknown as AnyNodeDefinition, showerControlDefinition as unknown as AnyNodeDefinition, bathDeckDefinition as unknown as AnyNodeDefinition,showerHoseDefinition as unknown as AnyNodeDefinition, showerMountDefinition as unknown as AnyNodeDefinition, handShowerDefinition as unknown as AnyNodeDefinition, showerHeadDefinition as unknown as AnyNodeDefinition, floorStandingToiletDefinition as unknown as AnyNodeDefinition, wallFlushPlateDefinition as unknown as AnyNodeDefinition, cisternFlushControlDefinition as unknown as AnyNodeDefinition, bathtubDefinition as unknown as AnyNodeDefinition, showerArmDefinition as unknown as AnyNodeDefinition, wallHungToiletDefinition as unknown as AnyNodeDefinition, halfPedestalBasinDefinition as unknown as AnyNodeDefinition, fullPedestalBasinDefinition as unknown as AnyNodeDefinition, tapDefinition as unknown as AnyNodeDefinition, wallHungBasinDefinition as unknown as AnyNodeDefinition, semiRecessedBasinDefinition as unknown as AnyNodeDefinition, dropInBasinDefinition as unknown as AnyNodeDefinition, undermountBasinDefinition as unknown as AnyNodeDefinition, countertopBasinDefinition as unknown as AnyNodeDefinition, freestandingVanityDefinition as unknown as AnyNodeDefinition, wallMountedVanityDefinition as unknown as AnyNodeDefinition, cornerVanityDefinition as unknown as AnyNodeDefinition].map(definition => ({
    ...definition,
    extensions: {
      ...definition.extensions,
      'pascal:editor/floorplan': {
        ...((definition.extensions?.['pascal:editor/floorplan'] ?? {}) as Record<string, unknown>),
        schedule: bathroomDrawingSchedule,
      },
    },
  })),
}

export const bathSpaceHostPanel: BathSpaceHostPanel = {
  id: 'pascal:bath-space:catalog',
  pluginId: bathSpacePlugin.id,
  label: 'Bath Space',
  description: 'Procedural bathroom fixtures and furniture.',
  creator: { name: 'Pascal' },
  pluginUrl: 'https://editor.pascal.app/docs/developers/plugins',
  icon: { kind: 'url', src: BATH_SPACE_ICON },
  component: () => import('./panel'),
  defaultInstalled: true,
}

export { freestandingVanityDefinition } from './freestanding-vanity/definition'
export { wallMountedVanityDefinition } from './freestanding-vanity/wall-mounted-definition'
export { cornerVanityDefinition } from './freestanding-vanity/corner-definition'
export { FreestandingVanityNode, WallMountedVanityNode, CornerVanityNode, VanityNode, VanityParameters } from './freestanding-vanity/schema'
export { buildFreestandingVanityGeometry, vanityGeometryKey } from './freestanding-vanity/geometry'
export { vanityPresets } from './freestanding-vanity/presets'

export { countertopBasinDefinition } from './countertop-basin/definition'
export { CountertopBasinNode, basinPresets } from './countertop-basin/schema'
export { buildCountertopBasinGeometry, basinGeometryKey } from './countertop-basin/geometry'
export { BASIN_TAP_SLOT, basinTapSlotOccupants, BASIN_TAP_TARGET_NAME, createBasinTapTarget, syncBasinTapTarget, basinTapTarget, basinTapSnap, basinTapMoveChanges, basinTapLocalToLevel, basinTapLevelToLocal } from './countertop-basin/tap-attachment'
export type { BasinTapPose, BasinTapNode } from './countertop-basin/tap-attachment'

export { undermountBasinDefinition } from './countertop-basin/undermount-definition'
export { UndermountBasinNode } from './countertop-basin/schema'

export { dropInBasinDefinition } from './countertop-basin/drop-in-definition'
export { DropInBasinNode } from './countertop-basin/schema'

export { semiRecessedBasinDefinition } from './countertop-basin/semi-recessed-definition'
export { SemiRecessedBasinNode } from './countertop-basin/schema'

export { wallHungBasinDefinition } from './wall-hung-basin/definition'
export { WallHungBasinNode, wallHungBasinPresets } from './countertop-basin/schema'
export { buildWallHungBasinGeometry } from './wall-hung-basin/geometry'

export { tapDefinition } from './taps/definition'
export { TAP, TapNode } from './taps/schema'
export { tapPresets, getTapPreset } from './taps/presets'
export type { TapPresetId } from './taps/presets'

export { buildTapGeometry, tapDimensions, tapGeometryKey } from './taps/geometry'

export { fullPedestalBasinDefinition } from './full-pedestal-basin/definition'
export { FullPedestalBasinNode, fullPedestalBasinPresets } from './countertop-basin/schema'
export { buildFullPedestalBasinGeometry, fullPedestalBasinGeometryKey } from './full-pedestal-basin/geometry'

export { tapPlacementChanges } from './taps/placement'

export { halfPedestalBasinDefinition } from './half-pedestal-basin/definition'
export { HalfPedestalBasinNode, halfPedestalBasinPresets } from './countertop-basin/schema'
export { buildHalfPedestalBasinGeometry, halfPedestalBasinGeometryKey } from './half-pedestal-basin/geometry'

export { attachmentChanges, slotKey, sameSlot } from './attachments/slots'
export type { SlotRef, AttachmentSlot } from './attachments/slots'
export { basinTapSlots, tapOccupancySlot } from './countertop-basin/tap-attachment'
export { resolveWallTapTarget, wallTapAttachmentChanges, followingWallTapPlacement } from './taps/binding'

export { wallHungToiletDefinition } from './wall-hung-toilet/definition'
export { WallHungToiletNode, WALL_HUNG_TOILET, toiletPresets } from './wall-hung-toilet/schema'
export { buildWallHungToiletGeometry } from './wall-hung-toilet/geometry'

export { showerArmDefinition } from "./shower-arm/definition"
export { ShowerArmNode, SHOWER_ARM, showerArmPresets } from "./shower-arm/schema"
export { buildShowerArmGeometry } from "./shower-arm/geometry"
export { showerHeadTarget, showerHeadSlot, SHOWER_HEAD_SLOT, SHOWER_HEAD_TARGET_NAME } from "./shower-arm/attachment"

export { bathtubDefinition } from './bathtub/definition'
export { BATHTUB, BathtubNode, bathtubPresets } from './bathtub/schema'
export { buildBathtubGeometry } from './bathtub/geometry'
export { bathTapTarget, bathWallTapTarget, bathTapLocalToLevel, BATH_TAP_TARGET_NAME, BATH_WALL_TAP_TARGET_NAME } from './bathtub/targets'

export { wallFlushPlateDefinition, cisternFlushControlDefinition } from './flush-control/definition'
export { WallFlushPlateNode, CisternFlushControlNode, WALL_FLUSH_PLATE, CISTERN_FLUSH_CONTROL } from './flush-control/schema'

export { floorStandingToiletDefinition } from './floor-standing-toilet/definition'
export { FloorStandingToiletNode, FLOOR_STANDING_TOILET, toiletPresets as floorStandingToiletPresets } from './floor-standing-toilet/schema'
export { buildFloorStandingToiletGeometry } from './floor-standing-toilet/geometry'

export { showerHeadDefinition } from "./shower-head/definition"
export { ShowerHeadNode, SHOWER_HEAD } from "./shower-head/schema"
export { attachShowerHead } from "./shower-head/attachment"

export { BATH_DECK, BathDeckNode } from './bath-deck/schema'
export { bathDeckDefinition } from './bath-deck/definition'

export {BATH_SCREEN,BathScreenNode} from './bath-screen/schema'
export {bathScreenDefinition} from './bath-screen/definition'

export {BATH_SHOWER,BathShowerNode} from './bath-shower/schema'
export {bathShowerDefinition} from './bath-shower/definition'

export { showerDividerDefinition } from './shower-divider/definition'
export { SHOWER_DIVIDER, ShowerDividerNode } from './shower-divider/schema'
export { buildShowerDividerGeometry } from './shower-divider/geometry'

export { toiletPaperHolderDefinition } from './toilet-paper-holder/definition'
export { ToiletPaperHolderNode, TOILET_PAPER_HOLDER } from './toilet-paper-holder/schema'
