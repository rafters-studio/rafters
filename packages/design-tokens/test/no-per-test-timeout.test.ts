import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { type ESTree, parseSync, Visitor } from 'vite/rolldown/utils';
import { describe, expect, it } from 'vitest';

// vitest.config.ts sets the one testTimeout for this suite (#2752). A timeout
// passed to it/test/describe overrides it, so none is allowed.
const TEST_DIR = __dirname;
const RUNNERS = new Set(['it', 'test', 'describe']);

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return testFiles(path);
    return entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

function rootName(expr: ESTree.Expression): string | undefined {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression' && !expr.computed) return rootName(expr.object);
  if (expr.type === 'CallExpression') return rootName(expr.callee);
  return undefined;
}

function isTimeoutArg(arg: ESTree.Argument): boolean {
  if (arg.type === 'Literal' && typeof arg.value === 'number') return true;
  if (arg.type !== 'ObjectExpression') return false;
  return arg.properties.some(
    (p) =>
      p.type === 'Property' &&
      !p.computed &&
      p.key.type === 'Identifier' &&
      p.key.name === 'timeout',
  );
}

function timeoutSites(file: string): string[] {
  const text = readFileSync(file, 'utf-8');
  const sites: string[] = [];
  new Visitor({
    CallExpression(node) {
      const name = rootName(node.callee);
      if (name !== undefined && RUNNERS.has(name) && node.arguments.slice(1).some(isTimeoutArg)) {
        const line = text.slice(0, node.start).split('\n').length;
        sites.push(`${relative(TEST_DIR, file)}:${line}`);
      }
    },
  }).visit(parseSync(file, text).program);
  return sites;
}

describe('test timeouts (#2752)', () => {
  it('no test under test/ passes its own timeout argument', () => {
    expect(testFiles(TEST_DIR).flatMap(timeoutSites)).toEqual([]);
  });
});
