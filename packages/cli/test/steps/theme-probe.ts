/**
 * The theme mapping probe (#2825): reads a sheet Tailwind compiled and follows
 * each declaration's var() chain the way the browser would, so a test can say
 * whether a utility reaches its token through `--rafters-<token>`.
 *
 * Pure: no step definitions and no test runner, so playwright-bdd can load it
 * with the step files and vitest can test it on its own.
 */

import type { ThemeMappingRow } from '@rafters/design-tokens';
import * as csstree from 'css-tree';

/** One declaration of a utility rule, with the queries it sits in. */
export interface UtilityDeclaration {
  property: string;
  value: string;
  conditions: string[];
}

/** The parts of a compiled sheet the probe reads. */
export interface CompiledSheet {
  /** Custom properties declared on `:root` / `:host`, outside any dark scope. */
  root: Map<string, string>;
  /** Custom properties the project's dark mode declares (`.dark`, or the media query). */
  dark: Map<string, string>;
  /** Every rule's declarations, by the class it selects (unescaped). */
  rules: Map<string, UtilityDeclaration[][]>;
  /** The declarations of each rule in the base layer whose selector starts with `article`. */
  article: UtilityDeclaration[][];
}

/** What a value resolved to, and the custom properties it passed through. */
export interface Resolution {
  text: string;
  chain: string[];
  /** Properties a var() names that nothing declares (other than `--tw-*`). */
  undeclared: string[];
}

function unescapeClass(name: string): string {
  return name.replace(/\\(.)/g, '$1');
}

function selectorClasses(prelude: csstree.CssNode): string[] {
  const classes: string[] = [];
  csstree.walk(prelude, {
    visit: 'ClassSelector',
    enter(node) {
      classes.push(unescapeClass(node.name));
    },
  });
  return classes;
}

function declarationsOf(block: csstree.Block, conditions: string[]): UtilityDeclaration[] {
  const out: UtilityDeclaration[] = [];
  for (const child of block.children) {
    if (child.type === 'Declaration') {
      out.push({
        property: child.property,
        value: csstree.generate(child.value).trim(),
        conditions,
      });
    } else if (child.type === 'Atrule' && child.block) {
      const prelude = child.prelude ? csstree.generate(child.prelude) : '';
      out.push(...declarationsOf(child.block, [...conditions, `@${child.name} ${prelude}`]));
    } else if (child.type === 'Rule' && child.block) {
      out.push(...declarationsOf(child.block, conditions));
    }
  }
  return out;
}

/** Parse a compiled sheet (minified or not) into what the probe reads. */
export function parseCompiled(css: string): CompiledSheet {
  const ast = csstree.parse(css, { parseCustomProperty: false, parseValue: false });
  const sheet: CompiledSheet = { root: new Map(), dark: new Map(), rules: new Map(), article: [] };

  const visit = (list: csstree.List<csstree.CssNode>, scope: string[]): void => {
    for (const node of list) {
      if (node.type === 'Atrule' && node.block) {
        const prelude = node.prelude ? csstree.generate(node.prelude) : '';
        visit(node.block.children, [...scope, `@${node.name} ${prelude}`]);
        continue;
      }
      if (node.type !== 'Rule') continue;
      const selector = csstree.generate(node.prelude);
      const inDarkMedia = scope.some((s) => s.includes('prefers-color-scheme:dark'));
      const decls = declarationsOf(node.block, []);
      const custom = decls.filter((d) => d.property.startsWith('--') && d.conditions.length === 0);
      if (/(^|,)\s*(:root|:host)\b/.test(selector) && !selector.includes('[')) {
        const target = inDarkMedia ? sheet.dark : sheet.root;
        for (const d of custom) target.set(d.property, d.value);
      } else if (selector.trim() === '.dark') {
        for (const d of custom) sheet.dark.set(d.property, d.value);
      }
      if (scope.some((s) => s.startsWith('@layer base')) && /^article\b/.test(selector.trim())) {
        sheet.article.push(decls);
      }
      for (const cls of selectorClasses(node.prelude)) {
        const rules = sheet.rules.get(cls) ?? [];
        rules.push(decls);
        sheet.rules.set(cls, rules);
      }
    }
  };
  visit((ast as csstree.StyleSheet).children, []);
  return sheet;
}

/** Split `var(--a, fallback)` at its top-level comma. */
function splitVar(inner: string): { name: string; fallback: string | null } {
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      return { name: inner.slice(0, i).trim(), fallback: inner.slice(i + 1).trim() };
    }
  }
  return { name: inner.trim(), fallback: null };
}

