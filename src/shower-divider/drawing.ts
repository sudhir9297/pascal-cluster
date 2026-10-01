import { dividerRectangle, type Point } from './schema'

export type DividerDraftSegment = {
  start: Point
  end: Point
  width: number
  position: [number, number, number]
  rotation: number
}

/** Draft poses do not allocate scene IDs or build geometry. */
export function dividerDraftSegments(
  start: Point | null,
  end: Point | null,
  rectangle: boolean,
  elevation: number,
): DividerDraftSegment[] {
  if (!start || !end) return []
  const pairs: [Point, Point][] = rectangle
    ? dividerRectangle(start, end)
    : [[start, end]]
  return pairs.map(([a, b]) => ({
    start: a,
    end: b,
    width: Math.hypot(b[0] - a[0], b[1] - a[1]),
    position: [(a[0] + b[0]) / 2, elevation, (a[1] + b[1]) / 2],
    rotation: -Math.atan2(b[1] - a[1], b[0] - a[0]),
  }))
}

export function dividerDraftError(segments: DividerDraftSegment[]) {
  if (segments.every((segment) => segment.width < 0.01)) return ''
  return segments.some((segment) => segment.width < 0.2 || segment.width > 8)
    ? 'Each segment must be between 0.2 and 8 m.'
    : ''
}

export function dividerChainEnds(args: {
  rectangle: boolean
  continuation: string
  end: Point
  first: Point
  joinedExisting: boolean
}) {
  return (
    args.rectangle ||
    args.continuation === 'single' ||
    args.joinedExisting ||
    Math.hypot(args.end[0] - args.first[0], args.end[1] - args.first[1]) <= 0.01
  )
}
