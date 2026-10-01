/** A quarter ellipse with its corner at (-length/2, width/2), sampled in radial order. */
export function bathCornerOutline(length: number, width: number): [number, number][] {
  const count = 96, angles = Array.from({ length: count }, (_, i) => i * Math.PI * 2 / count)
  // Include all three corners exactly so both bounds and wall contact planes are exact.
  for (const [x, z] of [[length / 2, width / 2], [-length / 2, width / 2], [-length / 2, -width / 2]]) {
    const angle = (Math.atan2(z!, x!) + Math.PI * 2) % (Math.PI * 2)
    const index = Math.round(angle * count / (Math.PI * 2)) % count
    angles[index] = angle
  }
  angles.sort((a, b) => a - b)
  return angles.map(angle => {
    const c = Math.cos(angle), s = Math.sin(angle)
    const a = (c / length) ** 2 + (s / width) ** 2
    const b = c / length - s / width
    const arc = (-b + Math.sqrt(b * b + 2 * a)) / (2 * a)
    const side = c < -1e-8 ? -length / (2 * c) : Infinity
    const rear = s > 1e-8 ? width / (2 * s) : Infinity
    const radius = Math.min(arc, side, rear)
    return [radius * c, radius * s]
  })
}