/** Every var() at any depth of a value, by the property it names. */
export function varNames(value: string): string[] {
  return [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1] ?? '');
}

/**
 * Where a custom property's value is computed. A property `:root` declares is
 * computed against `:root` and inherited; one the element itself declares (the
 * utility's own, or the dark scope's when the element is inside it) is
 * computed at the element.
 */
export interface Scope {
  locals: ReadonlyMap<string, string>;
  inDark: boolean;
}

const ROOT_SCOPE: Scope = { locals: new Map(), inDark: false };

/** Resolve every var() in `value` within `scope`. */
export function resolve(
  sheet: CompiledSheet,
  value: string,
  scope: Scope = ROOT_SCOPE,
): Resolution {
  const chain: string[] = [];
  const undeclared: string[] = [];

  const lookup = (name: string, at: Scope): { value: string; at: Scope } | null => {
    const local = at.locals.get(name);
    if (local !== undefined) return { value: local, at };
    if (at.inDark) {
      const dark = sheet.dark.get(name);
      if (dark !== undefined) return { value: dark, at: { locals: new Map(), inDark: true } };
    }
    const root = sheet.root.get(name);
    return root === undefined ? null : { value: root, at: ROOT_SCOPE };
  };

  const walk = (text: string, at: Scope, depth: number): string => {
    if (depth > 32) throw new Error(`var() chain too deep resolving ${value}`);
    let out = '';
    let i = 0;
    while (i < text.length) {
      const start = text.indexOf('var(', i);
      if (start === -1) {
        out += text.slice(i);
        break;
      }
      out += text.slice(i, start);
      let level = 0;
      let end = start + 3;
      for (; end < text.length; end++) {
        if (text[end] === '(') level++;
        else if (text[end] === ')' && --level === 0) break;
      }
      const { name, fallback } = splitVar(text.slice(start + 4, end));
      const found = lookup(name, at);
      if (found) {
        chain.push(name);
        out += walk(found.value, found.at, depth + 1);
      } else {
        if (!name.startsWith('--tw-')) undeclared.push(name);
        out += fallback === null ? '' : walk(fallback, at, depth + 1);
      }
      i = end + 1;
    }
    return out;
  };

  return { text: walk(value, scope, 0).replace(/\s+/g, ' ').trim(), chain, undeclared };
}

/** A utility's declaration of `property`, and the utility's own custom properties. */
export function declarationOf(
  sheet: CompiledSheet,
  utility: string,
  property: string,
): { declaration: UtilityDeclaration; scope: Scope } | null {
  for (const decls of sheet.rules.get(utility) ?? []) {
    const declaration = decls.find((d) => d.property === property);
    if (!declaration) continue;
    const locals = new Map(
      decls.filter((d) => d.property.startsWith('--')).map((d) => [d.property, d.value]),
    );
    return { declaration, scope: { locals, inDark: false } };
  }
  return null;
}

/** A key template as a pattern over filled keys: `--text-{1}` matches `--text-4xl`. */
function keyPattern(template: string): RegExp {
  const escaped = template.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace(/\{[A-Za-z0-9]+\}/g, '.+')}$`);
}

/** The label a failure names a row by. */
export function rowLabel(row: ThemeMappingRow): string {
  return `${row.group} row /${row.token.source}/`;
}

/**
 * Check every probe of a row against the sheet compiled after its probe tokens
 * were set to its probe value. Returns one message per failing probe utility.
 *
 * A mapped row's declaration must resolve through `--rafters-<token>` to text
 * containing the probe value, name nothing undeclared, and read one of the
 * row's theme keys on the way (or the token's property directly, where
 * Tailwind inlines the key's value). A literal row's variant utility must sit
 * in a query whose condition contains the probe value; its plain utility must
 * resolve to it.
 */
export function probeRow(row: ThemeMappingRow, sheet: CompiledSheet): string[] {
  const failures: string[] = [];
  const keys = row.keys.concat(row.responsiveKeys ?? []).map((k) => keyPattern(k.key));
  for (const probe of row.probes) {
    const fail = (why: string): void => {
      failures.push(`${rowLabel(row)}: ${probe.utility} ${why}`);
    };
    if (row.utility !== undefined && !keyPattern(row.utility).test(probe.utility)) {
      fail(`is not the row's utility ${row.utility}`);
    }
    const found = declarationOf(sheet, probe.utility, probe.property);
    if (!found) {
      fail(`has no ${probe.property} declaration`);
      continue;
    }
    const { declaration, scope } = found;
    if (row.literal && probe.utility.includes(':')) {
      if (!declaration.conditions.some((c) => c.replace(/\s+/g, '').includes(row.probeValue))) {
        fail(
          `is not in a query containing ${row.probeValue} (${declaration.conditions.join(' ')})`,
        );
      }
      continue;
    }
    const resolved = resolve(sheet, declaration.value, scope);
    if (!resolved.text.includes(row.probeValue)) {
      fail(`${probe.property} resolves to "${resolved.text}", not ${row.probeValue}`);
    }
    if (resolved.undeclared.length > 0) {
      fail(`names undeclared ${resolved.undeclared.join(', ')}`);
    }
    if (row.literal) continue;
    const own = `--rafters-${probe.token}`;
    if (!resolved.chain.includes(own)) {
      fail(`does not resolve through var(${own}) (chain: ${resolved.chain.join(' > ')})`);
    }
    const readsKey = resolved.chain.some((name) => keys.some((k) => k.test(name)));
    if (!readsKey && resolved.chain[0] !== own) {
      fail(`does not read the row's theme key (chain: ${resolved.chain.join(' > ')})`);
    }
  }
  return failures;
}

