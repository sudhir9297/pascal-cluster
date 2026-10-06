import { createSlotPaint } from '../freestanding-vanity/paint'
export const wallLightFinishLabels = {housing:'Housing'}
export const wallLightPaint = createSlotPaint((value:unknown):value is 'housing'=>value==='housing',0.25)
