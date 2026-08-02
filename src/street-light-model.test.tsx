import { describe, expect, test } from 'bun:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StreetLightNode } from './schema'
import { StreetLightModel } from './street-light-model'

describe('roadway street-light assembly', () => {
  test('builds a swept pole with a serviceable multi-cell LED head', () => {
    const node = StreetLightNode.parse({ lightOn: true })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(StreetLightModel, { node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="street-light-roadway-led"')
    expect(markup).toContain('name="street-light-swept-outreach"')
    expect(markup).toContain('name="street-light-integrated-spigot"')
    expect(markup).toContain('name="street-light-die-cast-housing"')
    expect(markup).toContain('name="street-light-service-panel"')
    expect(markup).toContain('name="street-light-optic-window"')
    expect((markup.match(/name="street-light-optic-cell"/g) ?? []).length).toBe(12)
    expect((markup.match(/name="street-light-heat-sink-fin"/g) ?? []).length).toBe(6)
    expect((markup.match(/name="street-light-sculpted-side-rail"/g) ?? []).length).toBe(2)
    expect((markup.match(/<spotLight/g) ?? []).length).toBe(2)
  })
})
