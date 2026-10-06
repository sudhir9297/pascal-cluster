import { CORNER_VANITY, WALL_MOUNTED_VANITY, type VanityNode } from './schema'

export type VanitySizeOption = { label: string; patch: Record<string, number>; source: string }
const ikea = 'https://www.ikea.com/gb/en/p/aengsjoen-wash-stand-with-drawers-high-gloss-white-30535086/'
const hudson = 'https://www.hudsonreed.co.uk/pdf/a/420/HR-July24-Full-Brochure-LR-V2.pdf'
const quen = 'https://www.signaturehardware.com/24-in-quen-vanity---driftwood-brown---vanity-cabinet-only/482891.html'
const unicab = 'https://fienza.com.au/product/unicab-900-cabinet-on-kickboard-left-hand-drawers/'
const corner = 'https://productspec.co.nz/media/tywojafw/stella-corners-cabinet-specification.pdf'
const tolken = 'https://www.ikea.com/gb/en/p/tolken-countertop-grey-stone-effect-foliated-board-30554999/'
const stone = 'https://signaturehdwr.a.bigcontent.io/v1/static/60-rec-um-vanity-top-spec-09-11-2025'

// Footprints resize the cabinet, preserving its installation, height and design.
// Decorative front/base styles share the same mounting-family references.
export function vanitySizeOptions(node: VanityNode, maxWidth = node.type === CORNER_VANITY ? 1.2 : 1.8): VanitySizeOption[] {
  const sizes: { width: number; depth?: number; source: string }[] = node.type === CORNER_VANITY
    ? [.6, .9].map(width => ({ width, source: corner }))
    : node.type === WALL_MOUNTED_VANITY
      ? [.6, .8, 1].map(width => ({ width, depth: .475, source: ikea }))
      : [{ width: .6, depth: .355, source: hudson }, { width: .8, depth: .355, source: hudson }, { width: .6096, depth: .5334, source: quen }, { width: .88, depth: .445, source: unicab }]
  return sizes.filter(size => size.width <= maxWidth).sort((a, b) => a.width - b.width).map((size): VanitySizeOption => ({
    label: size.depth === undefined ? `${size.width * 1000} × ${size.width * 1000} mm` : `${Number((size.width * 1000).toFixed(1))} × ${Number((size.depth * 1000).toFixed(1))} mm`,
    patch: size.depth === undefined ? { width: size.width } : { width: size.width, depth: size.depth },
    source: size.source,
  }))
}

export function vanityDimensionReferences(node: VanityNode, key: string, maxWidth?: number): { value: number; label: string; source: string }[] {
  let references: { value: number; source: string }[] = []
  if (key === 'width' || key === 'depth') references = vanitySizeOptions(node, maxWidth).flatMap(option => option.patch[key] === undefined ? [] : [{ value: option.patch[key]!, source: option.source }])
  const top = node.countertopEnabled ? node.countertopThickness : 0
  if (key === 'height') references = node.type === WALL_MOUNTED_VANITY
    ? [{ value: node.mountingHeight + .628 + top, source: ikea }]
    : node.type === CORNER_VANITY
      ? [{ value: .87, source: corner }]
      : [{ value: .864 + top, source: hudson }, { value: .86995 + top, source: quen }, { value: .88 + top, source: unicab }]
  if (key === 'countertopThickness' && node.countertopEnabled) references = [{ value: .02, source: tolken }, { value: .03, source: stone }]
  return references.filter((reference, index, all) => reference.value >= 0 && (key !== 'height' || reference.value <= 1.1) && all.findIndex(item => item.value === reference.value) === index).sort((a, b) => a.value - b.value).map(reference => ({ ...reference, label: `${Number((reference.value * 1000).toFixed(2))} mm` }))
}
