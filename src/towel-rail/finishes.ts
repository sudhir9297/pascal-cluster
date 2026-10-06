import { createSlotPaint } from '../freestanding-vanity/paint'
export const towelRailFinishLabels = { metal: 'Rail and brackets' }
export const towelRailPaint = createSlotPaint(
  (value: unknown): value is keyof typeof towelRailFinishLabels =>
    typeof value === 'string' && Object.hasOwn(towelRailFinishLabels,value),
  0.2,
)
