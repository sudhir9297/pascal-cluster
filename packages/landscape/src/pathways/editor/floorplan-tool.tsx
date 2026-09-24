'use client'
import PathwayTool from './tool'

// The host emits the same grid draft events from plan and 3D canvases.
export default function PathwayFloorplanTool() {
  return <PathwayTool render3D={false} />
}
