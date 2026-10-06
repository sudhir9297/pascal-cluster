import { createSlotPaint } from '../freestanding-vanity/paint'
export const mirrorFinishLabels = { frame: 'Frame', glass: 'Mirror surface', backing: 'Backing' }
export const mirrorPaint = createSlotPaint(
  (value: unknown): value is keyof typeof mirrorFinishLabels =>
    typeof value === 'string' && Object.hasOwn(mirrorFinishLabels,value),
  0.2,
)
