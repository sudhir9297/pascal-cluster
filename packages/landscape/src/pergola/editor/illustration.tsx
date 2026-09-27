import type { PergolaNode } from '../domain/schema'
import flatThumbnail from '../../assets/catalog/pergola-flat-photo-thumbnail.webp'
import singleSlopeThumbnail from '../../assets/catalog/pergola-single-slope-photo-thumbnail.webp'
import gableThumbnail from '../../assets/catalog/pergola-gable-photo-thumbnail.webp'
import curvedThumbnail from '../../assets/catalog/pergola-curved-photo-thumbnail.webp'

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
