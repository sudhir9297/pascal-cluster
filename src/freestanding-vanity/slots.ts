import type { SlotDeclaration } from '@pascal-app/core'

export const vanitySlotLabels = {
  front: 'Fronts', carcass: 'Carcass', interior: 'Drawer boxes and shelves',
  countertop: 'Countertop and backsplash', base: 'Legs and base', hardware: 'Handles and fittings',
} as const

export type VanitySlotId = keyof typeof vanitySlotLabels

export function vanitySlots(): SlotDeclaration[] {
  return Object.entries(vanitySlotLabels).map(([slotId, label]) => ({ slotId, label, default: '#ffffff' }))
}

export function isVanitySlot(value: unknown): value is VanitySlotId {
  return typeof value === 'string' && Object.hasOwn(vanitySlotLabels, value)
}

export function vanitySlotForPart(name: string): VanitySlotId {
  if (name === 'vanity-countertop' || name === 'vanity-backsplash') return 'countertop'
  if (name.startsWith('vanity-leg-') || name.startsWith('vanity-console-support-') || name === 'vanity-recessed-plinth' || name === 'vanity-lower-shelf') return 'base'
  if (/-(knob|mount|bar|edge-lip|slide|hinge)(-|$)/.test(name)) return 'hardware'
  if (/-(panel|stile|rail|flute)(-|$)/.test(name)) return 'front'
  if (name.startsWith('vanity-drawer-') || name.startsWith('vanity-shelf-') || name === 'vanity-console-shelf') return 'interior'
  return 'carcass'
}
