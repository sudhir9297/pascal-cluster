import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { TrussRoadwayLightNode } from './schema'
import { TrussRoadwayLightModel } from './truss-roadway-light-model'

describe('truss roadway-light assembly', () => {
  test('builds a fitted pipe truss with a dedicated multi-cell LED head', () => {
    const node = TrussRoadwayLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(TrussRoadwayLightModel, { node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="truss-roadway-light-assembly"')
    expect(markup).toContain('name="truss-roadway-rising-upper-arm"')
    expect(markup).toContain('name="truss-roadway-lower-diagonal-chord"')
    expect(markup).toContain('name="truss-roadway-vertical-web"')
    expect(markup).toContain('name="truss-roadway-convergence-fitting"')
    expect(markup).toContain('name="truss-roadway-integrated-spigot"')
    expect(markup).toContain('name="truss-roadway-led-housing"')
    expect(markup).toContain('name="truss-roadway-optic-window"')
    expect((markup.match(/name="truss-roadway-pole-fitting"/g) ?? []).length).toBe(2)
    expect((markup.match(/name="truss-roadway-fitting-bolt"/g) ?? []).length).toBe(4)
    expect((markup.match(/name="truss-roadway-optic-cell"/g) ?? []).length).toBe(8)
    expect((markup.match(/name="truss-roadway-heat-sink-fin"/g) ?? []).length).toBe(5)
    expect((markup.match(/<spotLight/g) ?? []).length).toBe(2)
  })
})
