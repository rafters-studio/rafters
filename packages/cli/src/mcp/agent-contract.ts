import { TOOL_DEFINITIONS } from './tools.js';

/**
 * MCP tools that are live: description does not start with "[DEPRECATED".
 * Reads the existing description-prefix convention rather than adding a
 * `deprecated` field to TOOL_DEFINITIONS -- MCP tool definitions in tools.ts
 * are out of scope for this module to change.
 */
function liveTools(): (typeof TOOL_DEFINITIONS)[number][] {
  return TOOL_DEFINITIONS.filter((t) => !t.description.startsWith('[DEPRECATED'));
}

/**
 * Names of the live (non-deprecated) MCP tools.
 */
export function liveToolNames(): string[] {
  return liveTools().map((t) => t.name);
}

/**
 * Generates the rafters agent contract: the same content
 * plugin/hooks/session-start.sh injects for Claude Code, and what
 * `rafters agents` writes into AGENTS.md for every other agent host.
 * The tool roster is built from TOOL_DEFINITIONS so a tool rename or
 * removal changes this output with no hand edit; the surrounding prose
 * never repeats a specific tool name, so it cannot drift from the
 * roster independently.
 */
export function generateAgentContract(): string {
  const roster = liveTools()
    .map((t) => `- \`${t.name}\`: ${t.description}`)
    .join('\n');

  return `# Rafters agent contract

You are working in a Rafters-powered frontend project. The design system owns
every visual decision -- color, spacing, size, weight, radius, shadow, hierarchy,
and layout rhythm are already decided. Your job is to assemble the pre-made piece
that fits the content and intent, never to author a visual choice. A write-time
hook denies any edit that hand-authors a visual decision.

## Assembly model -- follow this order every time

1. Query the design system before writing any UI. You do not know this system
   from training; read it from the MCP tools below, every time. Read the project's
   recorded intent from \`.rafters/config.rafters.json\` first.
2. Prefer a composite or pattern that solves the whole problem (authentication,
   data entry, navigation, pricing) over assembling lone components by hand.
   Render its blocks verbatim -- the manifest is the decision.
3. Drop to a single component only for a lone affordance no composite covers.
4. Author a custom component only when the served design system genuinely does not
   ship the affordance -- the last resort, not the first.
5. Prose and content (headings, paragraphs, lists, quotes) render as bare native
   HTML inside \`<Container as="article">\` -- no classes, no imports.

## Never

- Never write flex, grid, gap, padding, or margin utilities directly. Container
  and Grid own all layout.
- Never use raw \`<h1>\`/\`<p>\`/\`<span>\` with class attributes for styled text.
  Use the typography components with token props (size, weight, color).
- Never use hex colors, arbitrary values, or \`var()\`. The composite's block meta
  or the component's \`variant\` prop carries the color decision -- do not set
  semantic color utilities (bg-primary, text-accent) in assembly class strings.
- Never pass \`class\` or \`className\` to a served component. Use token props for
  overrides.

If you do not know what to build or how it should look, get a design direction
before writing code. The pre-edit hook WILL block violations. Consult the design
system BEFORE writing, not after.

## MCP tools

Query these before writing UI:

${roster}

## Running the rafters MCP server

Non-Claude-Code hosts wire the server manually. Invoke the \`rafters\` binary that
is installed in your project, through your package manager:

- \`pnpm exec rafters mcp\`
- \`npx rafters mcp\`
- \`yarn rafters mcp\`

Run the copy pinned in your own lockfile. Do NOT use \`pnpx rafters@latest\`,
\`npx rafters@latest\`, \`pnpm dlx rafters\`, or any \`@latest\` pin: these resolve
outside your lockfile and can drift from the version your project installed --
the exact staleness that strands you on an old rafters after a new one ships.
`;
}
