import type { ShowerArmNode } from './schema'
export function ShowerArmShapePreview({
  style = 'round-adjustable',
  angle: sourceAngle,
}: {
  style?: ShowerArmNode['style']
  angle?: number
}) {
  const angle = sourceAngle ?? (style.endsWith('straight') ? 0 : style.endsWith('angled') ? 45 : 90)
  const curved = style.endsWith('curved'),
    arch = style.endsWith('gooseneck'),
    square = style.startsWith('square')
  const radians = (angle * Math.PI) / 180
  const x = angle === 0 ? 74 : 54 + 20 * Math.cos(radians),
    y = 24 + 20 * Math.sin(radians)
  const path = arch
    ? 'M16 42Q16 14 43 14Q74 14 74 45'
    : curved
      ? 'M16 24H58Q74 24 74 40V45'
      : angle === 0
        ? 'M16 24H74'
        : `M16 24H54L${x} ${y}`
  const endX = arch || curved ? 74 : x,
    endY = arch || curved ? 45 : y,
    rotation = arch || curved ? 90 : angle
  return (
    <svg
      viewBox="0 0 88 64"
      className="h-full w-full"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <path d="M12 14V48" strokeWidth="4" opacity=".3" />
      <path
        d={path}
        strokeWidth={square ? 6 : 5}
        strokeLinecap={square ? 'butt' : 'round'}
        strokeLinejoin={square ? 'miter' : 'round'}
      />
      <g transform={`translate(${endX} ${endY}) rotate(${rotation})`}>
        <path d="M1 0H9M5 -3L9 0L5 3" strokeWidth="1.5" opacity=".65" />
      </g>
    </svg>
  )
}
