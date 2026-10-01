import { z } from 'zod'

export const TapDetails = z.object({
  mountingLayout: z.enum(['single-hole', 'three-hole']).optional(),
  holeSpacing: z.number().min(.1).max(.4).default(.2),
  handleStyle: z.enum(['auto', 'lever', 'pin', 'cross', 'wheel']).default('auto'),
  handleLength: z.number().min(.035).max(.12).optional(),
  handleThickness: z.number().min(.004).max(.018).optional(),
  handleSide: z.enum(['right', 'left']).default('right'),
  spoutDiameter: z.number().min(.012).max(.05).optional(),
  outletDrop: z.number().min(.12).max(.4).default(.27),
  baseStyle: z.enum(['auto', 'round', 'square', 'none']).default('auto'),
  baseWidth: z.number().min(.028).max(.14).optional(),
  baseHeight: z.number().min(.004).max(.025).default(.008),
  aeratorStyle: z.enum(['honeycomb', 'slotted', 'plain']).default('honeycomb'),
  aeratorEnabled: z.boolean().default(true),
  temperatureMarkers: z.boolean().default(true),
  decorativeRings: z.boolean().default(true),
  springTurns: z.number().int().min(12).max(44).default(34),
  springRadius: z.number().min(.012).max(.035).optional(),
  sprayHeadLength: z.number().min(.035).max(.09).default(.052),
  sprayButton: z.boolean().default(true),
  wallSpacing: z.number().min(.12).max(.22).default(.15),
})
