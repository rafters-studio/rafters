/**
 * Per-target facets, read from the source a registry item already serves.
 *
 * The registry stopped emitting facets in #2346; a prop surface is the graph's to
 * resolve. Everything needed is in `files[].content`: the target's own `Props`
 * declaration, plus the behavior and lib files its types come from.
 *
 * This reads TypeScript declarations with a small scanner rather than the compiler:
 * a rafters install does not bring typescript, and `.astro` is not TypeScript at all.
 * It reads only what a component declares. Attributes inherited from the platform
 * (`React.HTMLAttributes`, `HTMLAttributes<'div'>`) are not listed.
 */

import type { ComponentTarget, Facet, PropField, RegistryItem } from '../registry/types.js';

type Facets = Partial<Record<ComponentTarget, Facet>>;

type Declaration =
  | { kind: 'interface'; bases: string[]; body: string }
  | { kind: 'alias'; expr: string }
  | { kind: 'values'; values: string[] };

type Declarations = Map<string, Declaration>;

/** One prop as declared: the type text is read into a `PropField` only once it is final. */
interface Member {
  optional: boolean;
  typeExpr: string;
}

type Members = Map<string, Member>;

const OPENERS = '{[(<';
const CLOSERS = '}])>';
/** A quoted string in stripped source ends at its line, so an apostrophe in JSX text is harmless. */
const STRING_LITERAL = /^'([^'\n]*)'$|^"([^"\n]*)"$/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

/** Drop comments, leaving strings intact: a comment may mention `interface Props {`. */
function stripComments(source: string): string {
  let out = '';
  for (let i = 0; i < source.length; i++) {
    const ch = source.charAt(i);
    const next = source.charAt(i + 1);
    if (ch === "'" || ch === '"' || ch === '`') {
      let end = i + 1;
      while (end < source.length && source.charAt(end) !== ch) {
        if (ch !== '`' && source.charAt(end) === '\n') break;
        end += source.charAt(end) === '\\' ? 2 : 1;
      }
      out += source.slice(i, end + 1);
      i = end;
    } else if (ch === '/' && next === '/') {
      while (i < source.length && source.charAt(i) !== '\n') i++;
      out += '\n';
    } else if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 1;
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Walk `text` from `start`, calling `visit` at every character outside quotes with the
 * bracket depth there. `visit` returns true to stop. Returns the stopping index, or the
 * length of `text`. The `>` of an arrow is not a closing bracket.
 */
function scan(text: string, start: number, visit: (i: number, depth: number) => boolean): number {
  let depth = 0;
  let i = start;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (ch === "'" || ch === '"' || ch === '`') {
      const close = text.indexOf(ch, i + 1);
      i = close === -1 ? text.length : close + 1;
      continue;
    }
    if (CLOSERS.includes(ch) && !(ch === '>' && text.charAt(i - 1) === '=')) depth--;
    if (visit(i, depth)) return i;
    if (OPENERS.includes(ch)) depth++;
    i++;
  }
  return text.length;
}

/** Split on a separator that sits outside every bracket. Empty pieces are dropped. */
function splitTop(text: string, separator: string): string[] {
  const pieces: string[] = [];
  let from = 0;
  scan(text, 0, (i, depth) => {
    if (depth === 0 && text.charAt(i) === separator) {
      pieces.push(text.slice(from, i));
      from = i + 1;
    }
    return false;
  });
  pieces.push(text.slice(from));
  return pieces.map((piece) => piece.trim()).filter((piece) => piece.length > 0);
}

/** The text between the bracket at `open` and its match. */
function bracketBody(text: string, open: number): string {
  const close = scan(text, open, (i, depth) => i > open && depth === 0);
  return text.slice(open + 1, close);
}

function literalsIn(text: string): string[] {
  return [...text.matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)].map((m) => m[1] ?? m[2] ?? '');
}

