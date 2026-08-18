/**
 * describe-toy -- the recursive `describe` verb over the intel graph.
 * Evolves graph-toy.ts to the design landed in reflection 01a013a0.
 *
 * Pins the corners the old toy predated:
 *   1. describe(addr) recursion -- ONE verb, narrowing argument (no `.`/`?`/`*`)
 *   2. type-marked self-advertising children (enum|grammar|leaf|edge|deprecated)
 *   3. structured constraints (schema, not prose) + drillable vocab
 *   4. two-axis overlay: presence + per-target manifest STAMPED from a
 *      {target, installedSet} context -- NOT baked on nodes
 *   5. target-facet flip: one node, astro + wc facets, target flips the surface
 *   6. intent door: describe(<natural language>) -> node + counter-example
 *
 * Run: pnpm exec tsx .claude/scratch/describe-toy.ts
 */

type Target = 'astro' | 'wc' | 'react' | 'vue';
type Presence = 'installed' | 'available';
type Kind = 'component' | 'composite';

// A prop is a node; its `type` tells you whether to drill and what you'll get.
type Prop =
  | {
      type: 'enum';
      values: string[];
      default?: string;
      required?: boolean;
      constraint?: Constraint;
    }
  | { type: 'grammar'; grammar: string[]; vocab: string; onInvalid: string; default?: string } // vocab = drillable addr
  | {
      type: 'boolean' | 'string' | 'node';
      default?: string;
      required?: boolean;
      deprecatedFor?: string;
    };

// Structured, machine-actionable -- never a prose string.
type Constraint = { when: { prop: string; matches: string }; requires: { prop: string } };

interface Facet {
  props: Record<string, Prop>;
  slots?: string[];
  events?: string[];
  snippet: string; // render-correct IN THIS TARGET
}

interface Node {
  kind: Kind;
  intel: { cognitiveLoad: number; dos: string[]; nevers: string[]; semanticMeaning?: string };
  facets: Partial<Record<Target, Facet>>; // absence for a target => manifest gap
  composesWith?: string[];
  vocab?: Record<string, string[]>; // drillable token sets (e.g. fill.vocab)
}

