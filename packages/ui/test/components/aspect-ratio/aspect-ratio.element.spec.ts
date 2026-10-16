import { expect, it } from 'vitest';
import { parseRatio } from '../../../src/components/aspect-ratio/aspect-ratio.behavior';
import { aspectRatioBaseClasses } from '../../../src/components/aspect-ratio/aspect-ratio.classes';
import { RaftersAspectRatio } from '../../../src/components/aspect-ratio/aspect-ratio.element';

const mount = (attrs: string): HTMLElement => {
  document.body.innerHTML = `<main><rafters-aspect-ratio ${attrs}><img alt="Cover" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></rafters-aspect-ratio></main>`;
  const host = document.querySelector('rafters-aspect-ratio');
  if (!(host instanceof HTMLElement)) throw new Error('rafters-aspect-ratio did not mount');
  return host;
};
const rootOf = (host: HTMLElement): HTMLElement => {
  const root = host.shadowRoot?.querySelector('[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  return root;
};

it('performs ratio, root part, slot and fill', () => {
  const host = mount('ratio="16/9"');
  expect(host).toBeInstanceOf(RaftersAspectRatio);
  const root = rootOf(host);
  expect(root.className).toBe(aspectRatioBaseClasses);
  expect(root.getAttribute('role')).toBeNull();
  expect(root.getAttributeNames().filter((n) => n.startsWith('aria-'))).toEqual([]);
  expect(Number.parseFloat(root.style.getPropertyValue('aspect-ratio'))).toBeCloseTo(
    parseRatio('16/9'),
  );
  const img = host.querySelector('img');
  if (!(img instanceof HTMLImageElement)) throw new Error('no img');
  const slot = root.querySelector('slot');
  if (!(slot instanceof HTMLSlotElement)) throw new Error('no slot');
  expect(slot.assignedElements()).toEqual([img]);
  expect(getComputedStyle(img).position).toBe('absolute');
  expect(getComputedStyle(img).objectFit).toBe('fill');
});

it('falls back to 1 for a malformed ratio', () => {
  for (const bad of ['', 'ratio=""', 'ratio="abc"', 'ratio="0"', 'ratio="-2"', 'ratio="4/0"']) {
    expect(Number.parseFloat(rootOf(mount(bad)).style.getPropertyValue('aspect-ratio'))).toBe(1);
  }
});
