/**
 * WC performance of the tooltip score, driven end to end against light-DOM
 * markup. Same score as the React conformance test.
 *
 * WHAT CHANGED AT #2148: presence is CONSTANT. The content is never `hidden`
 * and never unmounted -- the stylesheet reveals it through `[data-tooltip]:hover
 * > [data-part=content]`, and this binding's remaining job is to keep
 * `data-state`, `aria-describedby`, and the WCAG dismissal flag in step with
 * the real gesture. There is no timer left to zero out, so nothing here
 * configures a delay.
 */
import { cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersTooltip } from '../../../src/components/tooltip/tooltip.element';

beforeAll(() => {
  if (!customElements.get('rafters-tooltip')) {
    customElements.define('rafters-tooltip', RaftersTooltip);
  }
});

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-tooltip data-part="root">
      <button type="button" data-part="trigger" id="t-trigger" data-state="closed">Help</button>
      <div data-part="content" id="t-content" role="tooltip" data-state="closed">More info</div>
    </rafters-tooltip>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-tooltip') as HTMLElement;
}

const host = () => document.body.querySelector<HTMLElement>('rafters-tooltip')!;
const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const state = () => content().dataset['state'];

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('tooltip conformance [wc]', () => {
  it('host pins display:block to match the unclassed block root of the other targets', async () => {
    const element = await mount();
    expect(element.style.display).toBe('block');
  });

  it('host carries the data-tooltip marker the CSS reveal rule is scoped by', async () => {
    const element = await mount();
    expect(element.hasAttribute('data-tooltip')).toBe(true);
  });

  it('closed: content present and described, never hidden', async () => {
    await mount();
    expect(state()).toBe('closed');
    expect(content().hidden).toBe(false);
    // Unconditional: the description survives a page with no JavaScript at all.
    expect(trigger().getAttribute('aria-describedby')).toBe('t-content');
  });

  it('hover opens: data-state follows the gesture', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(state()).toBe('open');
    expect(content().getAttribute('role')).toBe('tooltip');
  });

  it('leaving the root closes the tip', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(state()).toBe('open');
    await user.unhover(host());
    expect(state()).toBe('closed');
  });

  it('Escape dismisses while the trigger is focused, and raises data-dismissed', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.hover(trigger());
    expect(state()).toBe('open');
    await user.keyboard('{Escape}');
    expect(state()).toBe('closed');
    // The pointer has not moved, so `:hover` still matches -- the flag is what
    // forces the tip back down (WCAG 1.4.13).
    expect(host().dataset['dismissed']).toBe('true');
  });

  it('hoverable content holds the tip open: the root is the hover scope', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    // Trigger -> content never leaves the root, so no grace-window timer is
    // needed to bridge the travel.
    await user.hover(content());
    expect(state()).toBe('open');
    await user.unhover(host());
    expect(state()).toBe('closed');
  });

  it('Escape dismisses a default-open tip that never received a hover/focus event', async () => {
    // Regression (shared bindTooltip path, also drives Astro): a defaultOpen tip
    // dismissed only through the retired hover primitive stayed open, since no
    // prior hover/focus had given the primitive state to close.
    document.body.innerHTML = `
      <rafters-tooltip data-part="root" data-default-open="true">
        <button type="button" data-part="trigger" id="t-trigger" data-state="open">Help</button>
        <div data-part="content" id="t-content" role="tooltip" data-state="open">More info</div>
      </rafters-tooltip>`;
    await Promise.resolve();
    expect(state()).toBe('open');
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    expect(state()).toBe('closed');
    expect(host().dataset['dismissed']).toBe('true');
  });
});
