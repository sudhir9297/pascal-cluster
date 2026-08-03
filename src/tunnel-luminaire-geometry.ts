import { BufferGeometry, Float32BufferAttribute } from 'three'

/**
 * Dimensions for a sealed, continuous-line LED tunnel luminaire.
 *
 * The 130 x 77 mm cross-section and the clip-mounted extruded body follow the
 * proportions of current road-tunnel luminaires. `armLength` remains the
 * catalog's shared editable parameter, but for this product it is the actual
 * optical-unit length.
 */
export const TUNNEL_LUMINAIRE_DIMENSIONS = {
  minLength: 0.8,
  maxLength: 4,
  bodyWidth: 0.13,
  bodyHeight: 0.077,
  bodyChamfer: 0.014,
  endCapLength: 0.032,
  opticEndInset: 0.075,
  opticStripWidth: 0.038,
  opticStripOffset: 0.027,
  opticDepth: 0.012,
  centreRailWidth: 0.018,
  topFinHeight: 0.015,
  topFinWidth: 0.009,
  mountingClipLength: 0.048,
  mountingClipWidth: 0.168,
  mountingClipHeight: 0.018,
  mountingStudHeight: 0.055,
  mountingPlateSize: 0.09,
  connectorLength: 0.075,
  connectorRadius: 0.024,
  modulePitch: 0.16,
} as const

export const TUNNEL_LUMINAIRE_TOP_FIN_OFFSETS = [-0.048, -0.024, 0, 0.024, 0.048] as const

export type TunnelLuminaireLayout = {
  length: number
  bodyWidth: number
  bodyHeight: number
  opticLength: number
  opticStripWidth: number
  opticStripOffsets: readonly [number, number]
  moduleCenters: number[]
  mountingClipCenters: readonly [number, number]
  fixtureCenterY: number
}

export function resolveTunnelLuminaireLayout(
  length: number,
  mountingHeight = 6,
): TunnelLuminaireLayout {
  const dimensions = TUNNEL_LUMINAIRE_DIMENSIONS
  const resolvedLength = Math.max(dimensions.minLength, Math.min(dimensions.maxLength, length))
  const opticLength = resolvedLength - dimensions.opticEndInset * 2
  const moduleCount = Math.max(4, Math.min(24, Math.floor(opticLength / dimensions.modulePitch)))
  const pitch = opticLength / moduleCount
  const moduleCenters = Array.from(
    { length: moduleCount },
    (_, index) => -opticLength / 2 + pitch * (index + 0.5),
  )
  const clipInset = Math.min(0.22, resolvedLength * 0.18)

  return {
    length: resolvedLength,
    bodyWidth: dimensions.bodyWidth,
    bodyHeight: dimensions.bodyHeight,
    opticLength,
    opticStripWidth: dimensions.opticStripWidth,
    opticStripOffsets: [-dimensions.opticStripOffset, dimensions.opticStripOffset],
    moduleCenters,
    mountingClipCenters: [
      -resolvedLength / 2 + clipInset,
      resolvedLength / 2 - clipInset,
    ],
    // `height` is the finished mounting plane. The clip and stud sit between
    // that plane and the top of the optical unit.
    fixtureCenterY:
      mountingHeight -
      dimensions.mountingStudHeight -
      dimensions.mountingClipHeight -
      dimensions.bodyHeight / 2,
  }
}

/** A long eight-sided extrusion with clipped upper and lower corners. */
export function buildTunnelLuminaireHousingGeometry(length: number): BufferGeometry {
  const dimensions = TUNNEL_LUMINAIRE_DIMENSIONS
  const halfX = length / 2
  const halfY = dimensions.bodyHeight / 2
  const halfZ = dimensions.bodyWidth / 2
  const bevel = dimensions.bodyChamfer
  const crossSection = [
    [halfY - bevel, -halfZ],
    [halfY, -halfZ + bevel],
    [halfY, halfZ - bevel],
    [halfY - bevel, halfZ],
    [-halfY + bevel, halfZ],
    [-halfY, halfZ - bevel],
    [-halfY, -halfZ + bevel],
    [-halfY + bevel, -halfZ],
  ] as const
  const vertices: number[] = []
  const indices: number[] = []

  for (const x of [-halfX, halfX]) {
    for (const [y, z] of crossSection) vertices.push(x, y, z)
  }

  for (let index = 0; index < crossSection.length; index += 1) {
    const next = (index + 1) % crossSection.length
    indices.push(index, index + 8, next + 8, index, next + 8, next)
  }
  for (let index = 1; index < crossSection.length - 1; index += 1) {
    indices.push(0, index + 1, index)
    indices.push(8, 8 + index, 8 + index + 1)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}
