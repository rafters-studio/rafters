/**
 * React Collapsible classes in real chromium (#2529). The classes file collapses
 * the panel with `grid-rows-[minmax(0,0fr)]` and opens it with
 * `group-data-[state=open]:grid-rows-[minmax(0,1fr)]`; classy used to drop both
 * in React. A closed panel kept mounted by forceMount is `hidden`, so its box is
 * 0px with or without those classes: the class and the warning are what tell the
 * two classy behaviors apart here. The accordion spec measures the box.
 */
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from 'vitest-browser-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../src/components/collapsible/collapsible';

const warn = vi.spyOn(console, 'warn');

afterEach(async () => {
  await cleanup();
  warn.mockClear();
});

async function renderClosed(): Promise<HTMLElement> {
  await render(
    <Collapsible>
      <CollapsibleTrigger>closed</CollapsibleTrigger>
      <CollapsibleContent forceMount>closed body</CollapsibleContent>
    </Collapsible>,
  );
  const content = document.body.querySelector<HTMLElement>('[data-part="content"]');
  if (!content) throw new Error('no content part');
  return content;
}

describe('collapsible classes [react]', () => {
  it('the content element carries the grid-rows rules the classes file declares', async () => {
    const { className } = await renderClosed();
    expect(className).toContain('grid-rows-[minmax(0,0fr)]');
    expect(className).toContain('group-data-[state=open]:grid-rows-[minmax(0,1fr)]');
  });

  it('renders without a classy warning', async () => {
    await renderClosed();
    expect(warn).not.toHaveBeenCalled();
  });
});
