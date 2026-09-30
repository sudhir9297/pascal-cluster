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
import whiteOak from '../assets/catalog/white-oak-transparent-thumbnail.png'
import redMaple from '../assets/catalog/red-maple-transparent-thumbnail.png'
import tulipPoplar from '../assets/catalog/tulip-poplar-transparent-thumbnail.png'
import sweetgum from '../assets/catalog/sweetgum-transparent-thumbnail.webp'
import americanBeech from '../assets/catalog/american-beech-transparent-thumbnail.webp'
import ponderosaPine from '../assets/catalog/ponderosa-pine-transparent-thumbnail.webp'
import loblollyPine from '../assets/catalog/loblolly-pine-transparent-thumbnail.webp'
import douglasFir from '../assets/catalog/douglas-fir-transparent-thumbnail.webp'
import cultivatedApple from '../assets/catalog/cultivated-apple-transparent-thumbnail.webp'
import sweetCherry from '../assets/catalog/sweet-cherry-transparent-thumbnail.webp'
import paperBirch from '../assets/catalog/paper-birch-transparent-thumbnail.webp'
import quakingAspen from '../assets/catalog/quaking-aspen-transparent-thumbnail.webp'
import americanSycamore from '../assets/catalog/american-sycamore-transparent-thumbnail.webp'
import floweringDogwood from '../assets/catalog/flowering-dogwood-transparent-thumbnail.webp'
import weepingWillow from '../assets/catalog/weeping-willow-transparent-thumbnail.webp'
import joshuaTree from '../assets/catalog/joshua-tree-transparent-thumbnail.webp'
import saguaro from '../assets/catalog/saguaro-transparent-thumbnail.webp'
import creosoteBush from '../assets/catalog/creosote-bush-transparent-thumbnail.webp'
import blackbrush from '../assets/catalog/blackbrush-transparent-thumbnail.webp'
import bigSagebrush from '../assets/catalog/big-sagebrush-transparent-thumbnail.webp'

const src = (image: { src: string }) => image.src
export const TREE_SPECIES_THUMBNAILS: Record<string, string> = {
  whiteOak: src(whiteOak),
  redMaple: src(redMaple),
  tulipPoplar: src(tulipPoplar),
  sweetgum: src(sweetgum),
  americanBeech: src(americanBeech),
  pine: src(ponderosaPine),
  loblolly: src(loblollyPine),
  douglasFir: src(douglasFir),
  apple: src(cultivatedApple),
  cherry: src(sweetCherry),
  paperBirch: src(paperBirch),
  quakingAspen: src(quakingAspen),
  americanSycamore: src(americanSycamore),
  floweringDogwood: src(floweringDogwood),
  weepingWillow: src(weepingWillow),
  joshuaTree: src(joshuaTree),
  saguaro: src(saguaro),
  creosote: src(creosoteBush),
  blackbrush: src(blackbrush),
  sagebrush: src(bigSagebrush),
}
const treeThumbnail = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" fill="#d5ddc4"/><path d="M0 91h160v9H0z" fill="#7e9a6f"/><path d="M76 91 73 47h15l-5 44z" fill="#68513a"/><path d="M79 72 55 48M82 65l26-23" fill="none" stroke="#68513a" stroke-width="5"/><g fill="#477d43"><circle cx="79" cy="26" r="25"/><circle cx="52" cy="39" r="19"/><circle cx="108" cy="37" r="21"/><circle cx="66" cy="51" r="18"/><circle cx="98" cy="51" r="18"/></g></svg>')}`
const grass2Thumbnail = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><rect width="160" height="100" fill="#70814f"/><path d="M0 87Q30 67 58 83T112 78T160 84V100H0Z" fill="#4d6339"/><g fill="none" stroke-linecap="round"><path d="M8 94q7-28 12-34M15 94q-7-21-12-25M32 94q3-31 13-44M38 94q-9-22-18-29M58 94q8-33 17-46M69 94q-6-24-16-32M92 94q1-31 9-41M98 94q-7-25-17-30M121 94q5-35 16-48M130 94q-6-22-17-30M151 94q-3-30-9-39" stroke="#9baa69" stroke-width="3"/><path d="M20 85q1-20 7-27M48 86q-1-18-8-26M80 89q6-17 11-23M111 88q-2-20-10-26M143 86q5-16 10-23" stroke="#aec17a" stroke-width="2"/></g><g fill="#edc947"><circle cx="45" cy="49" r="4"/><circle cx="136" cy="45" r="4"/></g><g fill="#e8e1d7"><circle cx="75" cy="48" r="3"/><circle cx="100" cy="53" r="3"/></g><g fill="#9a81bf"><circle cx="27" cy="58" r="3"/></g></svg>')}`

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
  tree: treeThumbnail,
  plant: treeThumbnail,
} as const

export const WALKWAY_THUMBNAILS = {
  straight: src(walkwayStraight),
  curve: src(walkwayCurve),
  stone: src(walkwayStone),
} as const

export const GROUND_SURFACE_THUMBNAILS = {
  grass: src(groundGrass),
  grass2: grass2Thumbnail,
  soil: src(groundSoil),
  mulch: src(groundMulch),
  gravel: src(groundGravel),
  sand: src(groundSand),
  mud: src(groundMud),
} as const