/**
 * Check that every var() in each rule, other than `--tw-*`, resolves through a
 * `--rafters-*` property. Returns one message per var() that does not; a rule
 * with no such var() at all is a failure too.
 */
export function varsThroughRafters(
  sheet: CompiledSheet,
  rules: readonly UtilityDeclaration[][],
  label: string,
): string[] {
  const failures: string[] = [];
  let seen = 0;
  for (const decls of rules) {
    const scope: Scope = {
      locals: new Map(
        decls.filter((d) => d.property.startsWith('--')).map((d) => [d.property, d.value]),
      ),
      inDark: false,
    };
    for (const decl of decls) {
      for (const name of varNames(decl.value)) {
        if (name.startsWith('--tw-')) continue;
        seen++;
        const { chain } = resolve(sheet, `var(${name})`, scope);
        if (!chain.some((n) => n.startsWith('--rafters-'))) {
          failures.push(`${label}: ${decl.property}: var(${name}) reaches no --rafters- property`);
        }
      }
    }
  }
  if (seen === 0) failures.push(`${label}: no var() to follow`);
  return failures;
}

/** A stored token, as `.rafters/tokens` holds it. */
export interface StoredToken {
  name: string;
  namespace: string;
  value: unknown;
}

/**
 * The theme keys the mapping claims for these stored tokens: every key
 * template of every row, filled for each token the row matches.
 */
export function keysTheMappingWrites(
  table: readonly ThemeMappingRow[],
  tokens: readonly StoredToken[],
): Set<string> {
  const keys = new Set<string>();
  const fill = (template: string, fields: Record<string, string>): string =>
    template.replace(/\{([A-Za-z0-9]+)\}/g, (_all, f: string) => fields[f] ?? `{${f}}`);
  for (const row of table) {
    for (const token of tokens) {
      if (token.namespace !== row.group || token.name.endsWith('--dark')) continue;
      const match = row.token.exec(token.name);
      if (!match || row.except?.test(token.name) || typeof token.value !== 'string') continue;
      if (row.value && !row.value.test(token.value)) continue;
      const fields: Record<string, string> = {};
      for (const [i, c] of match.slice(1).entries()) fields[String(i + 1)] = c;
      for (const k of row.keys) keys.add(fill(k.key, fields));
      if (!row.json) continue;
      const parsed: unknown = JSON.parse(token.value);
      const responsive =
        typeof parsed === 'object' && parsed !== null && 'responsive' in parsed
          ? parsed.responsive
          : undefined;
      for (const bp of Object.keys(
        typeof responsive === 'object' && responsive ? responsive : {},
      )) {
        for (const k of row.responsiveKeys ?? []) keys.add(fill(k.key, { ...fields, bp }));
      }
    }
  }
  return keys;
}

/** The custom properties declared directly in the `@theme` blocks of an uncompiled sheet. */
export function themeKeys(css: string): string[] {
  const keys: string[] = [];
  const ast = csstree.parse(css, { parseCustomProperty: false, parseValue: false });
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name !== 'theme' || !node.block) return;
      for (const child of node.block.children) {
        if (child.type === 'Declaration' && child.property.startsWith('--')) {
          keys.push(child.property);
        }
      }
    },
  });
  return keys;
}
