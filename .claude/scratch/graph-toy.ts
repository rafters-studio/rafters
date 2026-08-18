/**
 * Graph toy -- the rafters intel graph + `.`/`*`/`?` resolver, built from
 * sean.silvius.me's ACTUAL installed set (badge, button, card, container, grid,
 * separator, typography). A prototype to SEE the design decisions, not the real
 * thing: button/container carry real vocabulary; the rest are sketched.
 *
 * Design decisions this demonstrates:
 *   - one intel GRAPH (separate from the token DAG), assembled in-memory
 *   - nodes tagged by presence (installed | available) for THIS workspace
 *   - `.` walks, `*` fans an edge set, `?` resolves a node to data
 *   - a bare node = layer 0 = intel + top layer (child addresses), never a `?`
 *   - a cross-kind edge resolves to the target's LAYER 0 only (bounded, cycle-safe)
 *
 * Run: pnpm exec tsx .claude/scratch/graph-toy.ts
 */

type Presence = 'installed' | 'available' | 'absent';
type NodeKind = 'component' | 'composite' | 'primitive';

interface Intel {
  cognitiveLoad: number;
  dos: string[];
  nevers: string[];
  a11y?: string;
}

interface Prop {
  type: 'enum' | 'boolean' | 'string' | 'number' | 'node';
  values?: string[]; // literal union, verbatim -- the className killer
  default?: string;
  required?: boolean;
  deprecatedFor?: string; // e.g. background -> fill
  constraint?: string; // machine-readable cross-part rule
}

interface Node {
  id: string;
  kind: NodeKind;
  presence: Presence;
  intel: Intel;
  props: Record<string, Prop>;
  snippet?: string; // render-correct, target-keyed (astro here)
  // typed graph edges (cross-kind, cycle-safe on traversal)
  composesWith?: string[]; // component -> composite
  contains?: string[]; // composite -> component
  dependsOn?: string[]; // -> primitive
}

// ---- the workspace (sean.silvius.me) ----------------------------------------
const TARGET = 'astro';
const INSTALLED = ['badge', 'button', 'card', 'container', 'grid', 'separator', 'typography'];

// ---- the graph (assembled at "startup" -- here, a literal) ------------------
const NODES: Node[] = [
  {
    id: 'button',
    kind: 'component',
    presence: 'installed',
    intel: {
      cognitiveLoad: 2,
      dos: ['One primary action per view', 'Use `label` + slot for content in astro'],
      nevers: ['Never bolt a className for color -- use `variant`'],
      a11y: 'icon-* sizes require an accessible name',
    },
    props: {
      variant: {
        type: 'enum',
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
        default: 'default',
      },
      size: {
        type: 'enum',
        values: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
        default: 'default',
        constraint: 'size starts with "icon" => aria-label required',
      },
      id: { type: 'string', required: true }, // astro facet requires id
    },
    snippet: '<Button id="save" variant="primary">Save</Button>',
    composesWith: ['page-header'], // -> an AVAILABLE (not installed) composite
    dependsOn: ['classy', 'pressable'],
  },
  {
    id: 'container',
    kind: 'component',
    presence: 'installed',
    intel: {
      cognitiveLoad: 1,
      dos: ['Owns spacing via padding/gap', "as='article' flips prose typography"],
      nevers: ['Never put margins on children -- Container owns spacing'],
      a11y: 'the semantic `as` element carries the landmark',
    },
    props: {
      as: {
        type: 'enum',
        values: ['div', 'main', 'header', 'footer', 'section', 'article', 'aside'],
        default: 'div',
      },
      size: {
        type: 'enum',
        values: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full'],
      },
      padding: { type: 'enum', values: ['0', '1', '2', '4', '8', '16', '20', '24'] },
      gap: { type: 'boolean' },
      fill: {
        type: 'string',
        constraint:
          'grammar: word | word/alpha | word-to-word over color vocab; invalid => silent no-op',
      },
      background: { type: 'string', deprecatedFor: 'fill' },
    },
    snippet: '<Container as="article" size="lg" padding="4"><slot /></Container>',
    dependsOn: ['classy', 'fill-resolver'],
  },
  // sketched installed nodes (intel + a prop or two, enough to show the shape)
  {
    id: 'badge',
    kind: 'component',
    presence: 'installed',
    intel: { cognitiveLoad: 1, dos: ['Status/label only'], nevers: ['Not a button'] },
    props: {
      variant: {
        type: 'enum',
        values: ['default', 'muted', 'success', 'warning', 'destructive'],
        default: 'default',
      },
    },
  },
  {
    id: 'card',
    kind: 'component',
    presence: 'installed',
    intel: {
      cognitiveLoad: 2,
      dos: ['Compound: header/title/content/footer'],
      nevers: ['No manual wrapper divs'],
    },
    props: { fill: { type: 'string', constraint: 'color grammar' } },
    composesWith: ['page-header'],
  },
  {
    id: 'grid',
    kind: 'component',
    presence: 'installed',
    intel: {
      cognitiveLoad: 2,
      dos: ['1-12 column vocabulary'],
      nevers: ['No raw CSS grid classes'],
    },
    props: { columns: { type: 'number' }, gap: { type: 'boolean' } },
  },
  {
    id: 'separator',
    kind: 'component',
    presence: 'installed',
    intel: { cognitiveLoad: 1, dos: ['Visual/semantic divide'], nevers: [] },
    props: {
      orientation: { type: 'enum', values: ['horizontal', 'vertical'], default: 'horizontal' },
    },
  },
  {
    id: 'typography',
    kind: 'component',
    presence: 'installed',
    intel: {
      cognitiveLoad: 1,
      dos: ['Type roles, not raw sizes'],
      nevers: ['No text-* utilities'],
    },
    props: { as: { type: 'enum', values: ['h1', 'h2', 'h3', 'p', 'small', 'code'] } },
  },
  // an AVAILABLE composite the site has NOT installed -- shows the presence boundary
  {
    id: 'page-header',
    kind: 'composite',
    presence: 'available',
    intel: { cognitiveLoad: 3, dos: ['Title + actions row'], nevers: ['Not for in-page nav'] },
    props: {},
    contains: ['container', 'typography', 'button'],
  },
];

