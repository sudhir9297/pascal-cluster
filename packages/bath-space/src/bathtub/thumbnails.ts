import type { BathtubNode } from './schema'

export const bathThumbnails = {
  'oval': new URL('./assets/oval.webp', import.meta.url).href,
  'rectangle': new URL('./assets/rectangle.webp', import.meta.url).href,
  'slipper': new URL('./assets/slipper.webp', import.meta.url).href,
  'clawfoot': new URL('./assets/clawfoot.webp', import.meta.url).href,
  'back-to-wall': new URL('./assets/back-to-wall.webp', import.meta.url).href,
  'alcove': new URL('./assets/alcove.webp', import.meta.url).href,
  'drop-in': new URL('./assets/drop-in.webp', import.meta.url).href,
  'undermount': new URL('./assets/undermount.webp', import.meta.url).href,
  'corner': new URL('./assets/corner.webp', import.meta.url).href,
  'walk-in': new URL('./assets/walk-in.webp', import.meta.url).href,
} satisfies Record<BathtubNode['shape'], string>
