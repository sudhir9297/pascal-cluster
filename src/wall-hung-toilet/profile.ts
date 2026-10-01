import type { WallHungToiletNode } from './schema'
export function toiletOutline(
  n: WallHungToiletNode,
  w = n.width,
  d = n.depth,
): [number, number][] {
  const exponent =
    n.style === 'square' ? 0.45 : n.style === 'd-shaped' ? 0.7 : 1
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i * Math.PI * 2) / 64,
      c = Math.cos(a),
      s = Math.sin(a)
    return [
      (Math.sign(c) * Math.abs(c) ** exponent * w) / 2,
      ((n.style === 'd-shaped' && s > 0
        ? Math.min(1, s * 2)
        : Math.sign(s) * Math.abs(s) ** exponent) *
        d) /
        2,
    ]
  })
}
