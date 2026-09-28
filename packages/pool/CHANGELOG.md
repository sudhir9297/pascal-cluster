# Changelog

This file records user-visible changes to `@pascal-app/plugin-pool`. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions
follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- New freehand pools keep fewer editable outline points by removing anchors
  that do not materially change the drawn curve or pool area.
- Selecting a pool in the pool editor now shows a collapsible longitudinal
  section above the existing bottom toolbar, reflecting its floor profile. The
  section fits beside the open inspector instead of extending underneath it.
  Its plan outline, floor slope, entry, bench, waterline, and finishes follow
  the selected pool's design settings.
- Condensed the pool Shell sidebar with a selected-shape card, an on-demand
  shape picker, direct depth-profile choices, and combined entry and bench
  controls.
- Choosing a pool shape now prepares the next pool drawing instead of changing
  the selected pool. Shell and Systems sections start collapsed.
- Align the 2D pool outline and editing handles with the pool's 3D position and
  rotation. Use a thin, constant-width selection outline that preserves the
  water and coping appearance.
- Placing a pool pump, heater, or filter over a DWV waste pipe now splits the
  run and connects its inlet and outlet with routed pipes and elbows in one
  undoable edit. The filter backwash port remains separate. Short, blocked,
  vertical, and wall-attached target runs reject equipment insertion.
- Reworked setup, API, node, architecture, contribution, testing, release, and
  research documentation to match the implemented package.
- Added automated checks for local documentation links and documented option
  names.

## [0.1.0] - 2026-09-08

### Added

- Procedural pools, stairs, circulation equipment, spillovers, and waterfalls
- Animated water presets and pool interaction effects
- Compiled ESM, TypeScript declarations, runtime assets, and package verification
- Architecture, type, test, coverage, security, and release checks
