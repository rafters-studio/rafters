import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { facetReader } from '../../src/mcp/facets.js';
import { assembleGraph, describe as describeNode } from '../../src/mcp/graph.js';
import type { RegistryFile, RegistryItem } from '../../src/registry/types.js';

function item(name: string, files: Record<string, string>): RegistryItem {
  return {
    name,
    type: 'ui',
    primitives: [],
    rules: [],
    files: Object.entries(files).map(
      ([path, content]) => ({ path, content, dependencies: [] }) as RegistryFile,
    ),
  };
}

const UI = join(import.meta.dirname, '../../../ui/src');

/** A component as the registry serves it: flat under `components/ui/`, read from the real source. */
async function served(name: string, directory = name): Promise<RegistryItem> {
  const dir = join(UI, 'components', directory);
  const files: Record<string, string> = {};
  for (const entry of await readdir(dir)) {
    if (entry.startsWith(`${name}.`) && !/\.(test|spec|a11y)\./.test(entry)) {
      files[`components/ui/${entry}`] = await readFile(join(dir, entry), 'utf-8');
    }
  }
  return item(name, files);
}

describe('facetReader on the components the registry serves', () => {
  it('reads button on both targets, enums resolved through its behavior file', async () => {
    const button = await served('button');
    const lib = item('pressable', {
      'lib/pressable.ts': await readFile(join(UI, 'lib/pressable.ts'), 'utf-8'),
    });
    const facets = facetReader([button, lib])(button);

    expect(facets.astro?.props['id']).toEqual({ type: 'string', required: true });
    expect(facets.astro?.props['size']).toMatchObject({ type: 'enum', default: 'default' });
    expect(facets.react?.props['variant']).toMatchObject({
      type: 'enum',
      values: expect.arrayContaining(['default', 'destructive', 'ghost']),
    });
    expect(facets.react?.props['loading']).toMatchObject({ type: 'boolean' });
    expect(facets.react?.snippet).toBe(
      "import { Button } from '@/components/ui/button';\n\n<Button>Content</Button>",
    );
    expect(facets.astro?.snippet).toBe(
      '---\nimport Button from \'@/components/ui/button.astro\';\n---\n\n<Button id="button">Content</Button>',
    );
    expect(facets.astro?.slots).toEqual(['start-icon', 'end-icon', 'default']);
  });

  it('gives a void component no content', async () => {
    const input = await served('input');
    const facets = facetReader([input])(input);
    expect(facets.react?.snippet).toContain('<Input />');
    expect(facets.react?.slots).toBeUndefined();
    expect(facets.astro?.snippet).toContain('<Input id="input" />');
  });

  it('names the component the file exports, not the item name in PascalCase', async () => {
    const otp = await served('input-otp');
    const resizable = await served('resizable');
    const read = facetReader([otp, resizable]);
    expect(read(otp).react?.snippet).toContain('import { InputOTP } from');
    expect(read(otp).react?.snippet).toContain('maxLength={0}');
    expect(read(resizable).react?.snippet).toContain('import { ResizablePanelGroup } from');
  });

  it('has no react facet for a part that only has an Astro performance', async () => {
    const cardHeader = await served('card-header', 'card');
    const facets = facetReader([cardHeader])(cardHeader);
    expect(facets.react).toBeUndefined();
    expect(facets.astro?.snippet).toContain('<CardHeader>Content</CardHeader>');
  });

  it('feeds describe: props, requiredness and a drill for each one', async () => {
    const button = await served('button');
    const graph = assembleGraph([button]);
    expect(describeNode('button.props.id', graph, 'astro')).toEqual({
      type: 'string',
      required: true,
    });
    const expanded = describeNode('button.*', graph, 'react');
    if (expanded === null || !('props' in expanded)) throw new Error('expected an expanded node');
    expect(Object.keys(expanded.props).length).toBeGreaterThan(10);
    for (const name of Object.keys(expanded.props)) {
      expect(describeNode(`button.props.${name}`, graph, 'react')).not.toHaveProperty('error');
    }
  });
});

