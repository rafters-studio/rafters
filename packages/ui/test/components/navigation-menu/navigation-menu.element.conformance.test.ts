/**
 * WC render adapter + conformance for navigation-menu (light DOM -- see
 * navigation-menu.element.ts's class doc for why). No shared
 * conformance-suite.ts exists yet for this component (the react
 * performance predates that pattern); this file drives the WC surface
 * directly against the harness (test/harness/conformance.ts), porting the
 * assertions navigation-menu.conformance.test.tsx already proved for
 * react, plus the one assertion that proves the light-DOM architecture
 * decision itself: pointerdown outside must close, meaning a click inside
 * the menu must NOT be misread as outside.
 *
 * Importing navigation-menu.element.ts registers <rafters-navigation-menu>
 * idempotently (guarded internally).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import '../../../src/components/navigation-menu/navigation-menu.element';
import type { RenderResult } from '../../harness/conformance';
import { assertAxeClean } from '../../harness/conformance';

interface MenuProps {
  value?: string;
  defaultValue?: string;
  orientation?: 'horizontal' | 'vertical';
  delayDuration?: number;
}

function item(
  value: string,
  label: string,
  links: ReadonlyArray<readonly [string, string]>,
): HTMLLIElement {
  const li = document.createElement('li');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.setAttribute('data-part', 'trigger');
  trigger.setAttribute('data-value', value);
  trigger.setAttribute('data-roving-item', '');
  trigger.textContent = label;
  const content = document.createElement('div');
  content.setAttribute('data-part', 'content');
  content.setAttribute('data-value', value);
  for (const [href, text] of links) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    content.appendChild(a);
  }
  li.append(trigger, content);
  return li;
}

function renderMenu(props: MenuProps = {}): RenderResult {
  const host = document.createElement('div');
  document.body.appendChild(host);

  const element = document.createElement('rafters-navigation-menu');
  if (props.value !== undefined) element.setAttribute('value', props.value);
  if (props.defaultValue !== undefined) element.setAttribute('default-value', props.defaultValue);
  if (props.orientation) element.setAttribute('orientation', props.orientation);
  if (props.delayDuration !== undefined) {
    element.setAttribute('delay-duration', String(props.delayDuration));
  }

  const list = document.createElement('ul');
  list.setAttribute('data-part', 'list');
  list.append(
    item('products', 'Products', [
      ['/one', 'One'],
      ['/two', 'Two'],
    ]),
    item('docs', 'Docs', [['/docs', 'Docs home']]),
  );
  element.appendChild(list);
  host.appendChild(element);

  return { host, root: element, cleanup: () => host.remove() };
}

function triggerFor(root: HTMLElement, value: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`);
  if (!el) throw new Error(`no trigger for ${value}`);
  return el;
}

function contentFor(root: HTMLElement, value: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`);
  if (!el) throw new Error(`no content for ${value}`);
  return el;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('navigation-menu conformance [wc]', () => {
  it('closed: content hidden, root carries the landmark contract', async () => {
    const result = renderMenu();
    try {
      expect(contentFor(result.root, 'products').hidden).toBe(true);
      expect(contentFor(result.root, 'products').getAttribute('data-state')).toBe('closed');
      expect(triggerFor(result.root, 'products').getAttribute('aria-expanded')).toBe('false');
      expect(result.root.getAttribute('aria-label')).toBe('Main navigation');
      await assertAxeClean(result.host);
    } finally {
      result.cleanup();
    }
  });

  it('trigger and content are wired by real ids', () => {
    const result = renderMenu();
    try {
      const trigger = triggerFor(result.root, 'products');
      const content = contentFor(result.root, 'products');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    } finally {
      result.cleanup();
    }
  });

  it('click opens, click again closes, clicking another switches', async () => {
    const user = userEvent.setup();
    const result = renderMenu();
    try {
      await user.click(triggerFor(result.root, 'products'));
      expect(contentFor(result.root, 'products').hidden).toBe(false);
      expect(triggerFor(result.root, 'products').getAttribute('aria-expanded')).toBe('true');
      await assertAxeClean(result.host);

      await user.click(triggerFor(result.root, 'docs'));
      expect(contentFor(result.root, 'products').hidden).toBe(true);
      expect(contentFor(result.root, 'docs').hidden).toBe(false);

      await user.click(triggerFor(result.root, 'docs'));
      expect(contentFor(result.root, 'docs').hidden).toBe(true);
    } finally {
      result.cleanup();
    }
  });

  it('arrow keys rove focus across real light-DOM triggers, with wrap', async () => {
    const user = userEvent.setup();
    const result = renderMenu();
    try {
      triggerFor(result.root, 'products').focus();
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(triggerFor(result.root, 'docs'));
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(triggerFor(result.root, 'products'));
      await user.keyboard('{End}');
      expect(document.activeElement).toBe(triggerFor(result.root, 'docs'));
      await user.keyboard('{Home}');
      expect(document.activeElement).toBe(triggerFor(result.root, 'products'));
    } finally {
      result.cleanup();
    }
  });

  it('Escape closes and returns focus to the open trigger', async () => {
    const user = userEvent.setup();
    const result = renderMenu();
    try {
      await user.click(triggerFor(result.root, 'products'));
      const link = contentFor(result.root, 'products').querySelector('a') as HTMLElement;
      link.focus();
      await user.keyboard('{Escape}');
      expect(contentFor(result.root, 'products').hidden).toBe(true);
      expect(document.activeElement).toBe(triggerFor(result.root, 'products'));
    } finally {
      result.cleanup();
    }
  });

  it('pointerdown outside closes -- the assertion the light-DOM architecture exists for: a real click landing on slotted content must never misread as outside', async () => {
    const user = userEvent.setup();
    const elsewhere = document.createElement('button');
    elsewhere.type = 'button';
    elsewhere.textContent = 'Elsewhere';
    document.body.appendChild(elsewhere);
    const result = renderMenu();
    try {
      await user.click(triggerFor(result.root, 'products'));
      expect(contentFor(result.root, 'products').hidden).toBe(false);

      // A click on the open content itself must NOT be read as outside.
      const link = contentFor(result.root, 'products').querySelector('a') as HTMLElement;
      await user.click(link);
      expect(contentFor(result.root, 'products').hidden).toBe(false);

      await user.click(elsewhere);
      expect(contentFor(result.root, 'products').hidden).toBe(true);
    } finally {
      result.cleanup();
      elsewhere.remove();
    }
  });

  it('hover opens after the delay and closes after leaving', async () => {
    const user = userEvent.setup();
    const result = renderMenu({ delayDuration: 1 });
    try {
      await user.hover(triggerFor(result.root, 'products'));
      await vi.waitFor(() => expect(contentFor(result.root, 'products').hidden).toBe(false));
      await user.unhover(triggerFor(result.root, 'products'));
      await vi.waitFor(() => expect(contentFor(result.root, 'products').hidden).toBe(true));
    } finally {
      result.cleanup();
    }
  });

  it('controlled: attribute drives state, ignoring intrinsic toggles', async () => {
    const user = userEvent.setup();
    const result = renderMenu({ value: '' });
    try {
      await user.click(triggerFor(result.root, 'products'));
      // Controlled: the click is accepted (intrinsic state flips) but the
      // rendered state still reads from the `value` attribute, unchanged.
      expect(contentFor(result.root, 'products').hidden).toBe(true);

      result.root.setAttribute('value', 'products');
      expect(contentFor(result.root, 'products').hidden).toBe(false);
      expect(triggerFor(result.root, 'products').getAttribute('aria-expanded')).toBe('true');
    } finally {
      result.cleanup();
    }
  });
});
