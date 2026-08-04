import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { nextRoadElevationMode, ROAD_ELEVATION_OPTIONS } from './store'

describe('road drafting cursor', () => {
  test('uses the shared wall-style ground marker and vertical guide', () => {
    const source = readFileSync(new URL('./road-network-tool.tsx', import.meta.url), 'utf8')

    expect(source).toContain('CursorSphere, EDITOR_LAYER')
    expect(source).toContain('const WALL_STYLE_CURSOR_HEIGHT = 2.5')
    expect(source).toContain('<CursorSphere color={color} height={WALL_STYLE_CURSOR_HEIGHT}')
    expect(source).not.toContain('<cylinderGeometry args={[0.16, 0.16, 0.08, 24]} />')
  })

  test('offers and cycles only ground and bridge drafting modes', () => {
    expect(ROAD_ELEVATION_OPTIONS.map((option) => option.value)).toEqual([
      'ground',
      'bridge',
    ])
    expect(nextRoadElevationMode('ground')).toBe('bridge')
    expect(nextRoadElevationMode('bridge')).toBe('ground')
  })
})
