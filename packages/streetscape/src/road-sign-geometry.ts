import { ExtrudeGeometry, Shape, ShapeGeometry } from 'three'
import { getRoadSignConfig } from './road-sign-config'
import type { RoadSignNode } from './schema'

export const ROAD_SIGN_PLATE_THICKNESS_M = 0.003
export const ROAD_SIGN_POST_RADIUS_M = 0.03
export const ROAD_SIGN_POST_WIDTH_M = 0.041
export const ROAD_SIGN_POST_DEPTH_M = 0.045
export const ROAD_SIGN_POST_THICKNESS_M = 0.004
export const ROAD_SIGN_BRACKET_DEPTH_M = 0.005
export const ROAD_SIGN_BRACKET_HEIGHT_M = 0.025
export const ROAD_SIGN_EDGE_BEVEL_M = 0.001
export const ROAD_SIGN_FACE_GRAPHIC_GAP_M = 0.003
export const ROAD_SIGN_BACK_FACE_GAP_M = 0.003
export const ROAD_SIGN_BRACKET_EDGE_CLEARANCE_M = 0.02

export type RoadSignLayout = {
  signId: string
  shape: ReturnType<typeof getRoadSignConfig>['shape']
  postStyle: ReturnType<typeof getRoadSignConfig>['postStyle']
  width: number
  height: number
  scale: number
  postHeight: number
  signBottomY: number
  signCenterY: number
  postTopY: number
  plateThickness: number
  postRadius: number
  postCount: 1 | 2
  postSpacing: number
}

export function resolveRoadSignLayout(node: RoadSignNode): RoadSignLayout {
  const config = getRoadSignConfig(node.signId)
  const scale = node.scale ?? 1
  const width = config.width * scale
  const height = config.height * scale
  const signBottomY = node.postHeight ?? 2.1
  return {
    signId: config.id,
    shape: config.shape,
    postStyle: config.postStyle,
    width,
    height,
    scale,
    postHeight: signBottomY,
    signBottomY,
    signCenterY: signBottomY + height / 2,
    postTopY: signBottomY + height * 0.68,
    plateThickness: ROAD_SIGN_PLATE_THICKNESS_M * Math.max(0.8, Math.min(scale, 1.4)),
    postRadius: ROAD_SIGN_POST_RADIUS_M * Math.max(0.8, Math.min(scale, 1.4)),
    postCount: node.mounting === 'double-post' ? 2 : 1,
    postSpacing: Math.min(width * 0.58, 0.72),
  }
}

export function resolveRoadSignBracketWidth(layout: RoadSignLayout): number {
  const halfWidth = layout.width / 2
  const halfHeight = layout.height / 2
  const localY = -layout.height * 0.32
  let halfWidthAtBracket = halfWidth

  if (layout.shape === 'circle') {
    halfWidthAtBracket = Math.sqrt(Math.max(0, halfWidth ** 2 - localY ** 2))
  } else if (layout.shape === 'diamond') {
    halfWidthAtBracket = halfWidth * Math.max(0, 1 - Math.abs(localY) / halfHeight)
  } else if (layout.shape === 'triangle') {
    halfWidthAtBracket = halfWidth * Math.max(0, 1 - (localY + halfHeight) / (halfHeight * 2))
  } else if (layout.shape === 'octagon') {
    const cut = Math.min(layout.width, layout.height) * 0.1464
    if (localY < -halfHeight + cut) {
      const progress = Math.max(0, (localY + halfHeight) / cut)
      halfWidthAtBracket = halfWidth - cut + progress * cut
    } else if (localY > halfHeight - cut) {
      const progress = Math.max(0, (halfHeight - localY) / cut)
      halfWidthAtBracket = halfWidth - cut + progress * cut
    }
  }

  const shapeSafeWidth = Math.max(0.08, halfWidthAtBracket * 2 - ROAD_SIGN_BRACKET_EDGE_CLEARANCE_M * 2)
  return Math.min(layout.width * 0.8, 0.68, shapeSafeWidth)
}

export function resolveRoadSignPostPositions(layout: RoadSignLayout): readonly number[] {
  if (layout.postCount !== 2 || layout.postSpacing <= 0) return [0]
  const halfSpacing = layout.postSpacing / 2
  return [-halfSpacing, halfSpacing]
}

export function createRoadSignShape(shape: RoadSignLayout['shape'], width: number, height: number): Shape {
  const result = new Shape()
  const halfWidth = width / 2
  const halfHeight = height / 2

  if (shape === 'circle') {
    result.absarc(0, 0, Math.min(halfWidth, halfHeight), 0, Math.PI * 2, false)
    return result
  }

  if (shape === 'triangle') {
    result.moveTo(0, halfHeight)
    result.lineTo(halfWidth, -halfHeight)
    result.lineTo(-halfWidth, -halfHeight)
    result.closePath()
    return result
  }

  if (shape === 'diamond') {
    result.moveTo(0, halfHeight)
    result.lineTo(halfWidth, 0)
    result.lineTo(0, -halfHeight)
    result.lineTo(-halfWidth, 0)
    result.closePath()
    return result
  }

  if (shape === 'octagon') {
    const cut = Math.min(width, height) * 0.1464
    result.moveTo(-halfWidth + cut, halfHeight)
    result.lineTo(halfWidth - cut, halfHeight)
    result.lineTo(halfWidth, halfHeight - cut)
    result.lineTo(halfWidth, -halfHeight + cut)
    result.lineTo(halfWidth - cut, -halfHeight)
    result.lineTo(-halfWidth + cut, -halfHeight)
    result.lineTo(-halfWidth, -halfHeight + cut)
    result.lineTo(-halfWidth, halfHeight - cut)
    result.closePath()
    return result
  }

  result.moveTo(-halfWidth, halfHeight)
  result.lineTo(halfWidth, halfHeight)
  result.lineTo(halfWidth, -halfHeight)
  result.lineTo(-halfWidth, -halfHeight)
  result.closePath()
  return result
}

export function buildRoadSignPlateGeometry(layout: RoadSignLayout): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(createRoadSignShape(layout.shape, layout.width, layout.height), {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: Math.min(ROAD_SIGN_EDGE_BEVEL_M, Math.min(layout.width, layout.height) * 0.002),
    bevelThickness: Math.min(ROAD_SIGN_EDGE_BEVEL_M, Math.min(layout.width, layout.height) * 0.002),
    curveSegments: 16,
    depth: layout.plateThickness,
  })
  geometry.translate(0, 0, -layout.plateThickness / 2)
  geometry.computeVertexNormals()
  return geometry
}

export function buildRoadSignBackGeometry(layout: RoadSignLayout): ShapeGeometry {
  const geometry = new ShapeGeometry(createRoadSignShape(layout.shape, layout.width, layout.height))
  geometry.translate(0, 0, -layout.plateThickness / 2 - ROAD_SIGN_BACK_FACE_GAP_M)
  return geometry
}
