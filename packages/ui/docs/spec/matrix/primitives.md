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
| `hover-delay` | hover | dom | Configurable show/hide hover-intent delays for tooltips and hover cards. | `createHoverDelay`, `createControlledHoverDelay`, `resetHoverDelayState` |
| `intelligence-integration` | intelligence | pure | Pure design-reasoning functions: cognitive load, motion timing, a11y validation. | `calculateDialogCognitiveLoad`, `validateDialogAccessibility`, `getAnimationTiming` |
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
| `graph` | chart | dom | Base SVG/Canvas rendering engine for the chart system. | `createGraph`, `linearScale`, `polarToCartesian` |
| `oklch-gamut` | math | pure | Pure OKLCH gamut classification math, zero dependencies. | `inSrgb`, `inP3`, `findMaxChroma` |
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

## Editor subsystem (OSS-scale, out of behavior-layer scope)

| primitive | category | kind | is | key api |
|---|---|---|---|---|
| `block-canvas` | block | dom | Selection/focus/keyboard state machine for a block editing surface. | `createBlockCanvas` |
| `block-context-menu` | block | dom | Right-click context menu for block operations. | `createBlockContextMenu` |
| `block-handler` | block | pure | Composes block-canvas/wrapper/history/clipboard into one block editing machine. | `createBlockHandler` |
| `block-operations` | block | pure | Pure structural block mutations: split/merge/convert/insert/delete. | `blockContentToText`, `splitBlock`, `mergeWithPrevious` |
| `block-palette` | block | dom | Categorized grid of draggable block templates with typeahead. | `createBlockPalette` |
| `block-wrapper` | block | pure | Per-block hover chrome, drag handle, and action-menu state. | `createBlockWrapper` |
| `canvas-drop-zone` | block | dom | Position-aware drop targeting computing insertion indices. | `createCanvasDropZone` |
| `clipboard` | block | dom | Copy/cut/paste operations, SSR-safe. | `createClipboard` |
| `command-palette` | block | dom | Slash-triggered command palette with fuzzy search. | `fuzzyMatch`, `createCommandPalette` |
| `cursor-tracker` | block | dom | Reads/sets cursor position in a contentEditable. | `findBlockElement`, `getCursorPosition`, `isCursorAtBlockStart` |
| `document-editor` | block | dom | Composes leaf primitives into a contentEditable document surface. | `createDocumentEditor` |
| `drag-drop` | block | dom | Accessible drag-and-drop with mouse, keyboard, and touch support. | `createDraggable`, `createDropZone`, `resetDragDropState` |
| `editor-toolbar` | block | pure | Toolbar button config and platform-aware shortcut labels. | `createEditorToolbar` |
| `history` | block | pure | Undo/redo state history with limits and batching. | `createHistory` |
| `inline-formatter` | block | dom | Inline formatting (bold/italic/code/link) for contenteditable. | `BOLD`, `ITALIC`, `CODE` |
| `inline-toolbar` | block | pure | Viewport-aware positioning for a floating format toolbar. | `getFormatButtons`, `getModifierKey`, `adjustToolbarPosition` |
| `input-events` | block | dom | beforeinput/input handling with IME composition tracking. | `createInputHandler` |
| `selection` | block | dom | Block and text selection controllers for editors. | `createBlockSelection`, `createTextSelection` |
| `rule-dialog` | rule | dom | Anchored popover collecting rule config before applying to a block. | `createRuleDialog` |
| `rule-drop-zone` | rule | dom | Block-targeting drop zone for rule application. | `createRuleDropZone` |
| `rule-palette` | rule | dom | Categorized list of draggable I/O-contract rules. | `createRulePalette` |
| `serializer` | serial | pure | EditorBlock-tree to/from external formats (universal IR). | `contentToPlainText`, `contentHasMarks`, `createJsonSerializer` |
| `serializer-html` | serial | pure | HTML string to/from editor block trees (clipboard interop). | `createHtmlSerializer`, `htmlSerializer` |
| `serializer-mdx` | serial | pure | MDX string to/from block trees via micromark/mdast. | `createMdxSerializer`, `mdxSerializer` |
| `serializer-text` | serial | pure | Plain text to/from block trees (a11y/clipboard fallback). | `createTextSerializer`, `textSerializer` |