/** Every interface, type alias and `as const` list a source declares. */
function declarationsIn(source: string): Declarations {
  const found: Declarations = new Map();
  for (const m of source.matchAll(/\binterface\s+(\w+)\s*(?:<[^{]*?>)?\s*(extends\b)?/g)) {
    const name = m[1];
    if (!name || found.has(name)) continue;
    const headEnd = m.index + m[0].length;
    const open = scan(source, headEnd, (i, depth) => depth === 0 && source.charAt(i) === '{');
    found.set(name, {
      kind: 'interface',
      bases: m[2] ? splitTop(source.slice(headEnd, open), ',') : [],
      body: bracketBody(source, open),
    });
  }
  for (const m of source.matchAll(/\btype\s+(\w+)\s*(?:<[^=]*?>)?\s*=/g)) {
    const name = m[1];
    if (!name || found.has(name)) continue;
    const from = m.index + m[0].length;
    const end = scan(source, from, (i, depth) => depth === 0 && source.charAt(i) === ';');
    found.set(name, { kind: 'alias', expr: source.slice(from, end).trim() });
  }
  for (const m of source.matchAll(/\bconst\s+(\w+)\s*=\s*\[([^\]]*)\]\s*as\s+const/g)) {
    const name = m[1];
    if (!name || found.has(name)) continue;
    const values = splitTop(m[2] ?? '', ',').map((entry) => entry.replace(/^['"]|['"]$/g, ''));
    found.set(name, { kind: 'values', values });
  }
  for (const m of source.matchAll(/\bconst\s+(\w+)\s*=\s*\{/g)) {
    const name = m[1];
    if (!name || found.has(name)) continue;
    const body = bracketBody(source, m.index + m[0].length - 1);
    const keys = splitTop(body, ',').map((entry) => entry.match(/^['"]?([\w-]+)['"]?\s*:/)?.[1]);
    found.set(name, { kind: 'values', values: keys.filter((key) => key !== undefined) });
  }
  return found;
}

/** Resolves a type name: the file's own declarations, then its item's, then the catalog's. */
type Lookup = (name: string) => Declaration | undefined;

function membersOfBody(body: string): Members {
  const members: Members = new Map();
  for (const entry of splitTop(body, ';')) {
    const prop = entry.match(/^(?:readonly\s+)?(?:'([^']+)'|"([^"]+)"|([\w$]+))(\?)?\s*(:|\()/);
    const name = prop?.[1] ?? prop?.[2] ?? prop?.[3];
    if (!prop || !name) continue;
    // A method signature's type is a function, which is all the facet needs to know.
    const typeExpr = prop[5] === ':' ? entry.slice(prop[0].length).trim() : '() => void';
    members.set(name, { optional: prop[4] === '?', typeExpr });
  }
  return members;
}

/** A prop in only some arms of a union is optional; one every arm requires is required. */
function mergeUnion(arms: Members[]): Members {
  const merged: Members = new Map();
  for (const arm of arms) {
    for (const [name, member] of arm) {
      const inAll = arms.every((other) => other.has(name));
      const requiredInAll = arms.every((other) => other.get(name)?.optional === false);
      const earlier = merged.get(name);
      merged.set(name, {
        typeExpr: earlier ? `${earlier.typeExpr} | ${member.typeExpr}` : member.typeExpr,
        optional: !inAll || !requiredInAll,
      });
    }
  }
  return merged;
}

/** The props a type expression declares. A name nothing declares (a platform type) has none. */
function membersOf(expr: string, lookup: Lookup, seen: ReadonlySet<string>): Members {
  const text = expr.trim();
  const union = splitTop(text, '|');
  if (union.length > 1) return mergeUnion(union.map((arm) => membersOf(arm, lookup, seen)));
  const intersection = splitTop(text, '&');
  if (intersection.length > 1) {
    const merged: Members = new Map();
    for (const part of intersection) {
      for (const [name, member] of membersOf(part, lookup, seen)) {
        if (!merged.has(name)) merged.set(name, member);
      }
    }
    return merged;
  }
  if (text.startsWith('(') && text.endsWith(')')) {
    return membersOf(text.slice(1, -1), lookup, seen);
  }
  if (text.startsWith('{')) return membersOfBody(bracketBody(text, 0));

  const generic = text.match(/^(\w+)\s*</);
  if (generic?.[1] && generic.index === 0) {
    const args = splitTop(bracketBody(text, generic[0].length - 1), ',');
    const inner = args[0] ? membersOf(args[0], lookup, seen) : new Map<string, Member>();
    const keys = literalsIn(args[1] ?? '');
    if (generic[1] === 'Omit') {
      return new Map([...inner].filter(([name]) => !keys.includes(name)));
    }
    if (generic[1] === 'Pick') return new Map([...inner].filter(([name]) => keys.includes(name)));
    if (generic[1] === 'Partial') {
      return new Map([...inner].map(([name, m]) => [name, { ...m, optional: true }]));
    }
    return inner;
  }

  if (seen.has(text)) return new Map();
  const declared = lookup(text);
  if (declared === undefined || declared.kind === 'values') return new Map();
  const nextSeen = new Set(seen).add(text);
  if (declared.kind === 'alias') return membersOf(declared.expr, lookup, nextSeen);
  const members = membersOfBody(declared.body);
  for (const base of declared.bases) {
    for (const [name, member] of membersOf(base, lookup, nextSeen)) {
      if (!members.has(name)) members.set(name, member);
    }
  }
  return members;
}

/** `[...BUTTON_ICON_SIZES, ...BUTTON_TEXT_SIZES]` -> the lists it spreads. */
function expandSpreads(values: string[], lookup: Lookup): string[] {
  return values.flatMap((value) => {
    if (!value.startsWith('...')) return [value];
    const spread = lookup(value.slice(3));
    return spread?.kind === 'values' ? expandSpreads(spread.values, lookup) : [];
  });
}

/**
 * What one type arm allows: literal values, or a primitive kind. Undefined for anything
 * else (a function, an array, an object, a platform type).
 */
function armShape(
  arm: string,
  lookup: Lookup,
  seen: ReadonlySet<string>,
): { values: string[] } | { kind: 'string' | 'number' | 'boolean' } | undefined {
  const text = arm.trim();
  const quoted = text.match(STRING_LITERAL);
  if (quoted) return { values: [quoted[1] ?? quoted[2] ?? ''] };
  if (NUMERIC.test(text)) return { values: [text] };
  if (text === 'string' || text === 'number' || text === 'boolean') return { kind: text };
  if (text === 'true' || text === 'false') return { kind: 'boolean' };
  if (text === 'string & {}') return { kind: 'string' };
  const fromConst = text.match(/^\(typeof\s+(\w+)\)\[number\]$|^keyof\s+typeof\s+(\w+)$/);
  if (fromConst) {
    const declared = lookup(fromConst[1] ?? fromConst[2] ?? '');
    return declared?.kind === 'values'
      ? { values: expandSpreads(declared.values, lookup) }
      : undefined;
  }
  if (text.startsWith('(') && text.endsWith(')')) {
    return typeShape(text.slice(1, -1), lookup, seen);
  }
  const indexed = text.match(/^(\w+)\['([^']+)'\]$/);
  if (indexed?.[1] && indexed[2]) {
    const member = membersOf(indexed[1], lookup, new Set()).get(indexed[2]);
    return member && typeShape(member.typeExpr, lookup, seen);
  }
  if (!/^\w+$/.test(text) || seen.has(text)) return undefined;
  const declared = lookup(text);
  if (declared?.kind !== 'alias') return undefined;
  return typeShape(declared.expr, lookup, new Set(seen).add(text));
}

function typeShape(
  expr: string,
  lookup: Lookup,
  seen: ReadonlySet<string>,
): { values: string[] } | { kind: 'string' | 'number' | 'boolean' } | undefined {
  const arms = splitTop(expr, '|').filter((arm) => arm !== 'undefined' && arm !== 'null');
  const shapes = arms.map((arm) => armShape(arm, lookup, seen));
  const known = shapes.filter((shape) => shape !== undefined);
  if (known.length === 0 || known.length !== shapes.length) return undefined;
  const kinds = new Set(known.map((shape) => ('kind' in shape ? shape.kind : undefined)));
  if (kinds.size === 1) {
    const [kind] = kinds;
    if (kind !== undefined) return { kind };
    return { values: [...new Set(known.flatMap((s) => ('values' in s ? s.values : [])))] };
  }
  // A literal beside its open primitive (`'auto' | string`) is that primitive.
  if (kinds.has('string')) return { kind: 'string' };
  if (kinds.has('number') && !kinds.has('boolean')) return { kind: 'number' };
  return undefined;
}

/**
 * A prop's field. A type with no literal domain and no primitive kind is an enum with no
 * values: the schema's honest "no known value domain", never a fabricated list.
 */
function fieldOf(member: Member, fallback: string | undefined, lookup: Lookup): PropField {
  const shape = typeShape(member.typeExpr, lookup, new Set());
  const required = member.optional || fallback !== undefined ? {} : { required: true };
  if (shape !== undefined && 'kind' in shape) {
    if (shape.kind === 'boolean') {
      return fallback === 'true' || fallback === 'false'
        ? { type: 'boolean', default: fallback === 'true' }
        : { type: 'boolean', ...required };
    }
    if (shape.kind === 'number') {
      return fallback !== undefined && NUMERIC.test(fallback)
        ? { type: 'number', default: Number(fallback) }
        : { type: 'number', ...required };
    }
    return fallback !== undefined
      ? { type: 'string', default: fallback }
      : { type: 'string', ...required };
  }
  const values = shape?.values ?? [];
  return fallback !== undefined
    ? { type: 'enum', values, default: fallback }
    : { type: 'enum', values, ...required };
}

/** `{ size = 'default', 'aria-label': ariaLabel, as: Tag = 'div' }` -> prop -> literal default. */
function defaultsIn(pattern: string): Map<string, string> {
  const defaults = new Map<string, string>();
  for (const binding of splitTop(pattern, ',')) {
    const m = binding.match(/^['"]?([\w$-]+)['"]?\s*(?::\s*[\w$]+\s*)?=\s*(.+)$/s);
    if (!m?.[1] || m[2] === undefined) continue;
    const value = m[2].trim();
    const quoted = value.match(STRING_LITERAL);
    if (quoted) defaults.set(m[1], quoted[1] ?? quoted[2] ?? '');
    else if (value === 'true' || value === 'false' || NUMERIC.test(value)) {
      defaults.set(m[1], value);
    }
  }
  return defaults;
}

function astroDefaults(source: string): Map<string, string> {
  const at = source.search(/\}\s*=\s*Astro\.props/);
  if (at === -1) return new Map();
  const open = source.lastIndexOf('const {', at) + 'const '.length;
  return defaultsIn(bracketBody(source, open));
}

/** The destructured parameter of `function Tag({ ... })` or `Tag = forwardRef<...>(({ ... })`. */
function reactDefaults(source: string, tag: string): Map<string, string> {
  const start = source.match(
    new RegExp(`(?:function\\s+${tag}\\s*(?:<[^(]*>)?\\(|const\\s+${tag}\\b[^\\n]*?\\(\\()\\s*\\{`),
  );
  if (!start) return new Map();
  return defaultsIn(bracketBody(source, (start.index ?? 0) + start[0].length - 1));
}

function pascalCase(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * The component a `.tsx` exports for an item: the export whose name is the item's name
 * ignoring case (`input-otp` -> `InputOTP`), else the default export (`resizable` ->
 * `ResizablePanelGroup`).
 */
function reactExport(source: string, name: string): string | undefined {
  const wanted = name.replaceAll('-', '').toLowerCase();
  const exported = [
    ...source.matchAll(/export\s+(?:function|const)\s+([A-Z]\w*)/g),
    ...source.matchAll(/export\s*\{([^}]*)\}/g),
  ].flatMap((m) => (m[1] ?? '').split(',').map((part) => part.trim().split(/\s+/).pop() ?? ''));
  return (
    exported.find((id) => id.toLowerCase() === wanted) ??
    source.match(/export\s+default\s+([A-Z]\w*)/)?.[1]
  );
}

/** A value that satisfies a required prop in a snippet, as a JSX attribute. */
function requiredAttribute(propName: string, field: PropField, typeExpr: string, id: string) {
  if (field.type === 'string') return `${propName}="${propName === 'id' ? id : propName}"`;
  if (field.type === 'boolean') return propName;
  if (field.type === 'number') return `${propName}={0}`;
  if (field.type !== 'enum') return propName;
  const [first] = field.values;
  if (first !== undefined) {
    return NUMERIC.test(first) ? `${propName}={${first}}` : `${propName}="${first}"`;
  }
  if (typeExpr.includes('=>')) return `${propName}={() => {}}`;
  if (typeExpr.includes('ReactNode')) return `${propName}="${propName}"`;
  return `${propName}={${/\[\]$|^(readonly\s+)?Array</.test(typeExpr) ? '[]' : '{}'}}`;
}

function usage(tag: string, attributes: string[], takesContent: boolean): string {
  const open = [tag, ...attributes].join(' ');
  return takesContent ? `<${open}>Content</${tag}>` : `<${open} />`;
}

function buildFacet(
  name: string,
  target: 'react' | 'astro',
  rawSource: string,
  itemLookup: Lookup,
  astroTakesContent: boolean,
): Facet | undefined {
  const stripped = stripComments(rawSource);
  const fence = target === 'astro' ? stripped.match(/^\s*---\n([\s\S]*?)\n---/) : null;
  const source = fence?.[1] ?? stripped;

  const own = declarationsIn(source);
  const lookup: Lookup = (typeName) => own.get(typeName) ?? itemLookup(typeName);
  const tag = target === 'astro' ? pascalCase(name) : reactExport(source, name);
  if (tag === undefined) return undefined;

  const members = membersOf(target === 'astro' ? 'Props' : `${tag}Props`, lookup, new Set());
  const defaults = target === 'astro' ? astroDefaults(source) : reactDefaults(source, tag);

  const props: Record<string, PropField> = {};
  const attributes: string[] = [];
  for (const [propName, member] of members) {
    const field = fieldOf(member, defaults.get(propName), lookup);
    props[propName] = field;
    const required = field.type !== 'grammar' && field.type !== 'deprecated' && field.required;
    if (required && propName !== 'children') {
      attributes.push(requiredAttribute(propName, field, member.typeExpr, name));
    }
  }

  const slots = new Set<string>();
  if (target === 'astro') {
    for (const m of stripped.matchAll(/<slot\s+name="([^"]+)"/g)) {
      if (m[1]) slots.add(m[1]);
    }
    if (/<slot(?![^>]*\bname=)[\s/>]/.test(stripped)) slots.add('default');
  } else if (/\bchildren\b/.test(source) || astroTakesContent) {
    // A React component can pass children through `...props` without naming them, so
    // its Astro performance's default slot speaks for it too. A void one has neither.
    slots.add('default');
  }

  const element = usage(tag, attributes, slots.has('default'));
  const snippet =
    target === 'astro'
      ? `---\nimport ${tag} from '@/components/ui/${name}.astro';\n---\n\n${element}`
      : `import { ${tag} } from '@/components/ui/${name}';\n\n${element}`;

  const facet: Facet = { props, snippet };
  if (slots.size > 0) facet.slots = [...slots];
  return facet;
}

/**
 * Returns the function that reads an item's facets. Types resolve through the item's own
 * files first, then through every `.ts` file the catalog serves, because a component's
 * score can extend one in `lib/` (`ButtonConfig extends PressableConfig`).
 */
export function facetReader(items: RegistryItem[]): (item: RegistryItem) => Facets {
  let catalog: Declarations | undefined;
  const catalogLookup: Lookup = (typeName) => {
    if (catalog === undefined) {
      catalog = new Map();
      for (const item of items) {
        for (const file of item.files) {
          if (!file.path.endsWith('.ts')) continue;
          for (const [name, declared] of declarationsIn(stripComments(file.content))) {
            if (!catalog.has(name)) catalog.set(name, declared);
          }
        }
      }
    }
    return catalog.get(typeName);
  };

  return (item) => {
    const scripts = new Map<string, Declaration>();
    for (const file of item.files) {
      if (!file.path.endsWith('.ts')) continue;
      for (const [name, declared] of declarationsIn(stripComments(file.content))) {
        if (!scripts.has(name)) scripts.set(name, declared);
      }
    }
    const lookup: Lookup = (typeName) => scripts.get(typeName) ?? catalogLookup(typeName);

    const sourceOf = (extension: string) =>
      item.files.find((f) => f.path === `components/ui/${item.name}.${extension}`)?.content;
    const facets: Facets = {};
    const astroSource = sourceOf('astro');
    const astro = astroSource && buildFacet(item.name, 'astro', astroSource, lookup, false);
    if (astro) facets.astro = astro;
    const reactSource = sourceOf('tsx');
    const takesContent = astro ? (astro.slots ?? []).includes('default') : false;
    const react = reactSource && buildFacet(item.name, 'react', reactSource, lookup, takesContent);
    if (react) facets.react = react;
    return facets;
  };
}
