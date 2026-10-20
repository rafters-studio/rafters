import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
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

function rootName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return rootName(expr.expression);
  if (ts.isCallExpression(expr)) return rootName(expr.expression);
  return undefined;
}

function isTimeoutArg(arg: ts.Expression): boolean {
  if (ts.isNumericLiteral(arg)) return true;
  if (!ts.isObjectLiteralExpression(arg)) return false;
  return arg.properties.some((p) => p.name !== undefined && p.name.getText() === 'timeout');
}

function timeoutSites(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf-8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const sites: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const name = rootName(node.expression);
      if (name !== undefined && RUNNERS.has(name) && node.arguments.slice(1).some(isTimeoutArg)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        sites.push(`${relative(TEST_DIR, file)}:${line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return sites;
}

describe('test timeouts (#2752)', () => {
  it('no test under test/ passes its own timeout argument', () => {
    expect(testFiles(TEST_DIR).flatMap(timeoutSites)).toEqual([]);
  });
});
