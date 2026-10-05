# Primitives matrix

Every primitive under `packages/ui/src/primitives/`. Behavior files COMPOSE these -- never rewrite one. Check here before adding a primitive. Generated from the sources by `scripts/gen-primitives-matrix` (regenerate; do not hand-edit).

## Behavior-layer substrate

| primitive | category | kind | is | key api |
|---|---|---|---|---|
| `aria-manager` | a11y | dom | Applies a validated aria/role projection to an element; returns a restore cleanup. | `setAriaAttributes`, `updateAriaAttribute`, `removeAriaAttributes` |
| `dialog-aria` | a11y | pure | Pure aria-prop builders for dialog/overlay/trigger. | `getDialogAriaProps`, `getOverlayAriaProps`, `getTriggerAriaProps` |
| `sr-announcer` | a11y | dom | Live-region screen-reader announcements (executor behind the announce effect). | `createAnnouncer`, `announceToScreenReader`, `createPoliteAnnouncer` |
| `classy` | classes | pure | Tailwind-aware class-string builder with token resolution and arbitrary-value blocking. | `token`, `parseTailwindClass`, `hasArbitraryValue` |
| `classy-wc` | classes | pure | The classy companion that composes CSS property declarations for WC shadow DOM. | `composeDeclarations`, `styleRule`, `stylesheet` |
| `slot` | composition | dom | asChild prop merging: merges parent props onto a child element. | `mergeSlotProps`, `extractSlotProps`, `shouldUseSlot` |
| `dismissable-layer` | dismissal | dom | Unifies outside-click, escape, and focus-out with a layer stack. | `createDismissableLayer`, `createDismissableLayerStack`, `getDismissableLayerStack` |
| `escape-keydown` | dismissal | dom | Fires on Escape; returns cleanup. | `onEscapeKeyDown` |
| `outside-click` | dismissal | dom | Fires on click/pointerdown outside an element; returns cleanup. | `onOutsideClick`, `onPointerDownOutside` |
| `focus-trap` | focus | dom | Traps Tab focus in a region and restores on cleanup; preventBodyScroll companion. | `createFocusTrap`, `preventBodyScroll` |
| `roving-focus` | focus | dom | Roving-tabindex keyboard navigation for menus, radio groups, toolbars, tabs. | `createRovingFocus`, `focusItem`, `getCurrentIndex` |
| `intelligence-integration` | intelligence | pure | Pure design-reasoning functions: cognitive load, motion timing, a11y validation. | `calculateDialogCognitiveLoad`, `validateDialogAccessibility` |
| `keyboard-handler` | keyboard | dom | Type-safe keyboard event handling with modifier support. | `createKeyboardHandler`, `createActivationHandler`, `createDismissalHandler` |
| `typeahead` | keyboard | dom | Type-to-search navigation for lists and menus. | `fuzzyScore`, `createTypeahead`, `createControlledTypeahead` |
| `collision-detector` | overlay | dom | Floating-element positioning math with viewport collision detection. | `computePosition`, `applyPosition`, `autoPosition` |
| `float` | overlay | dom | Composable floating content: portal + collision detection + dismissal. | `Float` |
| `portal` | overlay | pure | Renders content outside the DOM hierarchy, SSR-safe. | `getPortalContainer`, `isPortalSupported` |
| `interactive` | pointer | dom | Headless pointer/touch/keyboard tracking surface over a container. | `createInteractive`, `updateInteractive` |
| `disclosure` | state | pure | Framework-agnostic single open/close boolean cell. | `createDisclosure` |
| `memory` | state | pure | Light reactive state cell over a nanostores atom: get/set/patch/subscribe/select. | `createMemory` |
| `selection-group` | state | pure | Active-item / expanded-set state behind tabs, accordion, navigation-menu, menubar. | `createSelectionGroup` |
| `fill-resolver` | tokens | pure | Resolves a fill signature to namespaced classes + Tailwind utilities. | `resolveFillName` |
| `resolve-tokens` | tokens | pure | DTCG token resolver: token names to CSS property values (WC shadow styling). | `MAX_REFERENCE_DEPTH`, `TokenResolver`, `createResolver` |
| `token-sheet` | tokens | pure | Build-time extractor reducing compiled CSS to the custom-property subset WC needs. | `extractTokenSheet`, `loadTokenSheet` |
| `types` | types | pure | Shared primitive types (CleanupFunction, Orientation, handlers). |  |
| `rafters-element` | wc | pure | Base class for Rafters Web Components: token-aware scoped shadow DOM. | `RaftersElement` |

