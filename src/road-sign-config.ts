export const ROAD_SIGN_IDS = [
  'stop',
  'yield',
  'speed-limit',
  'no-entry',
  'no-parking',
  'pedestrian-crossing',
  'warning',
  'directional',
] as const

export type RoadSignId = (typeof ROAD_SIGN_IDS)[number]
export type RoadSignShape = 'octagon' | 'triangle' | 'circle' | 'diamond' | 'rectangle'
export type RoadSignPostStyle = 'u-channel' | 'round'
export type RoadSignGraphic =
  | 'stop'
  | 'yield'
  | 'speed-limit'
  | 'no-entry'
  | 'no-parking'
  | 'pedestrian-crossing'
  | 'warning'
  | 'directional'

export type RoadSignCatalogEntry = {
  id: RoadSignId
  label: string
  description: string
  category: 'regulatory' | 'warning' | 'guidance'
  shape: RoadSignShape
  postStyle: RoadSignPostStyle
  graphic: RoadSignGraphic
  width: number
  height: number
  backgroundColor: string
  borderColor: string
  defaultText: string
}

/**
 * A deliberately generic starter pack. The node stores the catalog key rather
 * than baking these graphics into its schema, so jurisdiction-specific packs
 * can replace or extend this table without changing the 3D implementation.
 */
export const ROAD_SIGN_CATALOG: readonly RoadSignCatalogEntry[] = [
  {
    id: 'stop',
    label: 'Stop',
    description: 'Red octagonal stop sign on a single roadside post.',
    category: 'regulatory',
    shape: 'octagon',
    postStyle: 'u-channel',
    graphic: 'stop',
    width: 0.762,
    height: 0.762,
    backgroundColor: '#c93432',
    borderColor: '#ffffff',
    defaultText: 'STOP',
  },
  {
    id: 'yield',
    label: 'Yield',
    description: 'Yield or give-way triangle with a high-contrast border.',
    category: 'regulatory',
    shape: 'triangle',
    postStyle: 'u-channel',
    graphic: 'yield',
    width: 0.86,
    height: 0.86,
    backgroundColor: '#ffffff',
    borderColor: '#d53b35',
    defaultText: 'YIELD',
  },
  {
    id: 'speed-limit',
    label: 'Speed limit',
    description: 'Circular speed-limit plate with editable display text.',
    category: 'regulatory',
    shape: 'circle',
    postStyle: 'u-channel',
    graphic: 'speed-limit',
    width: 0.78,
    height: 0.78,
    backgroundColor: '#f7f4e9',
    borderColor: '#c93432',
    defaultText: '50',
  },
  {
    id: 'no-entry',
    label: 'No entry',
    description: 'Red circular no-entry sign with a white horizontal bar.',
    category: 'regulatory',
    shape: 'circle',
    postStyle: 'u-channel',
    graphic: 'no-entry',
    width: 0.78,
    height: 0.78,
    backgroundColor: '#d53b35',
    borderColor: '#ffffff',
    defaultText: '',
  },
  {
    id: 'no-parking',
    label: 'No parking',
    description: 'Blue parking restriction plate with a red slash.',
    category: 'regulatory',
    shape: 'circle',
    postStyle: 'u-channel',
    graphic: 'no-parking',
    width: 0.78,
    height: 0.78,
    backgroundColor: '#285a9f',
    borderColor: '#d53b35',
    defaultText: 'P',
  },
  {
    id: 'pedestrian-crossing',
    label: 'Pedestrian crossing',
    description: 'High-visibility crossing warning plate.',
    category: 'warning',
    shape: 'diamond',
    postStyle: 'u-channel',
    graphic: 'pedestrian-crossing',
    width: 0.86,
    height: 0.86,
    backgroundColor: '#f3c84b',
    borderColor: '#252a2f',
    defaultText: '',
  },
  {
    id: 'warning',
    label: 'General warning',
    description: 'Generic yellow diamond warning sign for hazards or works.',
    category: 'warning',
    shape: 'diamond',
    postStyle: 'u-channel',
    graphic: 'warning',
    width: 0.86,
    height: 0.86,
    backgroundColor: '#f3c84b',
    borderColor: '#252a2f',
    defaultText: '!',
  },
  {
    id: 'directional',
    label: 'Directional',
    description: 'Blue rectangular wayfinding sign with an arrow.',
    category: 'guidance',
    shape: 'rectangle',
    postStyle: 'u-channel',
    graphic: 'directional',
    width: 1.35,
    height: 0.62,
    backgroundColor: '#285a9f',
    borderColor: '#f7f4e9',
    defaultText: 'WAY',
  },
] as const

export const ROAD_SIGN_CATALOG_BY_ID = Object.fromEntries(
  ROAD_SIGN_CATALOG.map((entry) => [entry.id, entry]),
) as Record<RoadSignId, RoadSignCatalogEntry>

export function getRoadSignConfig(signId: string): RoadSignCatalogEntry {
  return ROAD_SIGN_CATALOG_BY_ID[signId as RoadSignId] ?? ROAD_SIGN_CATALOG_BY_ID.stop
}

export function resolveRoadSignText(signId: string, text?: string): string {
  const config = getRoadSignConfig(signId)
  return text?.trim() || config.defaultText
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character] ?? character
  })
}

function polygonPoints(points: readonly [number, number][]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ')
}

