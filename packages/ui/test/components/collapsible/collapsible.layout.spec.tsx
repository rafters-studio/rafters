/**
 * React Collapsible layout in real chromium (#2529). The classes file collapses
 * the panel with `grid-rows-[minmax(0,0fr)]` and opens it with
 * `group-data-[state=open]:grid-rows-[minmax(0,1fr)]`; classy used to drop both
 * in React. Closed content stays mounted (inert, never `hidden`, #2924), so the
 * box is measurable in both states.
 */
import * as React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../src/components/collapsible/collapsible';
import { collapsibleClasses } from '../../../src/components/collapsible/collapsible.classes';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

const CONTENT_HEIGHT = 200;
const warn = vi.spyOn(console, 'warn');
let sheet: HTMLStyleElement | undefined;

beforeAll(async () => {
  const classes = collapsibleClasses({}, {});
  sheet = document.createElement('style');
  sheet.textContent = await commands.compileCss(Object.values(classes).join(' '));
  document.head.append(sheet);
}, 120000);

afterAll(() => sheet?.remove());

afterEach(async () => {
  await cleanup();
  warn.mockClear();
});

async function renderPair() {
  await render(
    <div>
      <Collapsible defaultOpen>
        <CollapsibleTrigger>open</CollapsibleTrigger>
        <CollapsibleContent>
          <div style={{ height: CONTENT_HEIGHT }}>open body</div>
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger>closed</CollapsibleTrigger>
        <CollapsibleContent>
          <div style={{ height: CONTENT_HEIGHT }}>closed body</div>
        </CollapsibleContent>
      </Collapsible>
    </div>,
  );
  const [open, closed] = document.body.querySelectorAll<HTMLElement>('[data-part="content"]');
  if (!(open && closed)) throw new Error('expected two content elements');
  return { open, closed };
}

describe('collapsible layout [react]', () => {
  it('the content element carries the grid-rows rules the classes file declares', async () => {
    const { closed } = await renderPair();
    expect(closed.className).toContain('grid-rows-[minmax(0,0fr)]');
    expect(closed.className).toContain('group-data-[state=open]:grid-rows-[minmax(0,1fr)]');
  });

  it('renders without a classy warning', async () => {
    await renderPair();
    expect(warn).not.toHaveBeenCalled();
  });

  it('a closed panel is 0px tall and an open one is its content height', async () => {
    const { open, closed } = await renderPair();
    expect(closed.getBoundingClientRect().height).toBe(0);
    expect(open.getBoundingClientRect().height).toBe(CONTENT_HEIGHT);
  });
});
