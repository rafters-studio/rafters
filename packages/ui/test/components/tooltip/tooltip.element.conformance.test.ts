/**
 * WC performance of the tooltip score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- proves presence (content
 * hidden off the open axis) and the hover-intent timing (composed from the
 * hover-delay primitive) drive through the DOM binding. Delays are zeroed on
 * the element so intent resolves synchronously.
 */
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersTooltip } from '../../../src/components/tooltip/tooltip.element';
import { resetHoverDelayState } from '../../../src/primitives/hover-delay';

beforeAll(() => {
  if (!customElements.get('rafters-tooltip')) {
    customElements.define('rafters-tooltip', RaftersTooltip);
  }
});

async function mount(skipDelay = 0): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-tooltip data-part="root" data-delay-duration="0" data-skip-delay-duration="${skipDelay}">
      <button type="button" data-part="trigger" id="t-trigger" data-state="closed">Help</button>
      <div data-part="content" id="t-content" role="tooltip" data-state="closed" hidden>More info</div>
    </rafters-tooltip>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-tooltip') as HTMLElement;
}

const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  resetHoverDelayState();
});

describe('tooltip conformance [wc]', () => {
  it('closed: content hidden, trigger undescribed', async () => {
    await mount();
    expect(content().hidden).toBe(true);
    expect(trigger().hasAttribute('aria-describedby')).toBe(false);
  });

  it('hover opens: content shows and the trigger is wired to it', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute('aria-describedby')).toBe('t-content');
    expect(content().getAttribute('role')).toBe('tooltip');
  });

  it('leaving the trigger closes the tip', async () => {
    const user = userEvent.setup();
    await mount();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    await user.unhover(trigger());
    expect(content().hidden).toBe(true);
  });

  it('Escape dismisses while the trigger is focused', async () => {
    const user = userEvent.setup();
    await mount();
    trigger().focus();
    await user.hover(trigger());
    expect(content().hidden).toBe(false);
    await user.keyboard('{Escape}');
    expect(content().hidden).toBe(true);
  });

  it('hoverable content holds the tip open until the pointer leaves it', async () => {
    const user = userEvent.setup();
    // A positive close delay is the grace window that lets the pointer cross
    // from trigger to content without the tip going hidden mid-travel.
    await mount(50);
    await user.hover(trigger());
    await user.hover(content());
    await user.unhover(trigger());
    expect(content().hidden).toBe(false);
    await user.unhover(content());
    await waitFor(() => expect(content().hidden).toBe(true));
  });

  it('Escape dismisses a default-open tip that never received a hover/focus event', async () => {
    // Regression (shared bindTooltip path, also drives Astro): a defaultOpen tip
    // dismissed only through the hover primitive stayed open, since no prior
    // hover/focus had given the primitive state to close. A raw Escape keydown
    // with no focus event must still close it.
    document.body.innerHTML = `
      <rafters-tooltip data-part="root" data-delay-duration="0" data-default-open="true">
        <button type="button" data-part="trigger" id="t-trigger" data-state="open">Help</button>
        <div data-part="content" id="t-content" role="tooltip" data-state="open">More info</div>
      </rafters-tooltip>`;
    await Promise.resolve();
    expect(content().hidden).toBe(false);
    fireEvent.keyDown(trigger(), { key: 'Escape' });
    expect(content().hidden).toBe(true);
  });
});
