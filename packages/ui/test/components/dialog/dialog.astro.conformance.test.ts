/**
 * Astro render adapter + the static-tier subset of the dialog conformance
 * suite (Spec 01 testing obligations; dialog.astro's docblock). Only the
 * React suite's "closed" scenario transfers: open/trap/Escape/dismiss are
 * effects and a keymap dispatch loop this tier does not have (Spec 03), so
 * dialog.astro never renders content/overlay/title/description/close --
 * dropped along with the state, not skip-registered.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Dialog from '../../../src/components/dialog/dialog.astro';
import { dialog, type DialogConfig } from '../../../src/components/dialog/dialog.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown>,
  slot = 'Open settings',
): Promise<HTMLElement> {
  const astroContainer = await AstroContainer.create();
  const html = await astroContainer.renderToString(Dialog, { props, slots: { default: slot } });
  document.body.innerHTML = html;
  return document.body;
}

describe('dialog conformance [astro]', () => {
  it('closed-state markup: only the trigger renders, contract-fulfilled, axe-clean', async () => {
    const body = await render({});
    const config: DialogConfig = {};
    const state = dialog.initialState(config);
    assertContractFulfillment(dialog, body, state, config, ['trigger']);
    expect(partElement(body, 'content')).toBeNull();
    expect(partElement(body, 'overlay')).toBeNull();
    expect(partElement(body, 'close')).toBeNull();
    await assertAxeClean(body);
  });

  it('trigger carries the aria that holds without JS, with no dangling aria-controls', async () => {
    const body = await render({});
    const trigger = partElement(body, 'trigger');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');
    expect(trigger?.getAttribute('data-state')).toBe('closed');
    expect(trigger?.hasAttribute('aria-controls')).toBe(false);
  });

  it('slot content and consumer attrs pass through unchanged -- no base class to merge', async () => {
    const body = await render({ class: 'my-trigger', 'aria-label': 'Settings' }, 'Open settings');
    const trigger = partElement(body, 'trigger') as HTMLElement;
    expect(trigger.textContent?.trim()).toBe('Open settings');
    expect(trigger.className).toBe('my-trigger');
    expect(trigger.getAttribute('aria-label')).toBe('Settings');
  });
});
