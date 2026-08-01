import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { CatalogLampModel } from './catalog-lamp-model'
import {
  CATALOG_LAMP_VARIANTS,
  getCatalogLampStyleOptions,
  parseCatalogLamp,
  resolveCatalogLampProjection,
} from './catalog-lamp-config'

describe('structural catalog lamp rendering', () => {
  test('normalizes stale visual styles back to the active structural variant', () => {
    expect(resolveCatalogLampProjection('environment:catenary-street-light', 'stale-style')).toBe('catenary')
    expect(resolveCatalogLampProjection('environment:wall-pack-light', 'stale-style')).toBe('wall-pack')
    expect(resolveCatalogLampProjection('environment:wall-pack-light', 'catenary')).toBe('catenary')
  })

  test('renders every structural projection safely in ghost and committed states', () => {
    const structuralVariants = CATALOG_LAMP_VARIANTS.filter((variant) => variant.family === 'structure')
    const previousConsoleError = console.error
    console.error = () => {}

    try {
      for (const variant of structuralVariants) {
        for (const option of getCatalogLampStyleOptions(variant.kind)) {
          const node = parseCatalogLamp(variant.kind, {
            armLength: variant.arm[2],
            height: 6,
            lightOn: true,
            visualStyle: option.value,
          })
          const ghostMarkup = renderToStaticMarkup(
            createElement(CatalogLampModel, { ghost: true, layer: 1, node }),
          )
          const committedMarkup = renderToStaticMarkup(
            createElement(CatalogLampModel, { ghost: false, layer: 1, node }),
          )

          expect(ghostMarkup).not.toContain('spotLight')
          expect(ghostMarkup).not.toContain('pointLight')
          expect(ghostMarkup).not.toContain('castShadow="true"')
          expect(ghostMarkup).toContain('name="catalog-lamp-pole"')
          expect(committedMarkup).toContain('name="catalog-lamp-pole"')
          expect(committedMarkup.length).toBeGreaterThan(0)
        }
      }
    } finally {
      console.error = previousConsoleError
    }
  })

  test('builds the catenary style as a two-pole sagging suspension', () => {
    const variant = CATALOG_LAMP_VARIANTS.find((candidate) => candidate.projection === 'catenary')!
    const node = parseCatalogLamp(variant.kind, {
      armLength: 6,
      height: 6,
      visualStyle: 'catenary',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-catenary-lamp"')
    expect(markup).toContain('name="catalog-catenary-span"')
    expect(markup).toContain('name="catalog-suspended-housing"')
    expect((markup.match(/name="catalog-suspended-end-cap"/g) ?? []).length).toBe(2)
    expect(markup).toContain('name="catalog-suspended-reflector"')
    expect(markup).toContain('name="catalog-suspended-diffuser"')
    expect(markup).toContain('name="catalog-suspended-trim"')
    expect(markup).toContain('name="catalog-catenary-cable-clamp"')
    expect(markup).toContain('torusGeometry')
    expect((markup.match(/name="catalog-lamp-pole"/g) ?? []).length).toBe(2)
    expect(markup).toContain('tubeGeometry')
  })

  test('builds the wall-arm style as an attached bracket and cobra head', () => {
    const node = parseCatalogLamp('environment:wall-arm-light', {
      armLength: 1.4,
      height: 6,
      lightOn: false,
      visualStyle: 'wall-arm',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-wall-arm-lamp"')
    expect(markup).toContain('name="catalog-wall-arm-mount-plate"')
    expect((markup.match(/name="catalog-wall-arm-mount-bolt"/g) ?? []).length).toBe(4)
    expect(markup).toContain('name="catalog-wall-arm-curved-bracket"')
    expect(markup).toContain('name="catalog-wall-arm-support-brace"')
    expect(markup).toContain('name="catalog-wall-arm-head"')
    expect(markup).toContain('#59636b')
    expect(markup).toContain('tubeGeometry')
    expect(markup).not.toContain('spotLight')
  })

  test('builds the wall-pack style as a compact grounded bulkhead', () => {
    const node = parseCatalogLamp('environment:wall-pack-light', {
      armLength: 0.35,
      height: 6,
      lightOn: false,
      visualStyle: 'wall-pack',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-wall-pack-lamp"')
    expect(markup).toContain('name="catalog-wall-pack-mount-plate"')
    expect(markup).toContain('name="catalog-wall-pack-housing"')
    expect(markup).toContain('name="catalog-wall-pack-top-lid"')
    expect(markup).toContain('name="catalog-wall-pack-diffuser"')
    expect(markup).toContain('name="catalog-wall-pack-neck"')
    expect((markup.match(/name="catalog-lamp-pole"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('spotLight')
  })

  test('builds the tunnel luminaire flush to a grounded soffit', () => {
    const node = parseCatalogLamp('environment:tunnel-luminaire', {
      armLength: 2.2,
      height: 6,
      visualStyle: 'tunnel',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-tunnel-luminaire"')
    expect(markup).toContain('name="catalog-tunnel-soffit"')
    expect(markup).toContain('name="catalog-tunnel-soffit-recess"')
    expect(markup).toContain('name="catalog-tunnel-housing"')
    expect(markup).toContain('name="catalog-tunnel-reflector"')
    expect(markup).toContain('name="catalog-tunnel-diffuser"')
    expect(markup).toContain('name="catalog-tunnel-trim"')
    expect(markup).not.toContain('spotLight')
  })

  test('builds the canopy style as a grounded recessed broad-beam fixture', () => {
    const node = parseCatalogLamp('environment:canopy-soffit-light', {
      armLength: 1,
      height: 6,
      lightOn: false,
      visualStyle: 'canopy',
    })
    const previousConsoleError = console.error
    console.error = () => {}
    let markup = ''
    try {
      markup = renderToStaticMarkup(createElement(CatalogLampModel, { layer: 1, node }))
    } finally {
      console.error = previousConsoleError
    }

    expect(markup).toContain('name="catalog-canopy-soffit-light"')
    expect(markup).toContain('name="catalog-canopy-support-plate"')
    expect(markup).toContain('name="catalog-canopy-housing"')
    expect(markup).toContain('name="catalog-canopy-recess"')
    expect(markup).toContain('name="catalog-canopy-diffuser"')
    expect(markup).toContain('name="catalog-canopy-trim"')
    expect(markup).toContain('name="catalog-canopy-mount"')
    expect((markup.match(/name="catalog-lamp-pole"/g) ?? []).length).toBe(1)
    expect(markup).not.toContain('spotLight')
  })
})
