import groundGrass from '../assets/catalog/ground-grass-photo-thumbnail.webp'
import patio from '../assets/catalog/patio-photo-thumbnail.webp'
import walkwayStraight from '../assets/catalog/walkway-straight-photo-thumbnail.webp'
import walkwayCurve from '../assets/catalog/walkway-curve-photo-thumbnail.webp'
import walkwayStone from '../assets/catalog/walkway-stone-photo-thumbnail.webp'
import deck from '../assets/catalog/deck-photo-thumbnail.webp'
import concreteSlab from '../assets/catalog/concrete-slab-photo-thumbnail.webp'
import landing from '../assets/catalog/landing-photo-thumbnail.webp'
import edging from '../assets/catalog/edging-photo-thumbnail.webp'
import retainingWall from '../assets/catalog/retaining-wall-photo-thumbnail.webp'
import groundSoil from '../assets/catalog/ground-soil-photo-thumbnail.webp'
import groundMulch from '../assets/catalog/ground-mulch-photo-thumbnail.webp'
import groundGravel from '../assets/catalog/ground-gravel-photo-thumbnail.webp'
import groundSand from '../assets/catalog/ground-sand-photo-thumbnail.webp'
import groundMud from '../assets/catalog/ground-mud-photo-thumbnail.webp'
import pergolaFlat from '../assets/catalog/pergola-flat-photo-thumbnail.webp'

const src = (image: { src: string }) => image.src

export const LANDSCAPE_CATALOG_THUMBNAILS = {
  'ground-area': src(groundGrass),
  patio: src(patio),
  pathway: src(walkwayStraight),
  deck: src(deck),
  'concrete-slab': src(concreteSlab),
  landing: src(landing),
  edging: src(edging),
  'retaining-wall': src(retainingWall),
  pergola: src(pergolaFlat),
} as const

export const WALKWAY_THUMBNAILS = {
  straight: src(walkwayStraight),
  curve: src(walkwayCurve),
  stone: src(walkwayStone),
} as const

export const GROUND_SURFACE_THUMBNAILS = {
  grass: src(groundGrass),
  soil: src(groundSoil),
  mulch: src(groundMulch),
  gravel: src(groundGravel),
  sand: src(groundSand),
  mud: src(groundMud),
} as const
