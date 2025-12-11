# WritArcade Roadmap & Status

**Last Updated:** December 12, 2025
**Status:** Phase 7 - Customization MVP for Surreal World Assets Buildathon

---

## 🎯 Current Focus: Customization MVP

### Vision Statement
> "Turn any article into a personalized visual comic story you own as IP."

### The User Story
> "I read Fred's article about AI, turned it into a horror comic about my startup, tweaked the villain to look like my ex-VC, and minted it as IP on Story Protocol."

### Hackathon Alignment
**Track**: Creative Front-End ($5,000 prize)
> "Create intuitive, aesthetic, and user-friendly front-ends for popular IP x AI use cases—seamlessly integrated with the Story SDK and IP registration flows."

WritArcade delivers:
- Web/mobile app optimized for easy IP Registration ✅
- AI-powered content generation with Story Protocol integration ✅
- User personalization at every step of the creative flow ⬅️ **BUILDING NOW**

---

## MVP Feature Set (Phase 7)

### ✅ Complete (Existing)
1. **Article-to-Comic Generation**: Paste URL → AI generates comic panels
2. **Comic Panel Rendering**: Beautiful, styled comic book interface
3. **Story Protocol Integration**: Register comics as IP assets
4. **NFT Minting**: Mint completed comics on Base chain
5. **Writer Attribution**: Source author earns royalties

### ✅ Complete (This Phase - MVP Enhancements)
1. **Asset Preview & Edit**: Workshop page with inline title AND description editing for characters, mechanics, story beats
2. **Image Regeneration**: "New Image" button on each panel with loading state
3. **Prompt Visibility**: View/edit the prompt used for image generation, regenerate with custom prompts
4. **Copy Editing**: Narrative text editable in finale before minting (hover to reveal pencil icon)
5. **Navigation Cleanup**: Assets hidden from nav to focus on core flow
6. **Flow Discovery**: Link to Workshop from generate page tips
7. **Toast Notifications**: Success/error feedback for all editing and regeneration actions
8. **Real-time Downloads**: Edited text correctly exported in PNG comic download

### 🔒 Deferred (Future Phases)
- Asset Marketplace discovery *(hidden from nav, exists at /assets)*
- Asset derivation from completed comics
- ElevenLabs audio/video integration
- Multiplayer story contributions
- Advanced game mechanics (stats, branching)

---

## Implementation Plan

### Sprint 1: Creative Intervention Points (3-4 days)

#### 1.1 Asset Preview Step
**Location**: Enhance `/app/mini-app/page.tsx` or create new step in generation flow
**Goal**: After article URL submitted, show extracted assets before generating comic
**Changes**:
- Add "preview" state between URL input and game generation
- Reuse `GameAIService.generateAssets()` to extract characters, mechanics, story beats
- Display editable cards for each asset
- "Generate Comic" button compiles edited assets into final game

#### 1.2 Inline Asset Editing
**Location**: New component or enhance existing flow
**Goal**: Users can edit character names, personalities, story beats before generation
**Changes**:
- ContentEditable or input fields for each asset property
- Real-time preview updates ✅
- Preserve edits through generation ✅

### Sprint 2: Image Regeneration ✅ COMPLETE

#### 2.1 Regenerate Button per Panel ✅
**Location**: `domains/games/components/comic-panel-card.tsx`
**Implemented**:
- "New Image" button in image overlay
- Spinning animation during regeneration
- Toast notifications for success/failure

#### 2.2 Prompt Visibility ✅
**Location**: `comic-panel-card.tsx`
**Implemented**:
- Collapsible "View/Edit Prompt" section
- Toggle between Original and Custom prompt modes
- Regenerate with custom prompt support

### Sprint 3: Copy Editing in Finale ✅ COMPLETE

#### 3.1 Editable Narrative ✅
**Location**: `domains/games/components/comic-book-finale.tsx`
**Implemented**:
- Hover-to-reveal pencil icon on narrative text
- Inline textarea editing with Save/Cancel
- Toast notification on save
- Changes persist to download/mint

