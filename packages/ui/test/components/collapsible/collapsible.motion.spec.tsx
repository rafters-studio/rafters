/**
 * Browser-project motion of Collapsible content (#2924). The compiled sheet is
 * injected through commands.compileCss, so computed style and transition events
 * reflect exactly what collapsibleClasses emits. The Astro performance is the
 * template's markup rebuilt by hand and handed to bindCollapsible, the client
 * the Astro script runs; the Container API cannot run in the page.
 */
import * as React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cdp, commands, userEvent } from 'vitest/browser';
import { cleanup, render } from 'vitest-browser-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../src/components/collapsible/collapsible';
import {
  bindCollapsible,
  collapsible,
} from '../../../src/components/collapsible/collapsible.behavior';
import { collapsibleClasses } from '../../../src/components/collapsible/collapsible.classes';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

const classes = collapsibleClasses({}, { open: false });
let sheet: HTMLStyleElement | undefined;

beforeAll(async () => {
  sheet = document.createElement('style');
  sheet.textContent = await commands.compileCss(Object.values(classes).join(' '));
  document.head.append(sheet);
}, 120000);

afterAll(() => {
  sheet?.remove();
});

let unbind: (() => void) | undefined;
afterEach(async () => {
  unbind?.();
  unbind = undefined;
  await cleanup();
  document.getElementById('astro-host')?.remove();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const part = (name: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="${name}"]`) as HTMLElement;
const height = (el: HTMLElement) => el.getBoundingClientRect().height;

/** The property names of every transitionrun on the content during `act`. */
async function runs(content: HTMLElement, act: () => Promise<void>): Promise<string[]> {
  const seen: string[] = [];
  const onRun = (event: Event) => {
    if (event.target === content) seen.push((event as TransitionEvent).propertyName);
  };
  content.addEventListener('transitionrun', onRun);
  await act();
  await sleep(700);
  content.removeEventListener('transitionrun', onRun);
  return seen;
}

function timing(el: HTMLElement) {
  const style = getComputedStyle(el);
  return {
    duration: style.transitionDuration,
    curve: style.transitionTimingFunction,
    property: style.transitionProperty,
  };
}

/** The markup collapsible.astro renders, with its own classes and projection. */
function mountAstro(children: string) {
  const config = { defaultOpen: false };
  const state = collapsible.initialState(config);
  const ids = { root: '', trigger: 'a-trigger', content: 'a-content' };
  const aria = collapsible.aria(state, config, ids);
  const host = document.createElement('div');
  host.id = 'astro-host';
  host.innerHTML =
    `<rafters-collapsible data-part="root" default-open="false" class="${classes.root}" data-state="closed">` +
    `<button type="button" id="a-trigger" data-part="trigger" class="${classes.trigger}">t</button>` +
    `<div id="a-content" data-part="content" class="${classes.content}"${aria.content?.['inert'] ? ' inert' : ''}>${children}</div>` +
    `</rafters-collapsible>`;
  document.body.append(host);
  unbind = bindCollapsible(host.querySelector('rafters-collapsible') as HTMLElement);
}

function expectClosed(content: HTMLElement) {
  expect(content.hasAttribute('hidden')).toBe(false);
  expect(content.hasAttribute('inert')).toBe(true);
  expect(height(content)).toBe(0);
}

async function expectMotion(content: HTMLElement, trigger: HTMLElement) {
  expectClosed(content);
  const opening = await runs(content, () => userEvent.click(trigger));
  expect(opening).toContain('grid-template-rows');
  expect(opening).toContain('opacity');
  expect(timing(content).property).toBe('grid-template-rows, opacity');
  expect(timing(content).duration).not.toBe('0s');
  expect(content.hasAttribute('inert')).toBe(false);
  expect(height(content)).toBe(72);
  const closing = await runs(content, () => userEvent.click(trigger));
  expect(closing).toContain('grid-template-rows');
  expect(closing).toContain('opacity');
  expectClosed(content);
}

describe('collapsible content motion [react]', () => {
  it('default: closed content is mounted, inert, 0px, and transitions both ways', async () => {
    await render(
      <Collapsible>
        <CollapsibleTrigger>t</CollapsibleTrigger>
        <CollapsibleContent>
          <div style={{ height: 72 }}>x</div>
        </CollapsibleContent>
      </Collapsible>,
    );
    await expectMotion(part('content'), part('trigger'));
  });

  it('forceMount behaves the same', async () => {
    await render(
      <Collapsible>
        <CollapsibleTrigger>t</CollapsibleTrigger>
        <CollapsibleContent forceMount>
          <div style={{ height: 72 }}>x</div>
        </CollapsibleContent>
      </Collapsible>,
    );
    await expectMotion(part('content'), part('trigger'));
  });

  it('bare text with no child element is 0px closed', async () => {
    await render(
      <Collapsible>
        <CollapsibleTrigger>t</CollapsibleTrigger>
        <CollapsibleContent>just some bare text</CollapsibleContent>
      </Collapsible>,
    );
    expectClosed(part('content'));
  });
});

describe('collapsible content motion [reduced motion]', () => {
  afterEach(async () => {
    await cdp().send('Emulation.setEmulatedMedia', { features: [] });
  });

  it('prefers-reduced-motion: reduce computes the content durations to 0s', async () => {
    await render(
      <Collapsible>
        <CollapsibleTrigger>t</CollapsibleTrigger>
        <CollapsibleContent>
          <div style={{ height: 72 }}>x</div>
        </CollapsibleContent>
      </Collapsible>,
    );
    const content = part('content');
    expect(timing(content).duration).not.toBe('0s');
    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    expect(timing(content).duration).toBe('0s');
    await userEvent.click(part('trigger'));
    expect(timing(content).duration).toBe('0s');
  });
});

describe('collapsible content motion [astro bind]', () => {
  it('closed content is inert, 0px, and transitions both ways', async () => {
    mountAstro('<div style="height:72px">x</div>');
    await expectMotion(part('content'), part('trigger'));
  });

  it('bare text with no child element is 0px closed', async () => {
    mountAstro('just some bare text');
    expectClosed(part('content'));
  });
});
