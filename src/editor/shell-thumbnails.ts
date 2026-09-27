import type { PoolShape } from '../design/shapes'

export const POOL_SHAPE_THUMBNAILS: Record<PoolShape, string> = {
  circle: new URL('./assets/pool-circle-thumbnail.webp', import.meta.url).href,
  rectangle: new URL('./assets/pool-rectangle-thumbnail.webp', import.meta.url).href,
  'lap-rectangle': new URL('./assets/pool-lap-rectangle-thumbnail.webp', import.meta.url).href,
  kidney: new URL('./assets/pool-kidney-thumbnail-v3.webp', import.meta.url).href,
  lagoon: new URL('./assets/pool-lagoon-thumbnail.webp', import.meta.url).href,
  roman: new URL('./assets/pool-roman-thumbnail-v3.webp', import.meta.url).href,
  'l-shape': new URL('./assets/pool-l-shape-thumbnail.webp', import.meta.url).href,
  spline: new URL('./assets/pool-freehand-thumbnail.webp', import.meta.url).href,
  custom: new URL('./assets/pool-custom-thumbnail.webp', import.meta.url).href,
}
