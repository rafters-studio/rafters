import { afterEach, describe, expect, it } from 'vitest';
import './card.element';
import {
  cardActionClasses,
  cardContentClasses,
  cardFooterClasses,
  cardHeaderClasses,
  cardInteractiveClasses,
} from './card.classes';
import { composeCardClasses, RaftersCard } from './card.element';

afterEach(() => {
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

function root(el: HTMLElement): HTMLElement | null {
  return el.shadowRoot?.firstElementChild as HTMLElement | null;
}

describe('rafters-card', () => {
  it('registers as a custom element', () => {
    expect(customElements.get('rafters-card')).toBe(RaftersCard);
  });

  it('registration is idempotent on re-import', async () => {
    await expect(import('./card.element')).resolves.toBeDefined();
  });

  it('renders a root wrapper with default slot and four named slots', () => {
    const el = document.createElement('rafters-card');
    document.body.appendChild(el);
    expect(root(el)).not.toBeNull();
    const slotNames = Array.from(el.shadowRoot?.querySelectorAll('slot') ?? []).map((s) =>
      s.getAttribute('name'),
    );
    expect(slotNames).toEqual(
      expect.arrayContaining(['header', 'content', 'footer', 'action', null]),
    );
  });

  it('renders sub-part wrappers carrying the shared utility class strings', () => {
    const el = document.createElement('rafters-card');
    document.body.appendChild(el);
    const parts = Array.from(el.shadowRoot?.querySelectorAll('div') ?? []).map((d) => d.className);
    expect(parts).toContain(cardHeaderClasses);
    expect(parts).toContain(cardContentClasses);
    expect(parts).toContain(cardFooterClasses);
    expect(parts).toContain(cardActionClasses);
  });

  it('falls back to "card" background for unknown values', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('background', 'not-a-real-value');
    document.body.appendChild(el);
    expect(root(el)?.className).toBe(composeCardClasses('card', false));
  });

  it('accepts each CardBackground value without throwing', () => {
    for (const bg of ['none', 'muted', 'accent', 'card', 'primary', 'secondary'] as const) {
      const el = document.createElement('rafters-card');
      el.setAttribute('background', bg);
      document.body.appendChild(el);
      expect(root(el)?.className).toBe(composeCardClasses(bg, false));
      document.body.removeChild(el);
    }
  });

  it('re-composes the root class string when background attribute changes', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('background', 'card');
    document.body.appendChild(el);
    el.setAttribute('background', 'muted');
    expect(root(el)?.className).toBe(composeCardClasses('muted', false));
  });

  it('adds the interactive utility classes only when interactive', () => {
    const plain = document.createElement('rafters-card');
    document.body.appendChild(plain);
    expect(root(plain)?.className).not.toContain(cardInteractiveClasses);

    const interactive = document.createElement('rafters-card');
    interactive.setAttribute('interactive', '');
    document.body.appendChild(interactive);
    expect(root(interactive)?.className).toContain(cardInteractiveClasses);
  });

  it('root class string picks up interactive toggles after connect', () => {
    const el = document.createElement('rafters-card');
    document.body.appendChild(el);
    expect(root(el)?.className).not.toContain(cardInteractiveClasses);
    el.setAttribute('interactive', '');
    expect(root(el)?.className).toContain(cardInteractiveClasses);
    el.removeAttribute('interactive');
    expect(root(el)?.className).not.toContain(cardInteractiveClasses);
  });

  it('sets tabindex="0" and role="button" when interactive is added', () => {
    const el = document.createElement('rafters-card');
    document.body.appendChild(el);
    expect(el.hasAttribute('tabindex')).toBe(false);
    el.setAttribute('interactive', '');
    expect(el.getAttribute('tabindex')).toBe('0');
    expect(el.getAttribute('role')).toBe('button');
  });

  it('removes tabindex and role when interactive is removed', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('interactive', '');
    document.body.appendChild(el);
    el.removeAttribute('interactive');
    expect(el.hasAttribute('tabindex')).toBe(false);
    expect(el.hasAttribute('role')).toBe(false);
  });

  it('preserves consumer-provided tabindex and role', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('tabindex', '-1');
    el.setAttribute('role', 'article');
    el.setAttribute('interactive', '');
    document.body.appendChild(el);
    expect(el.getAttribute('tabindex')).toBe('-1');
    expect(el.getAttribute('role')).toBe('article');
  });

  it('dispatches rafters-card-activate on Enter when interactive', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('interactive', '');
    document.body.appendChild(el);
    let fired = 0;
    el.addEventListener('rafters-card-activate', () => fired++);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(fired).toBe(1);
  });

  it('dispatches rafters-card-activate on Space when interactive', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('interactive', '');
    document.body.appendChild(el);
    let fired = 0;
    el.addEventListener('rafters-card-activate', () => fired++);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(fired).toBe(1);
  });

  it('event bubbles and is composed across the shadow boundary', () => {
    const wrapper = document.createElement('div');
    const el = document.createElement('rafters-card');
    el.setAttribute('interactive', '');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    let firedOnWrapper = 0;
    wrapper.addEventListener('rafters-card-activate', () => firedOnWrapper++);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(firedOnWrapper).toBe(1);
  });

  it('does NOT dispatch activate when not interactive', () => {
    const el = document.createElement('rafters-card');
    document.body.appendChild(el);
    let fired = 0;
    el.addEventListener('rafters-card-activate', () => fired++);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(fired).toBe(0);
  });

  it('does NOT dispatch activate for non-activation keys when interactive', () => {
    const el = document.createElement('rafters-card');
    el.setAttribute('interactive', '');
    document.body.appendChild(el);
    let fired = 0;
    el.addEventListener('rafters-card-activate', () => fired++);
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(fired).toBe(0);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'card.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });
});
