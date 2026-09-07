import type { RoadGraphEdge } from './schema'

export type RoadTurn = 'through' | 'left' | 'right'
type Point2 = readonly [number, number]

/** Empty/unknown indications never become an invented straight arrow. */
export function parseTurnLanes(raw: string, laneCount: number): RoadTurn[][] {
  const lanes = raw.split('|')
  if (lanes.length !== laneCount) return []
  return lanes.map((lane) => {
    const turns = [...new Set(lane.split(';').map((turn) => turn.trim()))]
    return turns.every((turn) => turn === 'through' || turn === 'left' || turn === 'right')
      ? (turns as RoadTurn[])
      : []
  })
}

export function approachTurnLanes(
  edge: RoadGraphEdge,
  junctionId: string,
  laneCount: number,
): RoadTurn[][] | undefined {
  const raw = edge.turnLanes?.[junctionId === edge.startNodeId ? 'start' : 'end']
  // Retain the legacy illustrative arrows only on roads without imported metadata.
  if (raw === undefined) return edge.osmSource || edge.turnLanes ? [] : undefined
  return parseTurnLanes(raw, laneCount)
}

/** Coordinates are metres along travel and across to the driver's right. */
export function turnArrowPolygons(turns: RoadTurn[]): Point2[][] {
  if (!turns.length) return []
  const polygons: Point2[][] = [
    [
      [-1.7, 0.22],
      [0.55, 0.22],
      [0.55, -0.22],
      [-1.7, -0.22],
    ],
  ]
  if (turns.includes('through'))
    polygons.push([
      [0.15, 0.78],
      [2.1, 0],
      [0.15, -0.78],
    ])
  for (const turn of turns) {
    if (turn === 'through') continue
    const side = turn === 'left' ? -1 : 1
    polygons.push(
      [
        [0.11, 0],
        [0.55, 0],
        [0.55, side * 0.75],
        [0.11, side * 0.75],
      ],
      [
        [-0.22, side * 0.58],
        [0.33, side * 1.25],
        [0.88, side * 0.58],
      ],
    )
  }
  return polygons
}