#### 3.2 Polish & Flow
**Location**: Various
**Goal**: Smooth single-session experience
**Changes**:
- Progress indicator showing current step
- Clear "Next" actions at each stage
- Updated IPFS metadata includes all user customizations

### Sprint 4: Navigation Cleanup (0.5 days)

#### 4.1 Hide Assets from Nav
**Location**: Navigation components
**Goal**: Focus user attention on core flow
**Changes**:
- Remove /assets from main navigation
- Keep route accessible for direct URL access
- Add "Asset Library (Coming Soon)" teaser if desired

---

## Technical Architecture

### Current Flow
```
Article URL → AI Generate Game → Play (5 panels) → Finale → Mint
```

### New Flow (MVP)
```
Article URL 
    → AI Extract Assets (preview) 
    → [EDIT: Assets] 
    → AI Compile Comic 
    → Play (5 panels with regeneration) 
    → [EDIT: Narrative text]
    → Finale 
    → Register IP on Story Protocol
    → Mint NFT on Base
```

### Key Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `GameAIService.generateAssets()` | Extract assets from article | ✅ Live |
| `GameAIService.generateGame()` | Compile assets into game | ✅ Live |
| `ImageGenerationService` | Generate panel images | ✅ Live |
| `StoryProtocolAssetService` | Register IP | ✅ Live |
| `ComicPanelCard` | Render panels + regenerate | ✅ Enhanced |
| `ComicBookFinale` | Final comic + text editing | ✅ Enhanced |
| `AssetCard` | Asset display + inline edit | ✅ Enhanced |
| `GamePlayInterface` | Wire regeneration + editing | ✅ Enhanced |
| Asset Preview UI (Workshop) | Show/edit assets before compilation | ✅ Live |

---

## Success Criteria

### Hackathon Demo
- [x] User pastes article URL
- [x] Assets extracted and shown for editing (Workshop: /workshop)
- [x] User modifies a character name (inline editing)
- [x] Comic generated with customization
- [x] User regenerates one panel image ("New Image" button)
- [x] User edits narrative text (pencil icon in finale)
- [x] User mints as IP on Story Protocol
- [x] Transaction confirmed, IP registered

### Metrics
- Complete flow in < 5 minutes
- Zero crashes during demo
- Story Protocol IP ID visible in UI
- All customizations preserved in minted metadata

---

## Collaboration Model (Unchanged)

**On-chain revenue distribution (configurable per writer coin):**
- **Generation**: 60% Writer, 20% Platform, 20% Creator Pool
- **Minting**: 30% Creator, 15% Writer, 5% Platform

This ensures:
- Writers earn from readers using their content creatively
- Creators are rewarded for personalization work
- Platform sustainability for ongoing development

---

## Future Roadmap (Post-Hackathon)

### Phase 8: Asset Marketplace (Q1 2026)
- Enable asset discovery at /assets
- Derive assets from completed comics
- Royalty chains via Story Protocol

### Phase 9: Media Expansion (Q2 2026)
- ElevenLabs audio narration
- Video export of comics
- Social sharing integrations

### Phase 10: Advanced Gameplay (Q3 2026)
- Branching narratives with consequences
- Character stats that affect outcomes
- Multiplayer story contributions

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI generation failures | Retry logic, multiple model fallbacks |
| Story Protocol testnet issues | Mock mode for demos, graceful degradation |
| Image generation slow | Parallel generation, optimistic UI |
| User confusion | Clear progress indicators, tooltips |

---

## Resources

### Story Protocol
- Docs: https://docs.story.foundation/
- SDK: Integrated via `@story-protocol/core-sdk`
- Network: Aeneid testnet (Chain ID: 1516)

### Tech Stack
- Frontend: Next.js 16 + TypeScript + TailwindCSS
- AI: OpenAI/Anthropic via ai-sdk, Venice AI for images
- Blockchain: Base (payments/NFT), Story Protocol (IP)
- Storage: IPFS via Pinata

---

*Last Updated: December 12, 2025 - Phase 7 MVP Focus*