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
    expect(source).toContain('const HANDLE_COLOR = "#22c55e"')
    expect(source).toContain('const HANDLE_HOVER_COLOR = "#4ade80"')
  })

  test('reveals a blue vertical elevation grip for the selected spline point', () => {
    const source = readFileSync(
      new URL('./road-network-spline-controls.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('const ELEVATION_HANDLE_COLOR = "#38bdf8"')
    expect(source).toContain('beginDrag(event, "elevation")')
    expect(source).toContain('<cylinderGeometry')
    expect(source).toContain('road-elevation-hit:')
  })

  test('provides visible X/Z axis grips and arrow-key constraint modes', () => {
    const source = readFileSync(
      new URL('./road-network-spline-controls.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('const X_AXIS_COLOR = "#ef4444"')
    expect(source).toContain('const Z_AXIS_COLOR = "#10b981"')
    expect(source).toContain('event.key === "ArrowUp"')
    expect(source).toContain('event.key === "ArrowRight"')
    expect(source).toContain('event.key === "ArrowLeft"')
    expect(source).toContain('road-x-axis-hit:')
    expect(source).toContain('road-z-axis-hit:')
  })

  test('provides insertion handles, modifier multi-selection, and deletion', () => {
    const source = readFileSync(
      new URL('./road-network-spline-controls.tsx', import.meta.url),
      'utf8',
    )
    expect(source).toContain('road-insert-point-hit:')
    expect(source).toContain('nativeEvent.ctrlKey || nativeEvent.metaKey')
    expect(source).toContain('event.key !== "Delete"')
    expect(source).toContain('moveRoadSplinePoints')
  })

  test('routes graph-node moves and edge deletion through localized topology updates', () => {
    const affordanceSource = readFileSync(
      new URL('./road-network-affordances.ts', import.meta.url),
      'utf8',
    )
    const rendererSource = readFileSync(
      new URL('./road-network-renderer.tsx', import.meta.url),
      'utf8',
    )
    const extensionSource = readFileSync(
      new URL('./road-network-extension-handles.ts', import.meta.url),
      'utf8',
    )
    expect(affordanceSource).toContain('moveRoadGraphNode(node, graphNodeId')
    expect(rendererSource).toContain('deleteRoadEdge(node, elementSelection.id)')
    expect(rendererSource).toContain("window.addEventListener('keydown', onDeleteEdge, true)")
    expect(rendererSource).toContain('event.stopImmediatePropagation()')
    expect(extensionSource).toContain('moveRoadGraphNode(node, graphNodeId')
  })
})
