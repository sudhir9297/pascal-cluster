import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { roadNetworkEditingControlsState } from './road-network-editing-controls'

describe('road editing control visibility', () => {
  test('keeps endpoint arrows on selection but requires explicit spline editing for shape handles', () => {
    expect(roadNetworkEditingControlsState({
      networkSelected: false,
      roadToolActive: false,
      splineEditing: false,
    })).toEqual({ lengthArrows: false, splineHandles: false })

    expect(roadNetworkEditingControlsState({
      networkSelected: true,
      roadToolActive: false,
      splineEditing: false,
    })).toEqual({ lengthArrows: true, splineHandles: false })

    expect(roadNetworkEditingControlsState({
      networkSelected: true,
      roadToolActive: false,
      splineEditing: true,
    })).toEqual({ lengthArrows: true, splineHandles: true })
  })

  test('uses a high-contrast green circular reshape handle', () => {
    const source = readFileSync(
      new URL('./road-network-spline-controls.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('<sphereGeometry')
    expect(source).not.toContain('<coneGeometry')
    expect(source).toContain("const HANDLE_COLOR = '#22c55e'")
    expect(source).toContain("const HANDLE_HOVER_COLOR = '#4ade80'")
  })
})
