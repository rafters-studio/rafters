# Rafters agent contract

You are working in a Rafters-powered frontend project. The design system owns
every visual decision -- color, spacing, size, weight, radius, shadow, hierarchy,
and layout rhythm are already decided. Your job is to assemble the pre-made piece
that fits the content and intent, never to author a visual choice. A write-time
hook denies any edit that hand-authors a visual decision.

## Assembly model -- follow this order every time

1. Query the design system before writing any UI. You do not know this system
   from training; read it from the MCP tools below, every time. Read the project's
   recorded intent from `.rafters/config.rafters.json` first.
2. Prefer a composite or pattern that solves the whole problem (authentication,
   data entry, navigation, pricing) over assembling lone components by hand.
   Render its blocks verbatim -- the manifest is the decision.
3. Drop to a single component only for a lone affordance no composite covers.
4. Author a custom component only when the served design system genuinely does not
   ship the affordance -- the last resort, not the first.
5. Prose and content (headings, paragraphs, lists, quotes) render as bare native
   HTML inside `<Container as="article">` -- no classes, no imports.

## Never

- Never write flex, grid, gap, padding, or margin utilities directly. Container
  and Grid own all layout.
- Never use raw `<h1>`/`<p>`/`<span>` with class attributes for styled text.
  Use the typography components with token props (size, weight, color).
- Never use hex colors, arbitrary values, or `var()`. The composite's block meta
  or the component's `variant` prop carries the color decision -- do not set
  semantic color utilities (bg-primary, text-accent) in assembly class strings.
- Never pass `class` or `className` to a served component. Use token props for
  overrides.

If you do not know what to build or how it should look, get a design direction
before writing code. The pre-edit hook WILL block violations. Consult the design
system BEFORE writing, not after.

## MCP tools

Query these before writing UI:

- `rafters_workspaces`: List rafters workspaces, or update a workspace's WIRING config. Called with no arguments (or just `workspace`): returns each workspace name, path, and which is the default for unscoped tool calls -- call this first when the project might be a monorepo. Called with any wiring field: updates that workspace's .rafters/config.rafters.json -- framework, registryUrl, componentTarget, source, cssPath, and the path fields (componentsPath, primitivesPath, compositesPath, rulesPath) and exports; only fields you pass change. Cannot set designer decisions (intent, darkMode, fonts) -- those are set in Studio -- and cannot set installed -- that is managed by `rafters add`.
- `rafters_describe`: Recursively introspect the component/composite intel graph. describe() returns the installed surface; describe(components)/describe(composites) list the kind roster; describe(button) returns a node -- intel plus type-marked, drillable children; describe(button.props.fill) drills into a prop and returns the real token values. describe(button.*) expands all props inline in one call (no more drill-per-prop round trips); describe(button.props.fill.?) probes safely (null on miss, not an error). A natural-language address (e.g. "what do I use when it needs to be above everything") routes through a separate intent door instead: deterministic keyword matching over a small, curated tag axis, returning a best-match node plus its near-miss counter-example. Below its match threshold it refuses rather than guessing, with a note pointing you at describe(components)/describe(composites) to browse; #2166 (open) is the follow-up that scores it against the intel this tool already owns. Every node carries parent and siblings for upward/sideways navigation, and children are typed pointers (enum for props, part for sub-components) you feed back in.
- `rafters_generate`: Resolve a bare component name to ONE registry component and return its verbatim, target-correct snippet with open content slots. A component name (e.g. "button", "separator", "badge") resolves directly; on a miss it falls back to the same intent door rafters_describe uses -- deterministic keyword matching over a small, curated tag axis, refusing below its match threshold with a note pointing you at describe(components) rather than guessing (#2166, open, is the follow-up that scores it against the intel this tool already owns). Returns { component, target, presence, snippet, slots } where snippet is the registry facet verbatim and each slot is left for the caller to fill. READ `presence` BEFORE PASTING: `installed` means the import resolves in this workspace; `available` means the component exists in the registry but is NOT in this project yet -- the snippet is still correct, but you must run the command in `install` first or the build fails on a missing import. If slots is empty, the component takes no children -- do not wrap it with content. v1 serves single components only -- no parameterization, no composites, no writes.

## Running the rafters MCP server

Non-Claude-Code hosts wire the server manually. Invoke the `rafters` binary that
is installed in your project, through your package manager:

- `pnpm exec rafters mcp`
- `npx rafters mcp`
- `yarn rafters mcp`

Run the copy pinned in your own lockfile. Do NOT use `pnpx rafters@latest`,
`npx rafters@latest`, `pnpm dlx rafters`, or any `@latest` pin: these resolve
outside your lockfile and can drift from the version your project installed --
the exact staleness that strands you on an old rafters after a new one ships.
