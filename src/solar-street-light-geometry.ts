import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three'

const SOLAR_CELL_SIZE_M = 0.16

/**
 * Shared dimensions for an all-in-one professional solar street luminaire.
 * The head follows the 965 x 480 x 245 mm class used by current pole-top and
 * side-entry solar luminaires, with the PV surface, battery and optic in one
 * serviceable die-cast assembly.
 */
export const SOLAR_STREET_LIGHT_DIMENSIONS = {
  housingStartX: -0.14,
  housingEndX: 0.825,
  housingWidth: 0.48,
  housingHeight: 0.245,
  panelStartX: -0.07,
  panelEndX: 0.74,
  panelWidth: 0.41,
  opticCenterX: 0.57,
  opticLength: 0.31,
  opticWidth: 0.33,
  basePlateSize: 0.46,
  poleBottomRadius: 0.135,
  poleTopRadius: 0.078,
  armRadius: 0.052,
} as const

export const SOLAR_STREET_LIGHT_HOUSING_SECTIONS = [
  { x: SOLAR_STREET_LIGHT_DIMENSIONS.housingStartX, halfWidth: 0.13, top: 0.07, bottom: -0.115 },
  { x: -0.045, halfWidth: 0.22, top: 0.105, bottom: -0.12 },
  { x: 0.13, halfWidth: 0.24, top: 0.122, bottom: -0.105 },
  { x: 0.69, halfWidth: 0.24, top: 0.09, bottom: -0.085 },
  { x: SOLAR_STREET_LIGHT_DIMENSIONS.housingEndX, halfWidth: 0.19, top: 0.045, bottom: -0.035 },
] as const

export const SOLAR_PANEL_COLUMNS = Math.max(
  1,
  Math.round(
    (SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX - SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX) /
      SOLAR_CELL_SIZE_M,
  ),
)
export const SOLAR_PANEL_ROWS = Math.max(
  1,
  Math.round(SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth / SOLAR_CELL_SIZE_M),
)
export const SOLAR_OPTIC_COLUMNS = 5
export const SOLAR_OPTIC_ROWS = 4

type LoftSection = {
  x: number
  halfWidth: number
  top: number
  bottom: number
}

function buildChamferedLoft(sections: readonly LoftSection[], bevel: number): BufferGeometry {
  const vertices: number[] = []
  const indices: number[] = []
  const ringSize = 8

  for (const section of sections) {
    const b = Math.min(bevel, section.halfWidth * 0.3, (section.top - section.bottom) * 0.3)
    const ring = [
      [section.top - b, -section.halfWidth],
      [section.top, -section.halfWidth + b],
      [section.top, section.halfWidth - b],
      [section.top - b, section.halfWidth],
      [section.bottom + b, section.halfWidth],
      [section.bottom, section.halfWidth - b],
      [section.bottom, -section.halfWidth + b],
      [section.bottom + b, -section.halfWidth],
    ]
    for (const [y, z] of ring) vertices.push(section.x, y ?? 0, z ?? 0)
  }

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    const current = sectionIndex * ringSize
    const next = current + ringSize
    for (let ringIndex = 0; ringIndex < ringSize; ringIndex += 1) {
      const following = (ringIndex + 1) % ringSize
      indices.push(
        current + ringIndex,
        next + ringIndex,
        next + following,
        current + ringIndex,
        next + following,
        current + following,
      )
    }
  }

  for (let index = 1; index < ringSize - 1; index += 1) {
    indices.push(0, index + 1, index)
    const end = (sections.length - 1) * ringSize
    indices.push(end, end + index, end + index + 1)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function buildSolarStreetLightHousingGeometry(): BufferGeometry {
  return buildChamferedLoft(SOLAR_STREET_LIGHT_HOUSING_SECTIONS, 0.018)
}

/**
 * The same procedurally generated PV-cell texture used by Editor's roof solar
 * panels.  One tile represents one 160 mm cell; UV repetition is applied by
 * `buildSolarStreetLightPanelGeometry` for this luminaire's compact panel.
 */
export function createSolarStreetLightPanelTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null

  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#dde3ec'
  ctx.fillRect(0, 0, size, size)

  const pad = size * 0.04
  const x = pad
  const y = pad
  const cellW = size - pad * 2
  const cellH = size - pad * 2
  const chamfer = cellW * 0.16

  ctx.beginPath()
  ctx.moveTo(x + chamfer, y)
  ctx.lineTo(x + cellW - chamfer, y)
  ctx.lineTo(x + cellW, y + chamfer)
  ctx.lineTo(x + cellW, y + cellH - chamfer)
  ctx.lineTo(x + cellW - chamfer, y + cellH)
  ctx.lineTo(x + chamfer, y + cellH)
  ctx.lineTo(x, y + cellH - chamfer)
  ctx.lineTo(x, y + chamfer)
  ctx.closePath()

  const gradient = ctx.createLinearGradient(x, y, x + cellW, y + cellH)
  gradient.addColorStop(0, '#0f1b3a')
  gradient.addColorStop(1, '#162546')
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.save()
  ctx.clip()
  ctx.strokeStyle = 'rgba(120, 150, 200, 0.10)'
  ctx.lineWidth = 0.5
  const fingers = 16
  for (let finger = 1; finger < fingers; finger += 1) {
    const fingerX = x + (cellW * finger) / fingers
    ctx.beginPath()
    ctx.moveTo(fingerX, y)
    ctx.lineTo(fingerX, y + cellH)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(200, 210, 225, 0.35)'
  ctx.lineWidth = Math.max(1, cellH * 0.008)
  for (let busbar = 1; busbar <= 2; busbar += 1) {
    const busbarY = y + (cellH * busbar) / 3
    ctx.beginPath()
    ctx.moveTo(x, busbarY)
    ctx.lineTo(x + cellW, busbarY)
    ctx.stroke()
  }
  ctx.restore()

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.anisotropy = 8
  texture.needsUpdate = true
  return texture
}

export function buildSolarStreetLightPanelGeometry(): BufferGeometry {
  const panelLength =
    SOLAR_STREET_LIGHT_DIMENSIONS.panelEndX - SOLAR_STREET_LIGHT_DIMENSIONS.panelStartX
  const geometry = new BoxGeometry(
    panelLength,
    0.012,
    SOLAR_STREET_LIGHT_DIMENSIONS.panelWidth,
  )
  const uv = geometry.getAttribute('uv') as BufferAttribute
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(
      index,
      uv.getX(index) * SOLAR_PANEL_COLUMNS,
      uv.getY(index) * SOLAR_PANEL_ROWS,
    )
  }
  uv.needsUpdate = true
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export type SolarStreetLightLayout = {
  height: number
  armLength: number
  headX: number
  headY: number
  armStartY: number
  armControlX: number
  armControlY: number
}

export function resolveSolarStreetLightLayout(height: number, armLength: number): SolarStreetLightLayout {
  const resolvedHeight = Math.max(2.5, height)
  const resolvedArmLength = Math.max(0.5, armLength)
  return {
    height: resolvedHeight,
    armLength: resolvedArmLength,
    headX: resolvedArmLength,
    headY: resolvedHeight + 0.16,
    armStartY: resolvedHeight - 0.08,
    armControlX: resolvedArmLength * 0.54,
    armControlY: resolvedHeight + 0.34,
  }
}
