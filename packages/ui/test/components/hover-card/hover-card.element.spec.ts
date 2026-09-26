/**
 * Spec for HoverCard, Web Component target, driven end to end
 * against light-DOM markup. Same score as the React spec.
 *
 * WHAT CHANGED AT #2148: presence is CONSTANT. The preview is never `hidden`
 * and never unmounted -- the stylesheet reveals it through
 * `[data-hover-card]:hover > [data-part=content]`, and this binding's remaining
 * job is to keep `data-state`, `aria-describedby`, and the WCAG dismissal flag
 * in step with the real gesture. There is no timer left to zero out, so nothing
 * here configures a delay.
 *
 * bindHoverCard listens with plain `addEventListener('pointerenter', ...)` /
 * `('pointerleave', ...)` directly on the hover scope element (the WC host is
 * that scope, or the trigger alone under disableHoverableContent), so those
 * exact non-bubbling event types reach it when dispatched at the scope itself
 * -- no ancestor-walk needed, unlike the React lane's synthetic translation.
 */
import { afterEach, beforeAll, expect, test } from 'vitest';
import { RaftersHoverCard } from '../../../src/components/hover-card/hover-card.element';

beforeAll(() => {
  if (!customElements.get('rafters-hover-card')) {
    customElements.define('rafters-hover-card', RaftersHoverCard);
  }
});

afterEach(() => {
  document.body.innerHTML = '';
});

function enterScope(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerenter'));
}
function leaveScope(el: HTMLElement): void {
  el.dispatchEvent(new PointerEvent('pointerleave'));
}
function pressEscape(el: HTMLElement): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
}

async function mount(): Promise<HTMLElement> {
  document.body.innerHTML = `
    <rafters-hover-card data-part="root">
      <a href="#" data-part="trigger" id="hc-trigger" data-state="closed">@john</a>
      <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="closed">
        Software Engineer
      </div>
    </rafters-hover-card>`;
  await Promise.resolve();
  return document.body.querySelector('rafters-hover-card') as HTMLElement;
}

const host = () => document.body.querySelector<HTMLElement>('rafters-hover-card')!;
const trigger = () => document.body.querySelector<HTMLElement>('[data-part="trigger"]')!;
const content = () => document.body.querySelector<HTMLElement>('[data-part="content"]')!;
const state = () => content().dataset['state'];

test('host pins display:block to match the unclassed block root of the other targets', async () => {
  const element = await mount();
  expect(element.style.display).toBe('block');
});

test('host carries the data-hover-card marker the CSS reveal rule is scoped by', async () => {
  const element = await mount();
  expect(element.hasAttribute('data-hover-card')).toBe(true);
});

test('closed: content present and described, never hidden', async () => {
  await mount();
  expect(state()).toBe('closed');
  expect(content().hidden).toBe(false);
  expect(trigger().getAttribute('aria-describedby')).toBe('hc-content');
});

test('hover opens: data-state follows the gesture', async () => {
  await mount();
  enterScope(host());
  expect(state()).toBe('open');
  expect(content().getAttribute('role')).toBe('dialog');
});

test('leaving the root closes the card', async () => {
  await mount();
  enterScope(host());
  expect(state()).toBe('open');
  leaveScope(host());
  expect(state()).toBe('closed');
});

test('Escape dismisses while the trigger is focused, and raises data-dismissed', async () => {
  await mount();
  trigger().focus();
  enterScope(host());
  expect(state()).toBe('open');
  pressEscape(trigger());
  expect(state()).toBe('closed');
  expect(host().dataset['dismissed']).toBe('true');
});

test('the dismissal survives a pointer leave while the trigger still holds focus', async () => {
  // The reveal rule has a focus half of its own
  // (`[data-hover-card]:has(> [data-part=trigger]:focus-visible)`), so a
  // pointerleave that cleared the flag put the dismissed card straight back up
  // -- visible against `data-state="closed"` (WCAG 1.4.13).
  await mount();
  trigger().focus();
  pressEscape(trigger());
  expect(host().dataset['dismissed']).toBe('true');

  leaveScope(host());
  expect(state()).toBe('closed');
  expect(document.activeElement).toBe(trigger());
  expect(host().dataset['dismissed']).toBe('true');
});

test('the dismissal settles once the trigger blurs too', async () => {
  // The handoff: whichever of pointer/focus leaves LAST does the clear, so a
  // flag never outlives every reveal condition and blocks the next hover.
  await mount();
  trigger().focus();
  pressEscape(trigger());
  leaveScope(host());
  expect(host().dataset['dismissed']).toBe('true');

  trigger().blur();
  expect(host().dataset['dismissed']).toBeUndefined();
});

test('hoverable content holds the card open: the root is the hover scope', async () => {
  await mount();
  enterScope(host());
  // Trigger -> content never leaves the root. The LINGER on the way back out
  // is the stylesheet's transition-delay, not a JavaScript grace window.
  enterScope(host());
  expect(state()).toBe('open');
  leaveScope(host());
  expect(state()).toBe('closed');
});

test('Escape dismisses a default-open card that never received a hover/focus event', async () => {
  // Regression (shared bindHoverCard path, also drives Astro): a defaultOpen
  // card dismissed only through the retired hover primitive stayed open, since
  // no prior hover/focus had given the primitive state to close.
  document.body.innerHTML = `
    <rafters-hover-card data-part="root" data-default-open="true">
      <a href="#" data-part="trigger" id="hc-trigger" data-state="open">@john</a>
      <div data-part="content" id="hc-content" role="dialog" aria-label="John Doe" data-state="open">Software Engineer</div>
    </rafters-hover-card>`;
  await Promise.resolve();
  expect(state()).toBe('open');
  pressEscape(trigger());
  expect(state()).toBe('closed');
  expect(host().dataset['dismissed']).toBe('true');
});