// ---- the universal graph (presence-free; assembled once) --------------------
const GRAPH: Record<string, Node> = {
  button: {
    kind: 'component',
    intel: {
      cognitiveLoad: 2,
      dos: ['One primary action per view'],
      nevers: ['Never bolt a className for color -- use variant'],
      semanticMeaning: 'a single committed action',
    },
    facets: {
      astro: {
        props: {
          id: { type: 'string', required: true }, // astro facet requires id
          variant: {
            type: 'enum',
            default: 'default',
            values: [
              'default',
              'primary',
              'secondary',
              'destructive',
              'success',
              'warning',
              'info',
              'muted',
              'accent',
              'outline',
              'ghost',
              'link',
            ],
          },
          size: {
            type: 'enum',
            default: 'default',
            values: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
            constraint: {
              when: { prop: 'size', matches: 'icon*' },
              requires: { prop: 'aria-label' },
            },
          },
        },
        slots: ['default'],
        snippet: '<Button id="save" variant="primary">Save</Button>',
      },
      wc: {
        // web-component facet: kebab ATTRIBUTES, custom-element tag, no id
        props: {
          variant: {
            type: 'enum',
            default: 'default',
            values: [
              'default',
              'primary',
              'secondary',
              'destructive',
              'success',
              'warning',
              'info',
              'muted',
              'accent',
              'outline',
              'ghost',
              'link',
            ],
          },
          size: {
            type: 'enum',
            default: 'default',
            values: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
            constraint: {
              when: { prop: 'size', matches: 'icon*' },
              requires: { prop: 'aria-label' },
            },
          },
        },
        slots: ['default'],
        snippet: '<rafters-button variant="primary">Save</rafters-button>',
      },
      // NOTE: no react/vue facet here -> manifest gap for those targets
    },
    composesWith: ['page-header'],
  },
  container: {
    kind: 'component',
    intel: {
      cognitiveLoad: 1,
      dos: ["as='article' flips prose typography"],
      nevers: ['No margins on children'],
    },
    vocab: { 'props.fill.vocab': ['surface', 'card', 'muted', 'primary', 'accent'] }, // #1637 words, verbatim
    facets: {
      astro: {
        props: {
          as: {
            type: 'enum',
            default: 'div',
            values: ['div', 'main', 'header', 'footer', 'section', 'article', 'aside'],
          },
          padding: { type: 'enum', values: ['0', '1', '2', '4', '8', '16', '20', '24'] },
          gap: { type: 'boolean' },
          fill: {
            type: 'grammar',
            grammar: ['word', 'word/alpha', 'word-to-word'],
            vocab: 'container.props.fill.vocab',
            onInvalid: 'silent-noop',
            default: 'transparent',
          },
          background: { type: 'string', deprecatedFor: 'fill' },
        },
        slots: ['default'],
        snippet: '<Container as="article" padding="4"><slot /></Container>',
      },
    },
  },
  // available (not installed on silvius) composites/components for edges + intent
  'page-header': {
    kind: 'composite',
    intel: { cognitiveLoad: 3, dos: ['Title + actions row'], nevers: [] },
    facets: {},
  },
  modal: {
    kind: 'component',
    intel: {
      cognitiveLoad: 4,
      dos: ['Blocking, focus-trapped'],
      nevers: ['Not for passive info'],
      semanticMeaning: 'blocks everything; sits above all; demands a decision',
    },
    facets: {},
  },
  alert: {
    kind: 'component',
    intel: {
      cognitiveLoad: 2,
      dos: ['Inline, non-blocking status'],
      nevers: ['Never traps focus'],
      semanticMeaning: 'inline attention; does not block; passive notice',
    },
    facets: {},
  },
};

// ---- workspace overlay (silvius.me): thin, per-workspace, NOT in the graph --
interface Ctx {
  target: Target;
  installed: Set<string>;
}
const SILVIUS: Ctx = {
  target: 'astro',
  installed: new Set(['badge', 'button', 'card', 'container', 'grid', 'separator', 'typography']),
};
const LEGION: Ctx = { target: 'wc', installed: new Set(['button', 'container', 'dialog']) };

const presenceOf = (id: string, ctx: Ctx): Presence =>
  ctx.installed.has(id) ? 'installed' : 'available';