describe('facetReader type reading', () => {
  const read = (source: string, behavior = '', others: RegistryItem[] = []) => {
    const thing = item('thing', {
      'components/ui/thing.tsx': source,
      'components/ui/thing.behavior.ts': behavior,
    });
    return facetReader([thing, ...others])(thing).react;
  };
  const component = 'export function Thing(props: ThingProps) { return props.children; }';

  it('follows extends, aliases and Omit/Pick, and leaves platform types out', () => {
    const facet = read(
      `import * as React from 'react';
       export interface ThingProps extends Omit<ThingConfig, 'hidden'>, React.HTMLAttributes<HTMLDivElement> {
         own: boolean;
       }
       ${component}`,
      `export type ThingSize = 'sm' | 'lg';
       export interface ThingConfig extends Pick<BaseConfig, 'kept'> { size?: ThingSize; hidden?: boolean; }
       interface BaseConfig { kept: number; dropped: string; }`,
    );
    expect(facet?.props).toEqual({
      own: { type: 'boolean', required: true },
      size: { type: 'enum', values: ['sm', 'lg'] },
      kept: { type: 'number', required: true },
    });
  });

  it('resolves a type another served item declares', () => {
    const lib = item('base', { 'lib/base.ts': `export type Side = 'left' | 'right';` });
    const facet = read(`export interface ThingProps { side?: Side; } ${component}`, '', [lib]);
    expect(facet?.props['side']).toEqual({ type: 'enum', values: ['left', 'right'] });
  });

  it('reads the const-list and indexed spellings of a literal union', () => {
    const facet = read(
      `export interface ThingProps {
         a?: (typeof LIST)[number];
         b?: ThingConfig['b'];
         c?: keyof typeof MAP;
       } ${component}`,
      `const BASE = ['x'] as const;
       const LIST = [...BASE, 'y', 2] as const;
       const MAP = { one: 1, 'two-2': 2 };
       export interface ThingConfig { b?: 'p' | 'q'; }`,
    );
    expect(facet?.props).toEqual({
      a: { type: 'enum', values: ['x', 'y', '2'] },
      b: { type: 'enum', values: ['p', 'q'] },
      c: { type: 'enum', values: ['one', 'two-2'] },
    });
  });

  it('merges a union: required only in every arm, and the types of all arms', () => {
    const facet = read(
      `export type ThingProps =
         | { mode: 'single'; value?: string; only: string }
         | { mode: 'range'; value?: number };
       ${component}`,
    );
    expect(facet?.props['mode']).toEqual({
      type: 'enum',
      values: ['single', 'range'],
      required: true,
    });
    expect(facet?.props['only']).toEqual({ type: 'string' });
  });

  it('gives a type with no literal domain an enum with no values, and a default ends required', () => {
    const facet = read(
      `export interface ThingProps {
         // items: Fake;
         items: Item[];
         onPick?: (value: string) => void;
         label: string;
         'aria-thing'?: string;
       }
       export function Thing({ label = 'Name', 'aria-thing': aria = 'x' }: ThingProps) { return label + aria; }`,
    );
    expect(facet?.props).toEqual({
      items: { type: 'enum', values: [], required: true },
      onPick: { type: 'enum', values: [] },
      label: { type: 'string', default: 'Name' },
      'aria-thing': { type: 'string', default: 'x' },
    });
    expect(facet?.snippet).toContain('<Thing items={[]} />');
  });

  it('fills a required prop by what its type accepts', () => {
    const facet = read(
      `export interface ThingProps {
         on: () => void;
         node: React.ReactNode;
         shape: Shape;
         kind: 'a' | 'b';
         count: 1 | 2;
         flag: boolean;
         children: React.ReactNode;
       } ${component}`,
    );
    expect(facet?.snippet).toContain(
      '<Thing on={() => {}} node="node" shape={{}} kind="a" count={1} flag>Content</Thing>',
    );
  });

  it('reads only the frontmatter of an Astro file, and its renamed defaults', () => {
    const thing = item('thing', {
      'components/ui/thing.astro': `---
interface Props { as?: string; id: string; }
const { as: Tag = 'div', id } = Astro.props;
---
<Tag id={id}><p>interface Fake { nope: string; }</p><slot name="icon" /></Tag>`,
    });
    const facet = facetReader([thing])(thing).astro;
    expect(facet?.props).toEqual({
      as: { type: 'string', default: 'div' },
      id: { type: 'string', required: true },
    });
    expect(facet?.slots).toEqual(['icon']);
    expect(facet?.snippet).toContain('<Thing id="thing" />');
  });

  it('has no facet when the file exports no component', () => {
    expect(read('export const helper = 1;')).toBeUndefined();
  });
});
