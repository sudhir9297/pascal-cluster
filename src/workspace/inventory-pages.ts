import type { FloorplanGeometry } from '@pascal-app/core'
import type { SheetPdfPage } from '@pascal-app/editor'
import type { FixtureRow } from './inventory'

function wrap(value: string, limit: number): string[] {
  const lines: string[] = []
  let rest = value.replace(/\s+/g, ' ').trim() || 'None'
  while (rest.length > limit) {
    const space = rest.lastIndexOf(' ', limit)
    const end = space > limit / 2 ? space : limit
    lines.push(rest.slice(0, end))
    rest = rest.slice(end).trimStart()
  }
  return [...lines, rest]
}

export function fixtureInventoryPages(rows: readonly FixtureRow[]): SheetPdfPage[] {
  const pages: SheetPdfPage[] = []
  const text = (x: number, y: number, value: string, fontSize = 0.11): FloorplanGeometry =>
    ({ kind: 'text', x, y, text: value, fontSize, fill: '#202020', textAnchor: 'start' })
  let page: SheetPdfPage | undefined
  let y = 0
  for (const row of rows) {
    const columns = [wrap(`${row.label}${row.hidden ? ' [hidden]' : ''}`, 27), wrap(row.level, 18),
      wrap(row.dimensions, 26), wrap(row.finishes, 34)]
    const lineCount = Math.max(...columns.map(lines => lines.length))
    for (let first = 0; first < lineCount; first += 45) {
      const chunk = columns.map(lines => lines.slice(first, first + 45))
      const height = Math.max(...chunk.map(lines => lines.length)) * 0.18 + 0.14
      if (!page || y + height > 10.6) {
        const number = `BF-${pages.length + 1}`
        page = { number, title: 'Bathroom inventory', widthIn: 8.27, heightIn: 11.69,
          plate: [], windows: [], overlay: [text(0.5, 0.65, 'Bathroom inventory', 0.2),
            text(0.5, 1, `${rows.length} fixtures. Current search and filters applied.`),
            text(0.5, 1.45, 'Item'), text(2.5, 1.45, 'Floor'), text(3.8, 1.45, 'Size, mm'), text(5.6, 1.45, 'Finish'),
            text(0.5, 11.05, 'Sizes are fixture parameters. Fittings are listed separately.', 0.1),
            text(0.5, 11.35, number, 0.1)] }
        pages.push(page)
        y = 1.8
      }
      for (const [index, lines] of chunk.entries()) {
        for (const [line, value] of lines.entries()) page.overlay.push(text([0.5, 2.5, 3.8, 5.6][index]!, y + line * 0.18, value))
      }
      y += height
      page.overlay.push({ kind: 'line', x1: 0.5, y1: y - 0.09, x2: 7.77, y2: y - 0.09, stroke: '#dddddd', strokeWidth: 0.005 })
    }
  }
  return pages
}
