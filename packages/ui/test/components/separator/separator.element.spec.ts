import { expect, it } from 'vitest';
import '../../../src/components/separator/separator.element';
import {
  separator,
  type SeparatorConfig,
} from '../../../src/components/separator/separator.behavior';
import { separatorClasses } from '../../../src/components/separator/separator.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-separator');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-separator did not mount');
  return el;
}

function rootOf(el: HTMLElement): HTMLElement {
  const root = el.shadowRoot?.querySelector('[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  return root;
}

function expectPerforms(el: HTMLElement, config: SeparatorConfig): void {
  const aria = separator.aria({}, config, { root: '' }).root ?? {};
  const root = rootOf(el);
  expect(el.shadowRoot?.children.length).toBe(1);
  expect(root.matches('div[data-part="root"]')).toBe(true);
  expect(el.shadowRoot?.querySelector('slot')).toBeNull();
  expect(root.className).toBe(separatorClasses(config, {}).root);
  expect(root.getAttribute('role')).toBe(aria.role ?? null);
  expect(root.getAttribute('aria-orientation')).toBe(aria['aria-orientation'] ?? null);
}

it('defaults to a decorative horizontal rule', () => {
  const el = mount('<rafters-separator></rafters-separator>');
  expectPerforms(el, { orientation: 'horizontal', decorative: true });
  expect(rootOf(el).getAttribute('role')).toBe('none');
  expect(rootOf(el).getAttribute('aria-orientation')).toBeNull();
});

it('a present decorative attribute (not "false") is semantic', () => {
  expectPerforms(
    mount('<rafters-separator orientation="vertical" decorative=""></rafters-separator>'),
    { orientation: 'vertical', decorative: false },
  );
});

it('semantic horizontal', () => {
  const el = mount('<rafters-separator decorative="semantic"></rafters-separator>');
  expectPerforms(el, { orientation: 'horizontal', decorative: false });
  expect(rootOf(el).getAttribute('role')).toBe('separator');
});

it('decorative vertical', () => {
  expectPerforms(mount('<rafters-separator orientation="vertical"></rafters-separator>'), {
    orientation: 'vertical',
    decorative: true,
  });
});

it('decorative="false" stays decorative', () => {
  expectPerforms(mount('<rafters-separator decorative="false"></rafters-separator>'), {
    orientation: 'horizontal',
    decorative: true,
  });
});

it('an unknown orientation renders as horizontal', () => {
  expectPerforms(mount('<rafters-separator orientation="diagonal"></rafters-separator>'), {
    orientation: 'horizontal',
    decorative: true,
  });
});

it('re-renders on orientation change', () => {
  const el = mount('<rafters-separator decorative=""></rafters-separator>');
  el.setAttribute('orientation', 'vertical');
  expectPerforms(el, { orientation: 'vertical', decorative: false });
});

it('re-renders on decorative change', () => {
  const el = mount('<rafters-separator></rafters-separator>');
  el.setAttribute('decorative', '');
  expectPerforms(el, { orientation: 'horizontal', decorative: false });
  el.setAttribute('decorative', 'false');
  expectPerforms(el, { orientation: 'horizontal', decorative: true });
});
