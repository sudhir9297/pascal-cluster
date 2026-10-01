import type { FloorStandingToiletNode } from './schema'
export function toiletOutline(
  n: FloorStandingToiletNode,
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

// A single ceramic envelope keeps the foot, neck and bowl joined as dimensions change.
export function ceramicRings(
  n: FloorStandingToiletNode,
): [number, number, number][] {
  const bw = Math.min(n.baseWidth, n.width),
    bd = Math.min(n.baseDepth, n.depth)
  const skirt = n.baseStyle === 'skirted',
    bottom = -n.mountingHeight,
    t = n.wallThickness
  const neckY = -n.height + 0.02
  const neckW = skirt ? n.width * (1 - n.taper) : bw * 0.62
  const neckD = skirt ? n.depth * 0.76 : bd * 0.58
  return [
    [bw * 0.97, bd * 0.97, bottom],
    [bw, bd, bottom + 0.008],
    [bw, bd, bottom + 0.02],
    [skirt ? bw : bw * 0.85, skirt ? bd : bd * 0.85, bottom + 0.04],
    [
      neckW,
      neckD,
      Math.min(neckY - 0.015, bottom + (n.mountingHeight - n.height) * 0.65),
    ],
    [neckW, neckD, neckY],
    [n.width * 0.87, n.depth * 0.87, -n.height * 0.68],
    [n.width * 0.98, n.depth * 0.98, -n.height * 0.32],
    [n.width, n.depth, -0.028],
    [n.width, n.depth, -0.008],
    [n.width - 0.006, n.depth - 0.006, 0],
    [n.width - 2 * t, n.depth - 2 * t, 0],
    [n.width - 2 * t - 0.006, n.depth - 2 * t - 0.006, -0.012],
    [n.width * 0.68, n.depth * 0.68, -n.height * 0.38],
    [n.width * 0.43, n.depth * 0.43, -n.height * 0.7],
    [0.04, 0.055, -n.height + t],
    [0.001, 0.001, -n.height + t],
    [0.001, 0.001, bottom],
  ]
}
