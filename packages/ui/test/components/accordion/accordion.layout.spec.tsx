/**
 * React Accordion layout in real chromium (#2529). The classes file collapses a
 * closed panel with `data-[state=closed]:grid-rows-[minmax(0,0fr)]`. React used
 * to drop that class through classy, so a closed panel kept its content's height
 * under the trigger. These tests measure the box, with props only.
 */
import * as React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../src/components/accordion/accordion';
import { accordionClasses } from '../../../src/components/accordion/accordion.classes';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

const CONTENT_HEIGHT = 200;
const warn = vi.spyOn(console, 'warn');
let sheet: HTMLStyleElement | undefined;

beforeAll(async () => {
  const classes = accordionClasses({}, {});
  sheet = document.createElement('style');
  sheet.textContent = await commands.compileCss(Object.values(classes).join(' '));
  document.head.append(sheet);
}, 120000);

afterAll(() => sheet?.remove());

afterEach(async () => {
  await cleanup();
  warn.mockClear();
});

function contentFor(value: string): HTMLElement {
  const element = document.body.querySelector<HTMLElement>(
    `[data-part="content"][data-value="${value}"]`,
  );
  if (!element) throw new Error(`no content for ${value}`);
  return element;
}

function triggerFor(value: string): HTMLElement {
  const element = document.body.querySelector<HTMLElement>(
    `[data-part="trigger"][data-value="${value}"]`,
  );
  if (!element) throw new Error(`no trigger for ${value}`);
  return element;
}

async function renderItems(defaultValue?: string) {
  await render(
    <Accordion type="single" defaultValue={defaultValue}>
      {['a', 'b', 'c'].map((value) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger>Section {value}</AccordionTrigger>
          <AccordionContent>
            <div style={{ height: CONTENT_HEIGHT }}>Body {value}</div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>,
  );
}

describe('accordion layout [react]', () => {
  it('the content element carries the grid-rows rules the classes file declares', async () => {
    await renderItems('a');
    const { className } = contentFor('b');
    expect(className).toContain('data-[state=closed]:grid-rows-[minmax(0,0fr)]');
    expect(className).toContain('data-[state=open]:grid-rows-[minmax(0,1fr)]');
  });

  it('renders without a classy warning', async () => {
    await renderItems('a');
    expect(warn).not.toHaveBeenCalled();
  });

  it('a closed item has no space under its trigger', async () => {
    await renderItems();
    for (const value of ['a', 'b', 'c']) {
      expect(contentFor(value).getBoundingClientRect().height).toBe(0);
    }
  });

  it('with one item open, closed items are 0px and the open item is its content height', async () => {
    await renderItems('b');
    expect(contentFor('a').getBoundingClientRect().height).toBe(0);
    expect(contentFor('c').getBoundingClientRect().height).toBe(0);
    const open = contentFor('b');
    const inner = open.firstElementChild as HTMLElement;
    expect(inner.getBoundingClientRect().height).toBeGreaterThanOrEqual(CONTENT_HEIGHT);
    expect(open.getBoundingClientRect().height).toBe(inner.getBoundingClientRect().height);
    expect(triggerFor('b').getBoundingClientRect().bottom).toBeLessThanOrEqual(
      open.getBoundingClientRect().top,
    );
  });
});
