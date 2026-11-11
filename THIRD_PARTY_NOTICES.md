# Third-Party Notices

This project uses the following third-party software and assets. Each is used
under its own licence; the licence text for redistributed assets ships in the
repository alongside the assets themselves.

## 3D assets — Kenney asset packs (CC0)

The diorama scenes use seven low-poly asset packs by **Kenney** (www.kenney.nl):

| Pack | Path | Licence |
|---|---|---|
| Mini Forest | `public/assets/scene/kenney/forest/` | `public/assets/scene/kenney/FOREST-LICENSE.txt` |
| Mini Dungeon | `public/assets/scene/kenney/dungeon/` | `public/assets/scene/kenney/DUNGEON-LICENSE.txt` |
| Mini Characters | `public/assets/scene/characters/` | `public/assets/scene/characters/LICENSE.txt` |
| Mini Shop | `public/assets/scene/shop/` | `public/assets/scene/shop/LICENSE.txt` |
| City Kit (Commercial) | `public/assets/scene/city/` | `public/assets/scene/city/LICENSE.txt` |
| City Kit (Roads) | `public/assets/scene/roads/` | `public/assets/scene/roads/LICENSE.txt` |
| Mini Skate | `public/assets/scene/skate/` | `public/assets/scene/skate/LICENSE.txt` |

All seven are released under **Creative Commons Zero (CC0 1.0 Universal)** —
public domain, no attribution required. They are credited here voluntarily.

The curated manifest that maps model names onto these files lives in
`lib/scene-assets.ts`.

## Ground and fallback textures — PBRgen

The tileable color, roughness, and normal maps in
`public/assets/scene/grounds/` were generated in [PBRgen](https://app.pbrgen.com/)
on a Pro account that includes commercial use, then shipped as static files.
Grass, meadow, sand, snow, stone, and water use them on the ground disc.
Unmatched structure and landmark primitives use the oak set, and props use
the iron set. The app does not call PBRgen when a world is opened.

## Software dependencies

| Package | Licence | Used for |
|---|---|---|
| [three](https://github.com/mrdoob/three.js) | MIT | WebGL renderer, scene graph, WebXR |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) | MIT | React renderer for three.js |
| [@react-three/drei](https://github.com/pmndrs/react-three-drei) | MIT | Text/Billboard/OrbitControls helpers |
| [Next.js](https://github.com/vercel/next.js) | MIT | App framework |
| [React](https://github.com/facebook/react) | MIT | UI runtime |
| [zod](https://github.com/colinhacks/zod) | MIT | Schema validation for AI output |
| [ai](https://github.com/vercel/ai) + Vercel AI SDK providers | Apache-2.0 / MIT | LLM calls and structured output |
| [Prisma](https://github.com/prisma/prisma) | Apache-2.0 | ORM |
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT | Styling |
| [framer-motion](https://github.com/motiondivision/motion) | MIT | UI animation |
| [wagmi](https://github.com/wevm/wagmi) / [viem](https://github.com/wevm/viem) | MIT | Ethereum interaction |
| [RainbowKit](https://github.com/rainbow-me/rainbowkit) | MIT | Wallet connection UI |
| [Inco](https://github.com/inco) | MIT | Confidential computing (encrypted panels) |
| [fal.ai](https://fal.ai) | — | Hosted model inference (images, video, LLM) |

Run `pnpm licenses list` or inspect `pnpm-lock.yaml` for the complete,
authoritative dependency tree with per-package licence metadata.

## Design research

The prompt-to-3D approach was informed by published work that is credited in
`docs/DIORAMA_RESEARCH.md`, including **three.ws** (Apache-2.0), **SceneTeller**
(MIT), **SceneCraft** (MIT), **Holodeck** (Apache-2.0) and **OptiScene**
(MIT). No code was copied from these projects; the schema-constrained
planner/renderer split they use was implemented independently here.
