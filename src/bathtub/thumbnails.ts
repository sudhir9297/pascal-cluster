import type { BathtubNode } from './schema'

export const bathThumbnails = {
  'oval': new URL('./assets/oval.png', import.meta.url).href,
  'rectangle': new URL('./assets/rectangle.png', import.meta.url).href,
  'slipper': new URL('./assets/slipper.png', import.meta.url).href,
  'clawfoot': new URL('./assets/clawfoot.png', import.meta.url).href,
  'back-to-wall': new URL('./assets/back-to-wall.png', import.meta.url).href,
  'alcove': new URL('./assets/alcove.png', import.meta.url).href,
  'drop-in': new URL('./assets/drop-in.png', import.meta.url).href,
  'undermount': new URL('./assets/undermount.png', import.meta.url).href,
  'corner': new URL('./assets/corner.png', import.meta.url).href,
  'walk-in': new URL('./assets/walk-in.png', import.meta.url).href,
} satisfies Record<BathtubNode['shape'], string>