// ---- the resolver: describe(addr, ctx) --------------------------------------
function describe(addr: string, ctx: Ctx): unknown {
  const parts = addr === '' ? [] : addr.split('.');

  // describe()  -> the surface: installed roster
  if (parts.length === 0) {
    return { workspace: 'sean.silvius.me', target: ctx.target, installed: [...ctx.installed] };
  }

  // describe(components|composites) -> kind roster, presence-tagged from overlay
  if (parts[0] === 'components' || parts[0] === 'composites') {
    const kind: Kind = parts[0] === 'components' ? 'component' : 'composite';
    return Object.entries(GRAPH)
      .filter(([, n]) => n.kind === kind)
      .map(([id]) => ({ id, presence: presenceOf(id, ctx) }));
  }

  // intent door: a natural-language question (has a space) routes over intel
  if (addr.includes(' ')) return intent(addr);

  const node = GRAPH[parts[0]];
  if (!node) return { error: `unknown node: ${parts[0]}` };

  // describe(button) -> LAYER 0: intel + type-marked children, presence + target stamped from overlay
  if (parts.length === 1) {
    const facet = node.facets[ctx.target];
    return {
      id: parts[0],
      kind: node.kind,
      target: ctx.target, // echoed, so a misresolve is catchable
      presence: presenceOf(parts[0], ctx),
      rendersForTarget: Boolean(facet), // manifest axis: is there a facet for my target?
      intel: node.intel,
      children: facet
        ? [
            ...Object.entries(facet.props).map(([name, p]) => ({
              addr: `${parts[0]}.props.${name}`,
              type: (p as Prop).type,
              ...((p as { deprecatedFor?: string }).deprecatedFor
                ? { note: `deprecated -> ${(p as { deprecatedFor?: string }).deprecatedFor}` }
                : {}),
            })),
            ...(facet.slots ? [{ addr: `${parts[0]}.slots`, type: 'slots' as const }] : []),
            { addr: `${parts[0]}.snippet`, type: 'leaf' as const },
            ...(node.composesWith
              ? [{ addr: `${parts[0]}.composesWith`, type: 'edge' as const }]
              : []),
          ]
        : [{ note: `no ${ctx.target} facet -- manifest gap` }],
    };
  }

  // describe(button.composesWith) -> edge resolves to TARGET's layer-0 only (bounded)
  if (parts[1] === 'composesWith') {
    return (node.composesWith ?? []).map((t) => describe(t, ctx));
  }
  if (parts[1] === 'snippet') return node.facets[ctx.target]?.snippet ?? null;
  if (parts[1] === 'slots') return node.facets[ctx.target]?.slots ?? null;

  // describe(button.props.variant) -> the prop node (enum inline; grammar drillable)
  if (parts[1] === 'props') {
    const facet = node.facets[ctx.target];
    const prop = facet?.props[parts[2]];
    if (!prop) return { error: `unknown prop: ${addr}` };
    if (parts.length === 3) return prop;
    // describe(container.props.fill.vocab) -> terminal leaf: real tokens verbatim
    if (parts[3] === 'vocab' && prop.type === 'grammar')
      return { type: 'leaf', values: node.vocab?.[prop.vocab] ?? [] };
    return { error: `cannot drill: ${addr}` };
  }

  return { error: `cannot resolve: ${addr}` };
}

// intent router: match the need against semanticMeaning; return pick + near-miss counter
function intent(question: string): unknown {
  const q = question.toLowerCase();
  const wantsAbove = /above|everything|block|on top|over all/.test(q);
  if (wantsAbove) {
    return {
      use: 'modal',
      not: 'alert',
      because: 'above-everything = blocking + focus-trap (modal); alert is inline, non-blocking',
    };
  }
  return { note: 'no route matched; describe(components) to browse' };
}

// ---- demo -------------------------------------------------------------------
const show = (label: string, v: unknown) =>
  console.log(`\n> ${label}\n${JSON.stringify(v, null, 2)}`);

console.log('=== silvius.me (target: astro) ===');
show('describe()', describe('', SILVIUS));
show('describe(components)', describe('components', SILVIUS)); // presence-tagged roster
show('describe(button)', describe('button', SILVIUS)); // layer 0: type-marked children, target+presence stamped
show('describe(button.props.size)', describe('button.props.size', SILVIUS)); // enum + STRUCTURED constraint
show('describe(container.props.fill)', describe('container.props.fill', SILVIUS)); // grammar node, drillable vocab
show('describe(container.props.fill.vocab)', describe('container.props.fill.vocab', SILVIUS)); // leaf tokens verbatim
show('describe(button.composesWith)', describe('button.composesWith', SILVIUS)); // edge -> available node layer-0
show(
  'describe("what do I use when it needs to be above everything")',
  describe('what do I use when it needs to be above everything', SILVIUS),
);

console.log('\n\n=== legion (target: wc) -- SAME node, target flips the facet ===');
show('describe(button)', describe('button', LEGION)); // wc: kebab attributes, no id, wc presence
show('describe(button.snippet)', describe('button.snippet', LEGION)); // <rafters-button ...>, not astro/react
show(
  'describe(button) on react (manifest gap)',
  describe('button', { target: 'react', installed: new Set(['button']) }),
);
