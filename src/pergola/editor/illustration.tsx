import type { PergolaNode } from '../domain/schema'
import flatThumbnail from '../assets/flat-pergola-thumbnail.webp'
import singleSlopeThumbnail from '../assets/single-slope-pergola-thumbnail-v2.webp'
import gableThumbnail from '../assets/gable-pergola-thumbnail-v2.webp'
import curvedThumbnail from '../assets/curved-pergola-thumbnail-v2.webp'

const thumbnails: Record<PergolaNode['roofForm'], { src: string }> = {
  flat: flatThumbnail,
  'single-slope': singleSlopeThumbnail,
  gable: gableThumbnail,
  curved: curvedThumbnail,
}

export function PergolaIllustration({ roofForm = 'flat' }: { roofForm?: PergolaNode['roofForm'] }) {
  return (
    <img
      src={thumbnails[roofForm].src}
      alt={`${roofForm.replace('-', ' ')} roof pergola`}
      draggable={false}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
    />
  )
}
