import { describe, expect, test } from 'bun:test'
import { landscapeHostPanel, landscapePlugin } from './index'

describe('Landscape plugin manifest', () => {
  test('exports the landscape identity with no inherited plant nodes', () => {
    expect(landscapePlugin.id).toBe('pascal:landscape')
    expect(landscapePlugin.apiVersion).toBe(1)
    expect(landscapePlugin.nodes).toEqual([])
  })

  test('associates the Landscape panel with the plugin', () => {
    expect(landscapeHostPanel.pluginId).toBe(landscapePlugin.id)
    expect(landscapeHostPanel.label).toBe('Landscape')
    expect(landscapeHostPanel.defaultInstalled).toBe(true)
    expect(landscapeHostPanel.pluginUrl).toBe('https://github.com/sudhir9297/landscape-pascal-plugin')
  })
})
