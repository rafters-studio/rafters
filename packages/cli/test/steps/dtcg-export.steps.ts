/**
 * Step definitions for the DTCG export (#2891): one Figma-importable file per
 * mode, carrying every token whole in `$extensions.rafters`.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadRegistryFromDir, REGISTRY_PLUGINS } from '@rafters/design-tokens';
import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { EXPORT_CHOICES } from '../../src/utils/exports.js';
import { context } from './common.steps.js';

const { Then } = createBdd();

type Node = Record<string, unknown>;
const isObj = (v: unknown): v is Node => typeof v === 'object' && v !== null && !Array.isArray(v);

async function readMode(mode: 'light' | 'dark'): Promise<Node> {
  const path = join(context.fixturePath, '.rafters', 'output', 'dtcg', `${mode}.tokens.json`);
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!isObj(parsed)) throw new Error(`${mode}.tokens.json is not an object`);
  return parsed;
}

/** Path -> $type of every token in a file. */
function typesOf(node: Node, path: string[] = [], out: Map<string, unknown> = new Map()) {
  for (const [k, v] of Object.entries(node)) {
    if ((k.startsWith('$') && k !== '$root') || !isObj(v)) continue;
    if ('$value' in v) out.set([...path, k].join('.'), v.$type);
    else typesOf(v, [...path, k], out);
  }
  return out;
}

function unrepresentedOf(file: Node): Node {
  const record =
    isObj(file.$extensions) && isObj(file.$extensions.rafters)
      ? file.$extensions.rafters.unrepresented
      : undefined;
  return isObj(record) ? record : {};
}

/** Every token a file carries in $extensions.rafters: on tokens, groups and the root record. */
function carried(file: Node): Node[] {
  const found: Node[] = [];
  const walk = (node: Node): void => {
    const rafters = isObj(node.$extensions) ? node.$extensions.rafters : undefined;
    if (isObj(rafters) && isObj(rafters.token)) found.push(rafters.token);
    for (const [k, v] of Object.entries(node)) {
      if ((k.startsWith('$') && k !== '$root') || !isObj(v)) continue;
      walk(v);
    }
  };
  walk(file);
  for (const entry of Object.values(unrepresentedOf(file))) {
    if (isObj(entry) && isObj(entry.token)) found.push(entry.token);
  }
  return found;
}

Then('the light and dark DTCG files carry the same token paths with the same types', async () => {
  const light = typesOf(await readMode('light'));
  const dark = typesOf(await readMode('dark'));
  expect(light.size).toBeGreaterThan(0);
  expect(Object.fromEntries(dark)).toEqual(Object.fromEntries(light));
});

Then(
  'reading $extensions.rafters back from both DTCG files rebuilds every token in .rafters\\/tokens',
  async () => {
    const registry = loadRegistryFromDir(
      join(context.fixturePath, '.rafters', 'tokens'),
      REGISTRY_PLUGINS,
    );
    const back = new Map<string, Node>();
    for (const file of [await readMode('light'), await readMode('dark')]) {
      for (const token of carried(file)) back.set(String(token.name), token);
    }
    const source = [...registry.list()];
    expect([...back.keys()].sort()).toEqual(source.map((t) => t.name).sort());
    for (const token of source) {
      expect(back.get(token.name), token.name).toEqual(JSON.parse(JSON.stringify(token)));
    }
  },
);

Then("the output lists every token in the DTCG files' root unrepresented record", async () => {
  const lines = (context.commandResult?.stdout ?? '').split('\n').filter(Boolean);
  const report = lines
    .map((line): unknown => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find((e): e is Node => isObj(e) && e.event === 'init:dtcg_report');
  expect(report, 'init:dtcg_report event').toBeDefined();
  const listed = new Set(
    (Array.isArray(report?.unrepresented) ? report.unrepresented : []).map((e: unknown) =>
      isObj(e) ? e.name : undefined,
    ),
  );
  const recorded = [
    ...Object.keys(unrepresentedOf(await readMode('light'))),
    ...Object.keys(unrepresentedOf(await readMode('dark'))),
  ];
  expect(recorded.length).toBeGreaterThan(0);
  expect(recorded.filter((name) => !listed.has(name))).toEqual([]);
});

Then('the dtcg export choice names Figma variables and one file per mode', () => {
  const choice = EXPORT_CHOICES.find((c) => c.value === 'dtcg');
  expect(choice?.name).toBe('DTCG JSON (Figma variables, one file per mode)');
});
