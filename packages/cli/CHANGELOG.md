# rafters

## Unreleased

### Breaking Changes

- breaking(init, cli): `rafters init` is install-only. The entire onboard pipeline (umbrella wire-up #1513, per-palette assignment #1509, spacing/radius inference #1510, font detection #1511, font injection #1512, generic-css `var()`-as-`ColorReference` preservation #1404, ramp-detected-palette promotion #1402) is removed from init -- those flows reach for source CSS, which is import territory, not install. `rafters init` now produces pure-defaults output: detect framework, run `generateBaseSystem({})`, save tokens, generate outputs, `@import` the result into the user's main CSS, write `config.rafters.json`. The Claude skill writer (`.claude/skills/rafters-frontend/SKILL.md`) is removed -- agent guidance will be delivered via plugin instead. No prompts beyond framework + exports. No detection of palettes, spacing, radius, or fonts. The `--accept-detected` flag is removed; the `import?: OnboardDecisions` field on `RaftersConfig` is removed.
- breaking(cli): the standalone `rafters import` command is removed along with the entire `src/onboard/` tree (orchestrator, three importers, ramp-detector, apply, writer, css-parser, wire-up, palette-prompt, scale-inference, font-detector, font-injector) and all their tests. ~7300 lines deleted. Importing existing project CSS will return as an init subcommand or as detection inside `rafters init` itself -- both forms TBD.
- breaking(cli, utils): `detect.ts` no longer exports `InjectionFramework`, `InjectionStyle`, `InjectionSpec`, `INJECTION_SPECS`, `COMMON_CSS_LOCATIONS`, or `TOKEN_FILE_CONVENTIONS`. `FRAMEWORK_SPECS` and the `Framework` type remain; init reads `cssLocations` for `@import`-injection target and `components` for `add` install paths.
- breaking(cli, utils): `detect.ts` collapses to a single `detectProject(cwd)` entry. `detectFramework`, `detectTailwindVersion`, `detectShadcn`, and `hasAstroReact` are gone -- each previously re-opened `package.json` independently. `detectProject` now reads `package.json` once and returns `{ framework, tailwindVersion, shadcn, astroHasReact, cssPath }`, all `readonly`. `findMainCssFile` is removed from `init.ts`; `findCssPath(cwd, framework)` is exported from `detect.ts` for both the auto-detected and override paths. The previously private per-file readers (`readPackageDeps`, `readShadcnConfig`) collapse into one Zod-validated `readJsonIfExists(path, schema)` helper. Adds `wc` framework detection: `lit` or `@lit/*` in deps without React. **Fail-fast: a malformed `package.json` or `components.json` now throws.** Previously each reader silently swallowed `SyntaxError`/IO failures and returned an empty record, letting init proceed against bogus data with a success-shaped `init:detected` event. ENOENT is still soft for both files (a project without `package.json` yet, or no shadcn, are legitimate states). Adds `react-router-shadcn-v4`, `wc-no-shadcn`, `vanilla-no-shadcn` fixtures to cover the full `FRAMEWORK_SPECS` matrix.

### Minor Changes

- feat(init): prompt-and-apply for shadcn semantic colors. After the sensing log, `rafters init` walks each `--name: <oklch|hex|hsl|named>` declaration that classified into the `semantic` namespace and asks the designer `Import --<name>: <value>?` (default yes). In agent mode the answer is unconditionally yes. For each accepted color, two registry ops fire: `registry.define` creates a new family `imported-<name>` from the OKLCH seed via `generateOKLCHScale` + the existing `bakeAccessibility` helper (now exported from `set.ts`); `registry.set` reseats the semantic to a `ColorReference` at `family@500` with `reason: "imported from --<name> in <cssPath>"`. The two-op shape avoids the blast-radius problem of remapping an existing family (`neutral` etc.) where every dependent semantic would re-color. After the apply loop, registry is re-saved and outputs are regenerated so the on-disk state reflects the imports. New `init:import_applied` JSON event carries `{ count, cssPath }`; human-mode prints `Imported N colors from <path>`. Non-shadcn-semantic colors (palette primitives like `--brand-empire`) are surfaced in the sensing summary but not yet prompted -- that flow comes later.
- feat(init): passive sensing of source CSS at the end of init. If the user's main stylesheet exists, `rafters init` reads it, walks `:root { ... }` declarations via `extractShadcnRoot`, classifies each into a rafters namespace via `classifyDeclarations`, and emits a new `init:import_sensed` JSON event carrying `{ cssPath, totalDeclarations, byNamespace, namespacesPresent, unclassifiedCount }`. Human-mode output prints the source path, count of declarations, count of recognised rafters namespaces with per-namespace breakdown, and a count of entries unrelated to rafters (Tailwind internals, third-party widget vars, etc.). The registry stays at Phase A defaults -- the sensing is passive; the assignment loop (prompt + `registry.set`) lands separately. ENOENT on the CSS file is a silent skip; permission / IO errors propagate so the user sees them. Empty `:root` and a missing `cssPath` skip silently.
- feat(init): umbrella onboard wire-up composing the four leaf modules into `rafters init` (#1513). Detection runs BEFORE `generateBaseSystem`: orchestrator detects palettes, the per-palette prompt walks semantic-family assignment (#1509), spacing + radius are inferred via math-utils (#1510), and fonts are detected from CSS (#1511). Captured decisions drive `BaseSystemConfig` overrides (spacing base + ratio, radius base, sans/mono font families) so the generator emits the user's system rather than pure defaults. Assigned palettes anchor semantic families via `ColorReference` overlays applied to the registry post-generation; surface tokens (`background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`) re-derive automatically through `DEFAULT_SEMANTIC_COLOR_MAPPINGS`. After outputs are written, framework-aware HTML font `<link>` injection (#1512) runs against the project's layout file; when the framework is `unknown` or no canonical layout exists, init prints a raw-HTML copy-paste snippet as the final stdout line. The pre-#1513 fallback (`maybeOnboardExisting` running AFTER generators) is removed. New `--accept-detected` agent flag walks all four decision phases non-interactively, assigning palettes to slots in canonical order and accepting inferred spacing/radius/fonts. Agent mode without the flag emits a `needsDecision` JSON payload listing detected palettes and exits without writing. `RaftersConfig` gains an optional `import` block carrying the verbatim decisions; `rafters init --reset` re-applies the persisted decisions deterministically without re-prompting. New `packages/cli/src/onboard/wire-up.ts` module exports `runOnboardWireUp`, `decisionsToConfigOverrides`, `buildSemanticOverlays`, and `paletteTokensFromResult` so the wire-up composition is testable in isolation.
- feat(onboard): per-palette semantic-family assignment walk (#1509). After ramp detection identifies palettes, `rafters init` will walk the user through one prompt per palette asking which of the eleven canonical `SemanticColorSystem` families (`primary`, `secondary`, `tertiary`, `accent`, `highlight`, `neutral`, `muted`, `success`, `warning`, `destructive`, `info`) the palette anchors. Each slot drops from the offered list once used (each family used at most once). Skip is a real choice -- the palette is imported as flat colour tokens without semantic assignment. Surface tokens that re-derive from the eleven families (`background`, `foreground`, `card`, `popover`, `border`, `input`, `ring`, etc.) are NOT offered; they follow the family they reference. Agent mode with `--accept-detected` (defined in the umbrella issue) assigns palettes to slots in canonical order. Agent mode without the flag emits a structured `needsDecision` JSON via `buildPaletteNeedsDecision`. The walk lives in a new `packages/cli/src/onboard/palette-prompt.ts` module; the umbrella init wire-up (#1513) composes it with the other onboard pieces.
- feat(onboard): infer spacing and radius systems from source CSS via math-utils (#1510). Rafters spacing and radius are generated, not stored -- `baseSpacingUnit` (px) times a named progression (linear / musical ratio / mathematical constant from `math-utils` `DEFAULT_RATIOS`). When `rafters init` finds existing `--spacing-*` / `--space-*` / `--gap-*` / `--margin-*` / `--padding-*` / `--inset-*` (or `--radius-*` / `--rounded-*` / `--border-radius-*`) declarations, the new `inferSpacingSystem` / `inferRadiusSystem` helpers in `packages/cli/src/onboard/scale-inference.ts` recover the underlying base + progression by fitting actual values against every named ratio + linear, picking the lowest-mean-relative-error candidate. Output carries `confidence ∈ [0, 1]`; `LOW_CONFIDENCE_THRESHOLD` (0.7) and `UNUSABLE_CONFIDENCE_THRESHOLD` (0.4) let the umbrella init wire-up decide between accept, warn, and fall-back-to-defaults. The umbrella issue (#1513) composes these inferrers into the init prompt flow.
- feat(onboard): framework-aware HTML font `<link>` injection (#1512). New `packages/cli/src/onboard/font-injector.ts` injects Google Fonts `<link>` tags into the project's layout file for each detected family (#1511). Eight framework targets supported -- `astro`, `next-app`, `next-pages`, `react-router`, `remix`, `vite`, `wc`, `vanilla` -- each with canonical layout paths and per-framework injection style (raw HTML vs JSX with `crossOrigin` attribute and self-closing tags). Idempotent: families whose `importUrl` is already in the file are skipped, and the `preconnect` pair is not duplicated. Framework-specific positioning: Remix lands AFTER the last `<Meta />` / `<Links />` to preserve loader-driven asset ordering; Astro lands BEFORE `<slot name="head" />` so consumers can still override. Self-hosted (`@font-face`) and system fonts skip the HTML layer entirely. On `framework: 'unknown'` or `no-layout-file`, returns `InjectionResult.injected: false` plus a raw-HTML copy-paste snippet; the umbrella init wire-up (#1513) prints that snippet as the final stdout line.
- feat(onboard): font detection in source CSS (#1511). New `packages/cli/src/onboard/font-detector.ts` walks the project's main CSS for `@import url('https://fonts.googleapis.com/...')` and `@font-face { ... }` declarations, returning a deduplicated `DetectedFont[]`. Each record carries `{ family, source: 'google' | 'self-hosted' | 'system', importUrl?, fontFaceBlock?, weights?, styles? }`. Google Fonts URLs are parsed for both `css` and `css2` endpoints, including multi-family URLs and the `ital,wght@...` axis (italic + weight pairs surface as `styles: ['normal', 'italic']` plus `weights`). Self-hosted `@font-face` blocks are preserved verbatim and win over Google imports on collision. Families referenced via `--font-*` custom properties but never imported (e.g. `'Helvetica Neue', Arial, sans-serif`) get recorded with `source: 'system'`; generic keywords like `system-ui` / `sans-serif` are ignored. New `isMonoFamily` heuristic helper for callers picking which detected font fills `BaseSystemConfig.monoFontFamily` vs `fontFamily`. The umbrella init wire-up (#1513) preserves these declarations through the rafters output CSS; the framework-aware HTML `<link>` injection (#1512) consumes the same shape.
- feat(onboard): generic CSS importer preserves `var()` semantic mappings as `ColorReference` instead of flattening to OKLCH strings (#1404). When source CSS encodes `--primary: var(--empire-500)` and the `empire` ramp is detected as a palette (#1402), the proposed token for `--primary` lands with `value: { family: 'empire', position: '500' }` -- the canonical `ColorReference` shape from `@rafters/shared`. Studio resolves the reference at display time; the CLI does not flatten. `var()` refs whose target is not part of a detected palette are dropped with a warning rather than silently flat-lifted -- assign in Studio after import. The writer renders `ColorReference`-valued tokens back to source-equivalent `var(--<family>-<position>)` text for `original.value`, so the user still sees what their CSS expressed in the pending review.
- feat(onboard): importers now detect complete color ramps (`--name-50` ... `--name-950`) as palettes instead of flat-lifting each step into an unrelated token (#1402). A ramp is recognised when at least seven Tailwind scale positions of a single family are present; partial ramps stay flat. Detection runs across the Tailwind v4, shadcn, and generic CSS importers via a shared `ramp-detector` utility. `.rafters/import-pending.json` gains an optional `palettes[]` block alongside `tokens[]`; tokens promoted into a palette do not also appear in `tokens[]`. Downstream registry materialization is a separate follow-up.
- feat(import): `rafters import --apply` merges accepted (and modified) tokens from `.rafters/import-pending.json` into the registry, regenerates outputs, and archives the pending file to `.rafters/import-pending.applied-<ISO>.json` (#1411). Pending tokens are skipped (preserved for the next `--apply`); rejected tokens are skipped (dropped after archive). Modifications overlay the four allowed fields (`name`, `value`, `category`, `namespace`) onto the proposed token; everything else flows through unchanged. Output regeneration shares `generateOutputs` with `init` so the resulting `rafters.css` / `rafters.ts` / `rafters.json` are byte-identical to a fresh init given the same exports config. The nextStep message at the end of `rafters import` and the in-init detection prompt now point at `rafters import --apply` instead of the misleading `rafters init --rebuild` (the latter never read the pending file).

### Breaking Changes

- breaking(set): every `rafters set <name> <value>` records a `userOverride` diary entry (previousValue + reason) on the token, and the resulting node becomes a cascade anchor -- future upstream changes do not clobber it. Downstream dependents still re-derive against the anchor's new value. The `--no-cascade` flag is removed; the only meaningful flag is now `--reason "..."` (required in `--agent` mode; interactive prompt otherwise). This fixes a silent-clobber bug where cascade-mode sets saved a value, left the binding pointing at the old upstream, and got reverted the next time the upstream changed. Matches the registry's new `set(name, value, { reason })` signature -- the `cascade` option is gone from the public API.
- chore(set): `loadRegistryFromDir` calls now register the four built-in plugins (`scalePlugin`, `contrastPlugin`, `invertPlugin`, `statePlugin`), so any semantic token carrying a `binding` resolves at load time rather than throwing `Unknown plugin: scale`.

### Patch Changes

- fix(set): the `--no-cascade` flag was silently ignored. Commander populates the long-form derived from `--no-cascade` as `options.cascade = false`, but the action handler was reading `options.noCascade`, which is never set. The flag now wires through correctly. Added a Commander integration test so the wiring is locked.
- chore(init): `rafters init` (and `--reset` / `--rebuild`) now consume `@rafters/design-tokens` for generation, persistence, and export instead of `@rafters/design-tokens-v1`. Output byte-shape (`rafters.css`, `rafters.ts`, `rafters.json`) is unchanged; this is purely an internal swap. Init flows pass `scalePlugin` to `TokenRegistry` so semantic tokens with cascade bindings re-derive correctly on family remap.

### Minor Changes

- feat(set): new `rafters set <name> <value>` command for updating a token's value in `.rafters/tokens/*.rafters.json`. Default behaviour cascades to dependent tokens via the `@rafters/design-tokens` registry. The `--no-cascade` flag records the value as a `userOverride` anchor — the token is marked as a designer deviation from the mathematical scale and is skipped by future cascades; downstream propagation still flows from the new value. `--no-cascade` requires `--reason "..."` (or an interactive prompt in non-agent mode). String values are stored as-is; JSON-shaped values (e.g. `'{"family":"accent","position":"500"}'` for a `ColorReference`) are parsed and validated against the union of `string | ColorValue | ColorReference` from `@rafters/shared`. `--rafters-dir <path>` overrides the default `.rafters/tokens` location. `--agent` switches output to JSON (`{event, name, previous, next, cascade, reason?}`) for machine consumption.

## 0.0.54

### Minor Changes

- feat(config): multi-folder paths for components, primitives, composites, rules (#1420 / #1421). Each path field in `.rafters/config.rafters.json` now accepts either the existing single string or an array of entries, so a project can read assets from external folders (e.g. `@shingle/shared`) on top of its own. Entries are plain strings or `{ path, root: true }` objects; the install root for `rafters add` is the entry tagged `{ root: true }`, otherwise the first entry whose realpath resolves inside cwd, otherwise the framework default at cwd. Local always wins on collision -- the install root is always first in the read set so first-write-wins semantics in loaders produce local-wins reads. New `rulesPath` field added with the same semantics. New helpers `resolveRoot` and `resolveReadSet` in `utils/paths.ts`. MCP composite loader now iterates the resolved read set instead of a hardcoded `.rafters/composites` path, so shared composite packages are queryable through `rafters_composite`. New `docs/CONFIG.md` walks through the shape, the resolution rules, and the `@shingle/shared` motivation.

## 0.0.53

### Minor Changes

- feat(init): framework selection by flag or prompt. `rafters init --framework <name>` lets you set the framework explicitly (`next` | `vite` | `remix` | `react-router` | `astro` | `wc` | `vanilla`), skipping auto-detection. When detection returns `unknown` and the shell is interactive, `init` now prompts for the framework instead of silently proceeding with defaults. Non-interactive / agent-mode runs still fall through to `unknown` unless the flag is set. Two new framework targets: `wc` (Web Components, component target `wc`, extension `.element.ts`) and `vanilla` (plain HTML/TS, component target `react`). Registry-side `.element.ts` already ships in every component's bundle, so `rafters add` against a `wc` framework pulls the WC files along with the shared tokens.
- feat(ui): Web Component framework target. Eight components now ship a third framework target alongside `.tsx` (React) and `.astro` (Astro) -- a `.element.ts` custom element that consumes the shared design tokens via shadow DOM. Every element auto-registers on import (idempotent), accepts the documented attribute set with silent fallbacks on unknown values, and composes its shadow stylesheet from a sibling `.styles.ts` via the `classy-wc` primitive. Components shipped: `<rafters-badge>` (#1297 / #1310), `<rafters-card>` (#1298 / #1308), `<rafters-container>` (#1299 / #1314), `<rafters-grid>` (#1300 / #1312) with container-query responsive cols (mobile-first base, step-up breakpoints at 30/48/64/80/96rem, never viewport media queries), `<rafters-typography>` (#1301 / #1315) covering all 17 variants (h1-h4, p, lead, large, small, muted, code, blockquote, ul, ol, li, codeblock, mark, abbr), `<rafters-button>` (#1302 / #1313) across the full 12-variant x 8-size matrix with hover/active/focus-visible/disabled states, `<rafters-input>` (#1303 / #1316), and `<rafters-textarea>` (#1304 / #1317). Both `<rafters-input>` and `<rafters-textarea>` are form-associated custom elements (`static formAssociated = true`, `ElementInternals`, `setFormValue`, `setValidity`, full form lifecycle callbacks) so they submit with a `name=value`, participate in native validation, and reset with the enclosing `<form>`. No Tailwind runtime required in the consumer; tokens resolve from shadow-adopted custom properties.
- feat(ui): TokenResolver learns typography composite + DTCG reference resolution (#1305 / #1309). `resolveComposite(name)` expands a `$type: typography` token whose `$value` is a JSON composite into the five CSS properties (`font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`) by looking up each member against the flat DTCG map. `resolveReference(value)` walks DTCG reference strings (`{color.primary.500}`) to the leaf `$value`, detecting cycles and enforcing a depth bound of `MAX_REFERENCE_DEPTH = 16`. `resolve()` and `resolveColor()` now route through reference resolution transparently so a `color-button-bg` token whose `$value` is `{color.primary.500}` returns the leaf OKLCH string. Cycles and depth-exceeded throw plain Error objects with structured `ResolveTokenError` fields attached (no OOP hierarchies). Closes the two TODOs left open on #1199.
- feat(ui): token-sheet extractor for Web Component shadow DOM (#1306 / #1311). `extractTokenSheet(rawCss)` walks compiled Tailwind v4 output via `css-tree` AST (never regex -- token values contain unbalanced braces inside `oklch()`), returning only the `:root { --* }` and `.dark { --* }` blocks stripped of every utility class, `@theme`, `@utility`, `@layer`, `@keyframes`, `@apply`, and `@custom-variant` rule. Output adopts cleanly via `new CSSStyleSheet().replaceSync()` for use with `RaftersElement.setTokenCSS()`. `loadTokenSheet()` reads the compiled CSS from `.rafters/output/rafters.css`. Errors are plain object literals matching the `TokenSheetError` interface. WC consumers now have a minimal token-only stylesheet to ship alongside their components without carrying the full Tailwind output.

## 0.0.52

### Minor Changes

- feat(mcp): monorepo workspace support. `rafters mcp` now reads `pnpm-workspace.yaml` (and `package.json#workspaces` for npm/yarn/bun) when started from a monorepo root, discovers every workspace package containing `.rafters/config.rafters.json`, and addresses them by directory name. Every existing tool (`rafters_composite`, `rafters_rule`, `rafters_pattern`, `rafters_component`) accepts an optional `workspace` parameter. New `rafters_workspaces` tool lists what's available and which one is the default for unscoped calls. Falls back to single-root mode when no monorepo manifest is present, preserving existing behavior.

## 0.0.51

### Patch Changes

- fix(ui): `classy` no longer warns on every layout utility. It had no runtime way to distinguish Rafters-internal class maps (Container, Grid, Card internals) from user slop -- both arrive as strings -- so SSR builds flooded logs with hundreds of false positives from `cardHeaderClasses`, `cardContentClasses`, etc. File-aware enforcement belongs in the pre-edit hook and a future build-time source scanner, not in classy. Removes `LAYOUT_UTILITY_PATTERNS`, `isLayoutUtility`, the consumer-mode warning, the dead component-mode strip path, and `ClassyOptions.component`. Keeps arbitrary-value blocking (unambiguous) and token resolution. Code change shipped in #1294, this entry catches up the changelog.

## 0.0.50

### Patch Changes

- fix(cli): move `@rafters/composites` from `dependencies` to `devDependencies` so it is no longer listed as a runtime dep in the published tarball. The package is private to the workspace and is bundled into `dist/index.js` by tsup (`noExternal`), matching how `@rafters/color-utils`, `@rafters/design-tokens`, `@rafters/shared`, and `@rafters/studio` are already handled. Fixes `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND: "@rafters/composites@workspace:*" is in the dependencies but no package named "@rafters/composites" is present in the workspace` when running `pnpm dlx rafters@0.0.49`. Regression from #1252.

## 0.0.49

### Minor Changes

- feat(onboard): `rafters init` now detects existing design tokens (Tailwind v4 `@theme`, shadcn, generic CSS custom properties) and prompts the user to import them. On confirmation, writes `.rafters/import-pending.json` for review. New `rafters import` command runs the same flow standalone with `--force` and `--importer` options. Import flow moved out of MCP -- agents assemble from pre-made decisions, onboarding is a designer/developer operation. Closes #1271.
- feat(onboard): Tailwind v4 importer detects `@theme` blocks and extracts all design token namespaces (color, spacing, typography, radius, shadow, motion, opacity). Maps Tailwind `--ease-*` and `--duration-*` to rafters `motion-ease-*` and `motion-duration-*` namespace. Skips viewport-only tokens (breakpoint, container). Priority 90 (highest) since `@theme` is unambiguous. Closes #1259.
- feat(onboard): orchestrator coordinates the import pipeline. `onboard()` detects the best importer (shadcn or generic-css), checks confidence thresholds, and runs the import. `previewOnboard()` returns all compatible importers sorted by confidence for analysis without importing. Closes #1270.

### Breaking Changes

- refactor(mcp): removed `rafters_onboard` MCP tool. Token import moved to `rafters init` / `rafters import` CLI commands. MCP now has 4 focused tools (composite, rule, pattern, component) for agent assembly.

### Patch Changes

- fix(mcp): `rafters_pattern` no longer returns hardcoded patterns. Now queries composites by their `solves` and `appliesWhen` fields. Patterns are design intelligence captured in composite manifests, not static data in the MCP server. Search by what the pattern solves (e.g., "hierarchy", "authentication") or use `query` for fuzzy search. Closes #1280.
- refactor(plugins): schema-first plugin protocol replaces the class-based `GenerationRuleExecutor`. Each plugin is now a `Plugin<I,O>` with a Zod input schema, a Zod output schema, and a pure `transform` function -- no registry access, no name regex, no implicit side effects. `resolveInput` is the single registry-aware layer that builds the typed input struct from token state; `regenerate` calls it per-node; `cascade` does the topological walk and collects all failures into one aggregate error (`cause.code === 'cascade-aggregate'`). `GenerationRuleExecutor`, `rule-engine.ts`, and `validators/typography-a11y.ts` are deleted. All six built-in plugins (scale, state, contrast, invert, calc, example) are rewritten as `definePlugin` default exports. Closes #1232, #1243.
- fix(schema): `TokenSchema.userOverride` is now required + nullable instead of optional. `null` is the explicit signal that no designer override exists (generated baseline); a populated object signals a documented designer override. Every generator emits `userOverride: null` explicitly -- the field can no longer be accidentally omitted. Patch schemas (`TokenPatchSchema`) keep `userOverride` optional so PATCH payloads do not have to include it. The `onboard.test.ts` sentinel updated from `!== undefined` to `!== null` to match the new contract. Closes #1227.

## 0.0.48

### Patch Changes

- fix(mcp): `rafters_token set` on a semantic family slot (primary, accent, destructive, etc.) now cascades to all derivatives (-foreground, -hover, -active, -border, -ring, -focus, -subtle) in one call. Previously the cascade only fired from `rafters_onboard map`, so `set` would write the single token and exit, leaving derivatives pointing at the previous family. The cascade machinery from #1152/#1205/#1206 was already correct downstream — only the trigger was missing. Closes #1211.
- fix(mcp): `dependsOn[0]` on semantic family tokens is now correctly preserved as the bare family name (e.g. `"dim-honest-plum"`) on `set` instead of being overwritten with a family-position string (e.g. `"dim-honest-plum-900"`). Restores the convention enforced everywhere else after #1205's review fix.
- The `set` response now includes a `familyCascade` array listing the names of derivatives cascaded (empty for non-family targets), so callers can verify the cascade fired.

## 0.0.47

### Minor Changes

- feat(tokens): wire semantic tokens into dependency graph for auto-cascade. Semantic tokens had dependsOn but no generationRule, making them invisible to the DAG. Now every semantic token has a generationRule (contrast:auto for foregrounds, state:hover/active/focus/disabled for states, scale:N for direct positions). State/contrast/invert executors connect to real plugins instead of returning stubs. Invert plugin rewritten to use WCAG AAA/AA pair matrix. Shared scale-positions module extracted from 3 duplicate maps.
- feat(tokens): fill token namespace -- composite visual recipes (color + opacity + backdrop-blur + gradients) as designer-configurable tokens. Fills resolve differently based on context: surface components get background classes, typography gets text color or gradient text via bg-clip-text. Seven default fills: surface, panel, overlay, glass, primary, muted, hero. Use `fill="surface"` on Container/Card or `color="hero"` on Typography for gradient text.
- feat(tokens): fill token CSS export -- fill tokens appear in generated CSS as custom properties with JSON metadata for runtime resolution by the fill-resolver primitive.

### Patch Changes

- fix: onboard family name collision. When onboarding a color to a semantic family like "primary", the enriched ColorValue was stored under "primary" -- overwriting the semantic token and breaking the CSS exporter. Now the ColorValue is stored under its perceptual name (e.g., "dim-honest-plum") and the semantic token keeps its ColorReference pointing at the new family.
- fix(tokens): preserve family token in dependsOn[0]. regenerateToken was overwriting dependsOn[0] from the family token to a position token, breaking subsequent cascades. dependsOn[0] must stay as the family name so plugins can access ColorValue WCAG data on every cascade.
- fix(tokens): tagged RuleResult union (CssResult | RefResult) for exhaustive switch. State plugin reads base token's actual position instead of hardcoded 500. Contrast plugin uses INDEX_TO_POSITION. Silent fallbacks replaced with proper errors. 24 new tests added.

## 0.0.46

### Patch Changes

- fix(tailwind): radius tokens in @theme block now use var(--radius-base) references instead of hardcoded values. Setting radius-base to 0 now cascades to all derived radius tokens (sm, md, lg, xl, etc.) via CSS custom properties. Run `rafters init --rebuild` to regenerate.

## 0.0.45

### Minor Changes

- feat(registry): `rafters add typography` now bundles all Astro sub-components (H1-H6, P, Code, etc.) in a single install. Sub-components that import the parent's shared .classes.ts file are automatically detected and included. Standalone components like alert-dialog (which have their own .classes.ts) remain independent.
- fix(registry): `rafters add typography-h1` resolves shared files from actual imports instead of name matching. typography-h1 now correctly bundles typography.classes.ts.

## 0.0.44

### Patch Changes

- fix(cli): create palette position tokens when map enriches a color. When onboard map maps a color family to a semantic role, palette position tokens (e.g., primary-500, primary-600) are now created automatically so downstream scale references resolve correctly.
- fix(registry): sub-components like typography-h1 now bundle parent shared files (typography.classes.ts) correctly. Previously the registry only looked for same-named shared files, breaking `rafters add typography-h1`.

## 0.0.43

### Minor Changes

- feat(ui): Astro typography tag components. Individual .astro files for each HTML element (H1-H6, P, Code, Blockquote, Codeblock, Small, Mark, Abbr) with zero client JavaScript. Each uses shared tokenPropsToClasses from typography.classes.ts. Token-level props (size, weight, color, line, tracking, family) for surgical overrides. Installable via `rafters add typography-h1`, `rafters add typography-p`, etc.

## 0.0.42

### Minor Changes

- feat(tokens): typography intelligence system with composite generator. One composite token per typography role (display-large, title-medium, body-small, etc.) bundles font-family, font-size, font-weight, line-height, and letter-spacing into a single token. Font-family role tokens (font-heading, font-body, font-code) added as first-class token type. Typography composite type definitions integrated into the token registry.
- feat(ui): typography tag components with token-level props. Individual HTML element components (H1-H6, P, Code, Blockquote, Small, Mark, Abbr) replace the unified Typography component. Each renders its own HTML element with designer-controlled defaults from typography composite roles. Token-level props (size, weight, color, line, tracking, family) allow surgical override of any dimension while staying within the token system. Removed Lead, Large, Muted as separate components -- they are now P with explicit props. 27 component .classes.ts files migrated to semantic role utilities.

### Patch Changes

- fix(tailwind): remove double-prefix on spacing and radius :root custom properties. The exporter was emitting --rafters-spacing-base and --rafters-radius-base in :root but --spacing-base and --radius-base in @theme, breaking the variable chain. Now emits consistent unprefixed names in :root so @theme references resolve correctly.

## 0.0.41

### Patch Changes

- fix(tailwind): spacing scale variables in @theme block now reference var(--spacing-base) instead of var(--rafters-spacing-base). The @theme block defines --spacing-base but the token values referenced --rafters-spacing-base (the :root namespace), causing all gap-*, p-*, m-* utilities to resolve to empty values. Tailwind generated the CSS rules but they computed to zero because the variable chain was broken.

## 0.0.40

### Minor Changes

- feat(mcp): semantic cascade on onboard map. When a color is mapped to a semantic family (primary, secondary, destructive, etc.), all surface tokens for that family (foreground, hover, active, border, ring, focus) are automatically remapped to the new color. Positions are verified against precomputed WCAG AAA accessibility pairs (falls back to AA). Human overrides on surface tokens are preserved. Neutral cascade updates background, foreground, card, popover, and surface tokens. One map call now cascades to 10+ surface tokens automatically instead of requiring manual light/dark remapping for each.

## 0.0.39

### Patch Changes

- fix(mcp): dark mode semantic tokens now persist correctly after onboard map. The map handler was mutating dependsOn in memory after registry.set() had already persisted, so dark mode CSS output still referenced neutral defaults. Now uses registry.setToken() to atomically persist value and dependsOn together.
- fix(mcp): rafters_token set on semantic tokens now parses "family-position" strings into ColorReference objects. Previously, setting a semantic token stored a plain string which the CSS exporter skipped, falling back to DEFAULT_SEMANTIC_COLOR_MAPPINGS. Now auto-parses and updates both value and dependsOn for correct dark mode output.
- fix(mcp): validate dark param and reject invalid semantic token values. The dark parameter is now validated through parseColorRef (rejects garbage like "purple"), rejected for non-semantic tokens (was corrupting dependsOn on spacing/font tokens), and unparseable string values for semantic tokens return an actionable error instead of silently succeeding.

## 0.0.38

### Minor Changes

- feat(tokens): four-corner radius tokens (#1130). Emits radius-base, radius-tl/tr/bl/br per-corner base tokens, and per-corner per-scale tokens (e.g., radius-lg-tl) that cascade via calc() from the corner base. Override one corner and it propagates through all scale positions.
- feat(tokens): decomposed shadow tokens (#1130). Each shadow scale emits 5 decomposed tokens (offset-x, offset-y, blur, spread, color) plus a composite that references them via var(). Colored variants (shadow-primary, shadow-destructive) reuse DEFAULT geometry and swap color via color-mix. Inner shadows baked into composite.
- feat(mcp): semantic token remapping in rafters_onboard (#1130). The map action now accepts "light" and "dark" fields (format: "family-position") to remap which color family a semantic surface token (background, foreground, card, etc.) references for light/dark mode. Fixes the gap where mapping color families didn't update semantic tokens that still pointed at neutral defaults.

### Patch Changes

- fix(mcp): rafters_token set now persists userOverride metadata to disk. Previously, set modified the local token object but called registry.set() which only persisted the value, discarding userOverride. Now uses registry.setToken() to persist the full token object including override tracking. Fixes #1111.
- fix(mcp): semantic remapping in onboard map now persists dependsOn atomically with value. Previously, registry.set() persisted value then dependsOn was set after persist, so dark mode references were lost on reload. Fixes dark mode CSS still outputting neutral defaults after onboard map with dark fields.
- feat(mcp): rafters_token set now accepts a "dark" parameter for semantic tokens. Sets dependsOn[1] so the CSS dark mode layer uses the specified color reference instead of falling back to the light value.
- fix(tailwind): filter decomposed shadow parts from Tailwind utility generation. Shadow offset-x/y, blur, spread, color tokens are emitted as --rafters-* custom properties only, not as --shadow-* Tailwind utilities.
- fix(tailwind): skip breakpoint tokens with media query values (e.g., prefers-reduced-motion conditions) that would generate invalid Tailwind CSS.
- fix(mcp): onboard analyze now detects .dark/prefers-color-scheme CSS and guides agents to remap semantic surface tokens after mapping color families.

## 0.0.37

### Patch Changes

- fix(mcp): resolve component files by framework target instead of hardcoding .tsx (#1146). MCP tools now find .astro, .vue, and .svelte components using componentTarget from config. Also reads .classes.ts companions for variant/size data. Fixes rafters_component returning null in all non-React consumer projects.

## 0.0.36

### Patch Changes

- Fix init --rebuild spinner bugs: orphaned spinner on rebuild path, spinner not nulled on complete, stdin not released after inquirer prompts

## 0.0.35

### Patch Changes

- Fix init --rebuild hang: spinner was hiding @tailwindcss/cli install prompt
- Revert: rebuild re-prompts for export formats (intentional behavior)

## 0.0.34

### Minor Changes

- Motion system applied to all components: duration tokens, easing curves, motion-reduce on everything
- Hover, active, disabled states applied per component spec
- Size variants added to component spec (28 components get sm/md/lg)
- Design system docs: MOTION, COLOR, SPACING, TYPOGRAPHY, DEPTH, RADIUS, SHADOW rewritten with intent
- 20 internal research docs archived to vault

### Patch Changes

- Fix compiled CSS export hang: 30s timeout on @tailwindcss/cli execFileSync
- docs-site excluded from biome linting

## 0.0.33

### Minor Changes

- All 44 components use shared `.classes.ts` files -- single source of truth for styling across React and Astro variants
- Tailwind utilities (`p-4`, `rounded-md`, `shadow-md`) now read from rafters token system via `@theme` -- change a base token, every component updates
- Component spec (COMPONENT_SPEC.json): complete visual specification for 46 components with color mappings, state tokens, motion specs, shadow specs, radius specs. WCAG AAA + Section 508 target.
- Component audit (COMPONENT_AUDIT.json): current state matrix documenting every gap

### Patch Changes

- Astro component fixes: focus-visible on breadcrumb-link, motion tokens on tooltip, viewport-to-CQ on breadcrumb/typography, classy on image internals, margin-to-gap on empty sub-components
- Editor a11y test updated for post-rewrite structure
- Studio vite-plugin test updated for create endpoint behavior

## 0.0.32

### Minor Changes

- `rafters init` writes `.claude/skills/rafters-frontend/SKILL.md` to consumer project -- agents see Container, Grid, and typography examples every session
- Configurable dark mode: `darkMode: 'class'` (default, `.dark` class toggle) or `'media'` (OS preference) in config.rafters.json

### Patch Changes

- `classy` detects layout utilities (`flex`, `gap-*`, `p-*`, `m-*`): strips on components, warns on consumer code
- Fix `@/` import paths doubling `src/` prefix in Astro/Vite projects

## 0.0.31

### Patch Changes

- Radius and spacing tokens now cascade via CSS `calc()` expressions -- changing `radius-base` or `spacing-base` updates all dependent tokens instantly

## 0.0.30

### Patch Changes

- Fix achromatic color crash: grays (#9D9D9D, #808080, black, white) no longer produce NaN hue in OKLCH conversion
- Fix Astro projects installing react from .tsx variant dependencies during `rafters add`
- 11 new color-utils conversion tests (gray handling, rgb/hsl/oklch parsing)

## 0.0.29

### Minor Changes

- Human confirmation gate on `rafters_onboard map`: tool refuses without `confirmed: true`, instructs agent to ask the designer first
- Color enrichment pipeline: hex/rgb/hsl/oklch parsed via colorjs.io, enriched through `buildColorValue()` + api.rafters.studio intelligence
- Scale pattern detection in analyze: detects existing 11-step color families (e.g., --color-blaze-50 through --color-blaze-950)
- Family checklist in analyze: shows all 11 semantic families with status (default/designer/unmapped) and coverage fraction
- `rafters_onboard status` action: completeness tracking for onboarding progress
- @theme block properties now extracted into customProperties (previously only captured as raw strings)
- 20 onboard integration tests with real designer decision fixtures (legal requirements, colorblind testing, art director intent)

## 0.0.28

### Minor Changes

- MCP write access: `rafters_token` tool now supports set, create, and reset actions with mandatory why-gate reasoning
- `rafters_onboard` MCP tool: analyze existing CSS for design decisions, map them to tokens with the designer in the loop
- Init stripped to scaffold-only: no more automatic shadcn color mapping, detects existing design decisions and directs to MCP onboarding
- System preamble updated with intentional onboarding guidance
- 22 Astro components: Alert, Avatar, Breadcrumb, Empty, Image, Item, Pagination, Progress, Spinner, Table, Tabs, Tooltip (with shared .classes.ts for React/Astro parity)

## 0.0.27

### Minor Changes

- POST /api/tokens/:name creates arbitrary color families when token does not exist (201 response)
- Async color enrichment via WebSocket: fires api.rafters.studio fetch before local math, intelligence fills in live via `rafters:color-enriched` event
- Client-side `onColorEnriched()` listener in @rafters/studio for async intelligence data

## 0.0.26

### Patch Changes

- Fix GET /api/ info route: was only in apps/api (Hono), now in the Vite studio plugin where rafters studio actually runs

## 0.0.25

### Minor Changes

- Correct token API contract: getters return full Token data, setters take value + reason, return { ok: true }
- GET / returns structured API info: system metadata, rules, endpoint docs
- RAFTERS_VERSION constant in @rafters/shared for version consistency
- POST /api/shutdown for graceful studio server stop
- POST /color/build: OKLCH in, full ColorValue out

## 0.0.24

### Patch Changes

- `rafters studio` now works for all consumers: Vite dev server with HMR token API, bundled via tsup
- Studio plugin from @rafters/studio bundled into CLI dist (source-only, like @rafters/shared)
- Vite is a runtime dependency (external, not bundled) for proper native binding resolution
- No more path resolution hacks -- uses programmatic `createServer()` API

## 0.0.23

### Patch Changes

- Remove stale hono and @hono/node-server from runtime dependencies (leaked from earlier embedded server approach)
- Studio command now uses the Vite-powered @rafters/studio package with HMR

## 0.0.22

### Patch Changes

- Studio command uses Vite dev server with HMR for instant token updates
- Fix workspace TS module resolution via tsx/esm
- Fix pre-existing biome lint errors across color-utils, serializer-text, document-editor
- Falls back to generating 535 default tokens if no token files exist
- Standalone Hono server on port 8787, no wrangler dependency

## 0.0.21

### Patch Changes

- Fix `rafters studio` command path resolution for monorepo development
- Add nodejs_compat flag to API wrangler config for design-tokens node:fs support
- Initialize token registry with full 535-token default system on first API access

## 0.0.20

### Minor Changes

- Add token registry API endpoints: getters, setters with why-gate enforcement, namespace reset
- GET /tokens, /tokens/:namespace, /tokens/:namespace/:name for reading the full 536-token system
- PUT /tokens/:namespace/:name with mandatory reason (why-gate) for every override, cascades through dependency graph
- POST /tokens/:namespace/reset to regenerate a namespace with new config (e.g., switch spacing progression)
- DELETE /tokens/:namespace/:name/override to clear overrides and restore computed values
- Add Astro-native components: Container, Grid, Typography, Kbd, Label, Input (zero client JavaScript)
- Extract shared .classes.ts files for React/Astro visual parity
- 25 API tests against a real token registry

## 0.0.19

### Patch Changes

- Fix repository URL for npm provenance verification (ezmode-games -> rafters-studio)

## 0.0.18

### Patch Changes

- Re-release with OIDC trust policy updated for rafters-studio org

## 0.0.17

### Patch Changes

- Fix shared auxiliary files (.classes.ts, .types.ts, .constants.ts) incorrectly listed as primitive dependencies in registry responses
- Add CLI integration test suite: 39 tests covering init workflows, config persistence, MCP tools, and project root discovery
- Separate integration tests from unit tests in CI (integration tests run after build)

## 0.0.16

### Patch Changes

- Fix config exports not persisting on rebuild/reset when config file is missing

## 0.0.15

### Patch Changes

- Framework-aware file routing for `rafters add` -- selects .tsx, .astro, .vue, or .svelte files based on detected framework

## 0.0.14

### Patch Changes

- MCP server discovers project root by walking up from cwd to find .rafters/config.rafters.json instead of assuming process.cwd() is the project root
- Add --project-root flag for explicit override
- Replace silent catch blocks in MCP tool handler with clear error messages
- Cache config loading (one read per handler lifetime)

## 0.0.13

### Patch Changes

- Fix component target detection for Astro projects with React integration
- Add componentTarget field to RaftersConfig

## 0.0.12

### Patch Changes

- 929242e: Fix @dependencies JSDoc tag parser to stop at parenthetical descriptions instead of treating them as package names
- 26c68ff: Fix transitive dependency resolution: sibling component imports now auto-installed, types.ts included as registry primitive

## 0.0.11

### Patch Changes

- fix(resizable): correct handleIndex for multi-panel layouts (#930)
- fix(select): display label text instead of raw value in SelectValue (#931)
- fix(shared): harden JSDoc intelligence parsing with validateComponentIntelligence() and 21 new tests (#932)
- refactor(ui): add displayName to 110+ subcomponents, forwardRef to 5 components (#933)
- refactor(ui): remove dead underscore-prefixed props from 6 components (#934)
- refactor(ui): standardize asChild on slot primitive's mergeProps (#935)
- feat(design-tokens): add designer intent and relationship fields to DTCG export (#918)
- feat(design-tokens): add AI intelligence metadata to DTCG export (#919)
- feat(ui): add rule-drop-zone leaf primitive (#904)

## 0.0.10

### Patch Changes

- a50a8ae: Fix framework detection for Astro projects: add config file fallback detection (astro.config.mjs, etc.) and refresh framework/paths on rebuild

## 0.0.9

### Patch Changes

- Add system preamble to MCP tools with layout rules, spacing ownership, and Container/Grid guidance
- Overhaul `rafters_vocabulary` to use config + registry for accurate component/token listings
- Add `rafters_cognitive_budget` MCP tool for attention-budget-aware component selection
- Add installed component tracking to `RaftersConfig` and `rafters add`
- Wire `rafters add` to auto-install npm dependencies declared via `@dependencies` JSDoc tags
- Add `--update` and `--update-all` flags to `rafters add` for updating previously installed components
- Deduplicate `RegistryItemType` into shared `rafters/registry/types` import
- Parse `@dependencies` and `@devDependencies` JSDoc tags in MCP component intelligence

## 0.0.8

### Patch Changes

- 79df2e0: Fix CLI error handling and Tailwind CSS detection. Updated component CSS with accent-foreground fix for container headings. Added color-swatch primitive and gamut-aware color utilities.

## 0.0.7

### Patch Changes

- Add --reset flag and rename --force to --rebuild
  - Added `--reset` flag for re-running generators fresh (clears previous output before regenerating)
  - Renamed `--force` to `--rebuild` for clarity (breaking change for CLI users)
  - Compiled CSS export moved to `@rafters/design-tokens` (`registryToCompiled`)
  - PersistenceAdapter simplified to load/save API
  - MCP tools updated for simplified userOverride fields with COMPUTED symbol for override clearing

## 0.0.6

### Patch Changes

- 252865a: Add Studio Design Intelligence Recorder with visual-first token editing, OKLCH color picker, why-gate reasoning enforcement, and 6 namespace workspaces