const BY_ID = new Map(NODES.map((n) => [n.id, n]));

// ---- the resolver: `.` walk, `*` fan, `?` resolve --------------------------

/** Layer 0: intel + the top layer (child addresses). Cheap; never behind `?`. */
function layer0(n: Node) {
  const propAddrs = Object.keys(n.props).map((p) => `props.${p}`);
  const edgeAddrs = [
    ...(n.composesWith ? ['composesWith'] : []),
    ...(n.contains ? ['contains'] : []),
    ...(n.dependsOn ? ['dependsOn'] : []),
    ...(n.snippet ? ['snippet'] : []),
  ];
  return {
    id: n.id,
    kind: n.kind,
    presence: n.presence,
    intel: n.intel, // intel is layer 0, always
    top: [...propAddrs, ...edgeAddrs], // the addresses you can drill with `?`
  };
}

/** Resolve one selector string against the graph, scoped to the workspace. */
function resolve(selector: string, seen = new Set<string>()): unknown {
  const wantData = selector.endsWith('?');
  const path = (wantData ? selector.slice(0, -1) : selector).split('.');
  const [rootId, ...rest] = path;
  const node = BY_ID.get(rootId);
  if (!node) return { error: `unknown node: ${rootId}` };

  // bare node, no `?`  ->  layer 0 (structure + intel). Discovery.
  if (rest.length === 0 && !wantData) return layer0(node);
  // bare node WITH `?` -> the default-expanded node (intel + props + snippet), no source
  if (rest.length === 0 && wantData) {
    return { ...layer0(node), props: node.props, snippet: node.snippet };
  }

  // edges: resolve to the TARGET's layer 0 only (bounded, cycle-safe)
  const edgeKinds = ['composesWith', 'contains', 'dependsOn'] as const;
  if (edgeKinds.includes(rest[0] as (typeof edgeKinds)[number])) {
    if (seen.has(node.id)) return { ref: node.id, note: 'cycle -- stopped' };
    seen.add(node.id);
    const targets = (node[rest[0] as (typeof edgeKinds)[number]] ?? []) as string[];
    return targets.map((t) => {
      const tn = BY_ID.get(t);
      return tn ? layer0(tn) : { id: t, presence: 'absent' as Presence };
    });
  }

  // `*` fan: every prop, collect the addressed leaf from each
  if (rest[0] === 'props' && rest[1] === '*') {
    const leaf = rest[2]; // e.g. 'list' | 'default'
    const out: Record<string, unknown> = {};
    for (const [name, p] of Object.entries(node.props)) {
      out[name] = leaf === 'list' ? p.values : (p as Record<string, unknown>)[leaf];
    }
    return out;
  }

  // ordinary walk into props.<name>.<leaf>
  if (rest[0] === 'props') {
    const p = node.props[rest[1]];
    if (!p) return { error: `unknown prop: ${node.id}.${rest[1]}` };
    if (rest.length === 2) return wantData ? p : Object.keys(p); // prop node
    const leaf = rest[2] === 'list' ? p.values : (p as Record<string, unknown>)[rest[2]];
    return leaf;
  }
  if (rest[0] === 'snippet') return node.snippet;

  return { error: `cannot resolve: ${selector}` };
}

// ---- demo -------------------------------------------------------------------
const show = (q: string) => console.log(`\n> ${q}\n${JSON.stringify(resolve(q), null, 2)}`);

console.log(
  `workspace: sean.silvius.me  target: ${TARGET}  installed: ${INSTALLED.length} components`,
);
show('button'); // layer 0: intel + top (addresses)
show('button.props.variant.list?'); // the 12 variants -- the leaf
show('button.props.*.list?'); // `*` fan: every prop's vocabulary at once
show('button.props.size.constraint?'); // the icon->aria-label rule
show('container.props.background?'); // deprecated -> fill, surfaced inline
show('button.composesWith?'); // edge -> AVAILABLE composite's layer 0 (presence boundary)
show('page-header.contains?'); // composite -> its components' layer 0
