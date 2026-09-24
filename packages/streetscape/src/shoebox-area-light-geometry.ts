import { BufferGeometry, Float32BufferAttribute } from 'three'

/**
 * Full-size commercial area luminaire proportions, expressed in metres.
 *
 * The head is based on the common 29 x 13 x 3 inch class of die-cast LED
 * area lights.  Keeping every view on this single set of dimensions prevents
 * the editor footprint from drifting away from the rendered fixture.
 */
export const SHOEBOX_AREA_LIGHT_DIMENSIONS = {
  housingStartX: -0.12,
  housingEndX: 0.78,
  housingWidth: 0.34,
  housingHeight: 0.1,
  lensStartX: 0.11,
  lensEndX: 0.69,
  lensWidth: 0.28,
  lensDrop: 0.022,
  poleWidth: 0.22,
  basePlateWidth: 0.46,
  defaultArmLength: 0.55,
} as const

/** Plan/loft stations run from the pole-side casting to the tapered nose. */
export const SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS = [
  { x: SHOEBOX_AREA_LIGHT_DIMENSIONS.housingStartX, halfWidth: 0.075, top: 0.026, bottom: -0.026 },
  { x: 0.015, halfWidth: 0.14, top: 0.047, bottom: -0.038 },
  { x: 0.13, halfWidth: 0.17, top: 0.052, bottom: -0.045 },
  { x: 0.66, halfWidth: 0.17, top: 0.032, bottom: -0.048 },
  { x: SHOEBOX_AREA_LIGHT_DIMENSIONS.housingEndX, halfWidth: 0.12, top: 0.006, bottom: -0.04 },
] as const

export const SHOEBOX_AREA_LIGHT_OPTIC_MODULE_CENTERS = [0.21, 0.4, 0.59] as const
export const SHOEBOX_AREA_LIGHT_OPTIC_CELL_X_OFFSETS = [-0.044, 0.044] as const
export const SHOEBOX_AREA_LIGHT_OPTIC_CELL_Z_OFFSETS = [-0.075, 0, 0.075] as const
export const SHOEBOX_AREA_LIGHT_HEAT_SINK_Z = [-0.12, -0.08, -0.04, 0, 0.04, 0.08, 0.12] as const

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
    const b = Math.min(bevel, section.halfWidth * 0.35, (section.top - section.bottom) * 0.35)
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

export function buildShoeboxAreaLightHousingGeometry(): BufferGeometry {
  return buildChamferedLoft(SHOEBOX_AREA_LIGHT_HOUSING_SECTIONS, 0.012)
}

export function buildShoeboxAreaLightLensGeometry(): BufferGeometry {
  const { lensDrop, lensEndX, lensStartX, lensWidth } = SHOEBOX_AREA_LIGHT_DIMENSIONS
  return buildChamferedLoft(
    [
      { x: lensStartX, halfWidth: lensWidth / 2 - 0.012, top: -0.052, bottom: -0.052 - lensDrop },
      { x: lensStartX + 0.025, halfWidth: lensWidth / 2, top: -0.054, bottom: -0.054 - lensDrop },
      { x: lensEndX - 0.025, halfWidth: lensWidth / 2, top: -0.054, bottom: -0.054 - lensDrop },
      { x: lensEndX, halfWidth: lensWidth / 2 - 0.018, top: -0.051, bottom: -0.051 - lensDrop },
    ],
    0.006,
  )
}

/** A slightly tapered, chamfered outreach arm instead of a plain box beam. */
export function buildShoeboxAreaLightArmGeometry(length: number): BufferGeometry {
  const span = Math.max(0.35, length)
  return buildChamferedLoft(
    [
      { x: 0.02, halfWidth: 0.075, top: 0.07, bottom: -0.07 },
      { x: Math.max(0.16, span - 0.14), halfWidth: 0.055, top: 0.042, bottom: -0.042 },
      { x: span + 0.015, halfWidth: 0.075, top: 0.055, bottom: -0.055 },
    ],
    0.01,
  )
}
