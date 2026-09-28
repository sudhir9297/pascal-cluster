import { expect, test } from 'bun:test'

test('pool design steps navigate without changing the active editor tool', async () => {
  // Isolate hook mocks so other tests retain the real React and editor stores.
  const panelPath = import.meta.resolve('./panel')
  const shellPath = import.meta.resolve('./shell-settings')
  const systemsPath = import.meta.resolve('./systems-panel')
  const reviewPath = import.meta.resolve('./review-panel')
  const selectionPath = import.meta.resolve('./pool-selection')
  const fittingPath = import.meta.resolve('../design/pool-fitting-layout')
  const sectionPath = import.meta.resolve('./pool-section-bar')
  const process = Bun.spawn([Bun.which('bun')!, '-e', `
    import { mock } from 'bun:test'
    import * as React from 'react'
    let step = 'shell'
    const tool = 'pool:pool'
    const useEditor = Object.assign(() => ({}), { getState: () => ({ tool, cycleRotationAxis() {} }) })
    mock.module('react', () => ({
      ...React,
      useEffect() {},
      useMemo: callback => callback(),
      useState: () => [step, next => { step = next }],
    }))
    mock.module('@pascal-app/core', () => ({ useScene: selector => selector({ nodes: {} }) }))
    mock.module('@pascal-app/viewer', () => ({ useViewer: selector => selector({ selection: { selectedIds: [], levelId: null } }) }))
    mock.module('@pascal-app/editor', () => ({ useEditor }))
    mock.module(${JSON.stringify(shellPath)}, () => ({ PoolShellSettings() {} }))
    mock.module(${JSON.stringify(systemsPath)}, () => ({ PoolSystemsPanel() {} }))
    mock.module(${JSON.stringify(reviewPath)}, () => ({ PoolReviewPanel() {} }))
    mock.module(${JSON.stringify(selectionPath)}, () => ({ getSelectedPool: () => null }))
    mock.module(${JSON.stringify(fittingPath)}, () => ({ planPoolFittings: () => null }))
    mock.module(${JSON.stringify(sectionPath)}, () => ({ PoolSectionBarPortal() {} }))
    const { default: Panel } = await import(${JSON.stringify(panelPath)})
    function findAll(element, predicate) {
      if (!element || typeof element !== 'object') return []
      return [...(predicate(element) ? [element] : []),
        ...[element.props?.children].flat(Infinity).flatMap(child => findAll(child, predicate))]
    }
    let tabs = findAll(Panel(), element => element.props?.role === 'tab')
    if (tabs.length !== 3 || tabs[0].props['aria-selected'] !== true) throw new Error('Shell step is not active')
    const continueButton = findAll(Panel(), element => element.type === 'button' && typeof element.props?.onClick === 'function' && JSON.stringify(element.props?.children ?? '').includes('Continue to ') && JSON.stringify(element.props?.children ?? '').includes('systems'))[0]
    if (!continueButton) throw new Error('Systems navigation is missing')
    continueButton.props.onClick()
    tabs = findAll(Panel(), element => element.props?.role === 'tab')
    if (step !== 'systems' || tabs[1].props['aria-selected'] !== true) throw new Error('Systems step did not open')
  `], { stdout: 'pipe', stderr: 'pipe' })
  const [exitCode, stderr] = await Promise.all([process.exited, new Response(process.stderr).text()])
  expect(stderr).toBe('')
  expect(exitCode).toBe(0)
})