## Color subsystem (Studio)

| primitive | category | kind | is | key api |
|---|---|---|---|---|
| `graph` | chart | dom | Base SVG/Canvas rendering engine for the chart system: scales, path builders, coordinate transforms, resize observer. | `createGraph`, `linearScale`, `bandScale`, `ticks`, `gridLines`, `linePath`, `smoothPath`, `arcPath`, `areaPath`, `slicePath`, `polarToCartesian`, `radialToCartesian`, `radarPath`, `observeResize` |
| `hue-warp` | math | pure | Perceptual hue-bar layout warp: normalized bar position to hue angle and back. | `hueFromBarPos`, `barPosFromHue` |
| `color-area` | picker | dom | 2D lightness-vs-chroma canvas at a fixed hue. | `createColorArea`, `updateColorArea` |
| `color-family` | picker | dom | Disclosure state machine for progressive color-family reveal. | `createColorFamily` |
| `color-input` | picker | dom | Numeric OKLCH channel input fields with clamping/formatting. | `createColorInput`, `updateColorInput` |
| `color-picker` | picker | dom | Composition of color-area/hue-bar/input/swatch into an OKLCH selector. | `getGamutTier`, `createColorPickerState` |
| `color-scale` | picker | dom | Renders an 11-position OKLCH scale as a navigable swatch strip. | `createColorScale` |
| `color-swatch` | picker | dom | Applies OKLCH styling and aria to a swatch element. | `toOklch`, `createSwatch`, `updateSwatch` |
| `color-weight` | picker | dom | Perceptual/atmospheric weight and balancing data for a color family. | `createColorWeight` |
| `contrast-matrix` | picker | dom | Renders a WCAG contrast pairing matrix as an accessible grid. | `createContrastMatrix` |
| `cvd-simulation` | picker | dom | Parallel scale strips simulating color-vision-deficiency views. | `createCvdSimulation` |
| `hue-bar` | picker | dom | 1D hue-spectrum gradient strip. | `createHueBar`, `updateHueBar` |

## Block documents (op model, history, input)

| primitive | category | kind | is | key api |
|---|---|---|---|---|
| `block-operations` | block | pure | Pure structural block mutations: split/merge/convert/insert/delete. | `blockContentToText`, `splitBlock`, `mergeWithPrevious` |
| `block-palette` | block | dom | Categorized grid of draggable block templates with typeahead. | `createBlockPalette` |
| `clipboard` | block | dom | Copy/cut/paste operations, SSR-safe. | `createClipboard` |
| `command-palette` | block | dom | Slash-triggered command palette with fuzzy search. | `fuzzyMatch`, `createCommandPalette` |
| `cursor-tracker` | block | dom | Reads/sets cursor position in a contentEditable. | `findBlockElement`, `getCursorPosition`, `isCursorAtBlockStart` |
| `drag-drop` | block | dom | Accessible drag-and-drop with mouse, keyboard, and touch support. | `createDraggable`, `createDropZone`, `resetDragDropState` |
| `input-events` | block | dom | beforeinput/input handling with IME composition tracking. | `createInputHandler` |
| `selection` | block | dom | Block and text selection controllers for editors. | `createBlockSelection`, `createTextSelection` |
| `block-ops` | block | pure | Applies one op to a block document; returns the new blocks and the ordered op sequence that undoes it. | `applyOp`, `applyOpSequence` |
| `block-op-types` | block | pure | Op vocabulary over BaseBlock[]: structural, format and text ops, and the OpResult shape. | `EditorOp`, `StructuralOp`, `FormatOp` |
| `block-op-text` | block | pure | insertText / removeText with marked runs, so marks survive undo. | `insertText`, `removeText` |
| `block-op-format` | block | pure | Apply or remove a mark over a range of a block. | `applyMark`, `removeMark` |
| `block-op-structural` | block | pure | Split, merge, delete, convert and insert blocks, each with its inverse. | `applySplit`, `applyMergePrev`, `applyMergeNext` |
| `block-op-content` | block | pure | Run and mark arithmetic on InlineContent: normalise, measure, compare, toggle marks. | `normalizeRuns`, `totalTextLength`, `runsEqual` |
| `op-history` | block | dom | Op-based undo/redo on one memory cell: coalescing window, cap, grouped inverses, selection carried per step. | `createEditorHistory` |