function signShapeMarkup(
  shape: RoadSignShape,
  width: number,
  height: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
): string {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const inset = strokeWidth / 2
  const safeHalfWidth = Math.max(0, halfWidth - inset)
  const safeHalfHeight = Math.max(0, halfHeight - inset)
  if (shape === 'circle') {
    const radius = Math.min(safeHalfWidth, safeHalfHeight)
    return `<circle cx="0" cy="0" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
  }
  if (shape === 'triangle') {
    return `<polygon points="${polygonPoints([[0, -safeHalfHeight], [safeHalfWidth, safeHalfHeight], [-safeHalfWidth, safeHalfHeight]])}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
  }
  if (shape === 'diamond') {
    return `<polygon points="${polygonPoints([[0, -safeHalfHeight], [safeHalfWidth, 0], [0, safeHalfHeight], [-safeHalfWidth, 0]])}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
  }
  if (shape === 'octagon') {
    const cut = Math.min(width, height) * 0.1464
    return `<polygon points="${polygonPoints([
      [-safeHalfWidth + cut, -safeHalfHeight],
      [safeHalfWidth - cut, -safeHalfHeight],
      [safeHalfWidth, -safeHalfHeight + cut],
      [safeHalfWidth, safeHalfHeight - cut],
      [safeHalfWidth - cut, safeHalfHeight],
      [-safeHalfWidth + cut, safeHalfHeight],
      [-safeHalfWidth, safeHalfHeight - cut],
      [-safeHalfWidth, -safeHalfHeight + cut],
    ])}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`
  }
  return `<rect x="${-safeHalfWidth}" y="${-safeHalfHeight}" width="${safeHalfWidth * 2}" height="${safeHalfHeight * 2}" rx="${Math.min(width, height) * 0.06}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
}

function pedestrianGraphic(): string {
  return `<g fill="none" stroke="#252a2f" stroke-linecap="round" stroke-linejoin="round" stroke-width="${0.065}">
    <circle cx="0" cy="-0.18" r="0.065" fill="#252a2f" stroke="none"/>
    <path d="M0 -0.1 L0.01 0.08 L-0.12 0.27 M0.01 0.08 L0.15 0.2 M0 0.02 L-0.15 0.1"/>
  </g>`
}

/**
 * Generates the sign face as SVG so text and pictograms stay crisp at any
 * camera distance without adding a font or texture asset dependency.
 */
export function buildRoadSignGraphicSvg(input: {
  signId: string
  text?: string
  width?: number
  height?: number
}): string {
  const config = getRoadSignConfig(input.signId)
  const width = input.width ?? config.width
  const height = input.height ?? config.height
  const text = escapeXml(resolveRoadSignText(input.signId, input.text))
  const strokeWidth = Math.min(width, height) * 0.055
  const shape = signShapeMarkup(
    config.shape,
    width,
    height,
    config.backgroundColor,
    config.borderColor,
    strokeWidth,
  )
  const fontFamily = 'Arial, Helvetica, sans-serif'
  let graphic = ''

  switch (config.graphic) {
    case 'stop':
      graphic = `<text x="0" y="0.09" text-anchor="middle" font-family="${fontFamily}" font-size="${height * 0.22}" font-weight="800" letter-spacing="${height * 0.012}" fill="#ffffff">${text}</text>`
      break
    case 'yield':
      graphic = `<polygon points="${polygonPoints([[0, -height * 0.29], [width * 0.31, height * 0.25], [-width * 0.31, height * 0.25]])}" fill="#ffffff"/>
        <text x="0" y="${height * 0.22}" text-anchor="middle" font-family="${fontFamily}" font-size="${height * 0.14}" font-weight="800" fill="#d53b35">${text}</text>`
      break
    case 'speed-limit':
      graphic = `<text x="0" y="${height * 0.07}" text-anchor="middle" font-family="${fontFamily}" font-size="${height * 0.31}" font-weight="800" fill="#252a2f">${text}</text>`
      break
    case 'no-entry':
      graphic = `<rect x="${-width * 0.29}" y="${-height * 0.045}" width="${width * 0.58}" height="${height * 0.09}" rx="${height * 0.03}" fill="#ffffff"/>`
      break
    case 'no-parking':
      graphic = `<text x="0" y="${height * 0.1}" text-anchor="middle" font-family="${fontFamily}" font-size="${height * 0.43}" font-weight="800" fill="#ffffff">${text}</text>
        <path d="M${-width * 0.31} ${height * 0.31} L${width * 0.31} ${-height * 0.31}" stroke="#d53b35" stroke-width="${height * 0.075}"/>`
      break
    case 'pedestrian-crossing':
      graphic = pedestrianGraphic()
      break
    case 'warning':
      graphic = `<text x="0" y="${height * 0.15}" text-anchor="middle" font-family="${fontFamily}" font-size="${height * 0.48}" font-weight="800" fill="#252a2f">${text}</text>`
      break
    case 'directional':
      graphic = `<path d="M${-width * 0.31} 0 L${-width * 0.08} ${-height * 0.22} L${-width * 0.08} ${-height * 0.1} L${width * 0.28} ${-height * 0.1} L${width * 0.28} ${height * 0.1} L${-width * 0.08} ${height * 0.1} L${-width * 0.08} ${height * 0.22} Z" fill="#ffffff"/>
        <text x="${width * 0.1}" y="${height * 0.065}" text-anchor="middle" font-family="${fontFamily}" font-size="${height * 0.16}" font-weight="800" fill="#285a9f">${text}</text>`
      break
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-width / 2} ${-height / 2} ${width} ${height}" width="${width * 100}" height="${height * 100}">
    <rect width="100%" height="100%" fill="none"/>
    ${shape}
    ${graphic}
  </svg>`
}

export function roadSignGraphicDataUri(input: {
  signId: string
  text?: string
  width?: number
  height?: number
}): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildRoadSignGraphicSvg(input))}`
}
