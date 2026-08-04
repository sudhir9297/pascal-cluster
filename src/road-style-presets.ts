export const DEFAULT_ROAD_STYLE_ID = 'local-street'

/** Real-world-ish starting sections; all dimensions are metres. */
export const DEFAULT_ROAD_STYLE_PRESETS = {
  alley: {
    id: 'alley', name: 'Alley', laneCount: 1, laneWidth: 3.2, shoulderWidth: 0,
    sidewalkWidth: 0, medianWidth: 0, surfaceThickness: 0.1,
    surfaceColor: '#484a4d', markingColor: '#f3f1df', markings: false,
  },
  'local-street': {
    id: 'local-street', name: 'Local street', laneCount: 2, laneWidth: 3.25,
    shoulderWidth: 0.5, sidewalkWidth: 0.5, medianWidth: 0, surfaceThickness: 0.14,
    surfaceColor: '#3f4246', markingColor: '#f3f1df', markings: true,
  },
  collector: {
    id: 'collector', name: 'Collector', laneCount: 2, laneWidth: 3.5,
    shoulderWidth: 1, sidewalkWidth: 0.6, medianWidth: 0, surfaceThickness: 0.18,
    surfaceColor: '#393c40', markingColor: '#f3f1df', markings: true,
  },
  arterial: {
    id: 'arterial', name: 'Divided arterial', laneCount: 4, laneWidth: 3.5,
    shoulderWidth: 0.75, sidewalkWidth: 0.67, medianWidth: 2.4, surfaceThickness: 0.22,
    surfaceColor: '#35383c', markingColor: '#f3f1df', markings: true,
  },
  highway: {
    id: 'highway', name: 'Highway', laneCount: 4, laneWidth: 3.65,
    shoulderWidth: 2.5, sidewalkWidth: 0, medianWidth: 3, surfaceThickness: 0.28,
    surfaceColor: '#303338', markingColor: '#f3f1df', markings: true,
  },
} as const

export const ROAD_STYLE_PRESET_IDS = Object.keys(DEFAULT_ROAD_STYLE_PRESETS) as Array<
  keyof typeof DEFAULT_ROAD_STYLE_PRESETS
>
