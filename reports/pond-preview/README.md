# Landscape pond rendering preview

This page renders the plugin’s actual pond and ground geometry. It uses Three.js WebGPURenderer with its WebGL backend so it can also run in browsers without WebGPU.

From the repository root:

```sh
bun build reports/pond-preview/preview.ts --target browser --outdir /tmp/pascal-pond-preview --define 'process.env={"NODE_ENV":"production"}'
cp reports/pond-preview/index.html /tmp/pascal-pond-preview/index.html
python3 -m http.server 4179 --bind 127.0.0.1 --directory /tmp/pascal-pond-preview
```

Open http://127.0.0.1:4179/. The page starts with six koi and clear water, and supports outline, size, depth, bank, water colour and ripple controls. Enable Make waves, then click or drag on the water to exercise the reference wave solver. The full water-mood, optics, rain and feeding controls are in the actual editor's pond inspector. This preview verifies rendering, rather than host editor placement or persistence. Screenshots are saved beside this source.
