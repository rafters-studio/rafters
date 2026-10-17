import { expect, it } from 'vitest';
import '../../../src/components/skeleton/skeleton.element';
import { skeleton } from '../../../src/components/skeleton/skeleton.behavior';
import { skeletonClasses } from '../../../src/components/skeleton/skeleton.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-skeleton');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-skeleton did not mount');
  return el;
}

it('performs the decorative placeholder in its shadow root', () => {
  const el = mount('<rafters-skeleton></rafters-skeleton>');
  expect(el.shadowRoot?.children.length).toBe(1);
  expect(el.shadowRoot?.querySelector('slot')).toBeNull();
  const root = el.shadowRoot?.querySelector('div[data-part="root"][data-slot="skeleton"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  expect(root.className).toBe(skeletonClasses({}, {}).root);
  for (const [key, value] of Object.entries(skeleton.aria({}, {}, { root: '' }).root ?? {})) {
    expect(root.getAttribute(key)).toBe(value === undefined ? null : String(value));
  }
});
