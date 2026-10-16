import { expect, it } from 'vitest';
import { AVATAR_SIZES } from '../../../src/components/avatar/avatar.behavior';
import { avatarClasses } from '../../../src/components/avatar/avatar.classes';
import { RaftersAvatar } from '../../../src/components/avatar/avatar.element';

const SRC = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

function mount(attrs: string, children = 'AL'): HTMLElement {
  document.body.innerHTML = `<main><rafters-avatar ${attrs}>${children}</rafters-avatar></main>`;
  const el = document.querySelector('rafters-avatar');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-avatar did not mount');
  return el;
}

function part(host: HTMLElement, name: string): HTMLElement | null {
  return host.shadowRoot?.querySelector<HTMLElement>(`[data-part="${name}"]`) ?? null;
}

it('renders the image only when src is present and status defaults to loaded', () => {
  const host = mount(`src="${SRC}" alt="Ada"`);
  expect(host).toBeInstanceOf(RaftersAvatar);
  expect(part(host, 'root')?.className).toBe(avatarClasses({ status: 'loaded' }).root);
  const image = part(host, 'image');
  if (!(image instanceof HTMLImageElement)) throw new Error('no image part');
  expect(image.alt).toBe('Ada');
  expect(image.getAttribute('src')).toBe(SRC);
  expect(image.className).toBe(avatarClasses({ status: 'loaded' }).image);
  expect(part(host, 'fallback')).toBeNull();
});

it('renders only the slotted fallback without src', () => {
  const host = mount('');
  expect(part(host, 'image')).toBeNull();
  const fallback = part(host, 'fallback');
  if (!fallback) throw new Error('no fallback part');
  expect(fallback.className).toBe(avatarClasses({ status: 'error' }).fallback);
  const slot = fallback.querySelector('slot');
  expect(slot?.assignedNodes()[0]?.textContent).toBe('AL');
});

it('honours a declared status', () => {
  const loading = mount(`src="${SRC}" alt="Ada" status="loading"`);
  expect(part(loading, 'image')).not.toBeNull();
  expect(part(loading, 'fallback')).not.toBeNull();
  const error = mount(`src="${SRC}" alt="Ada" status="error"`);
  expect(part(error, 'image')).toBeNull();
  expect(part(error, 'fallback')).not.toBeNull();
  const loaded = mount(`src="${SRC}" alt="Ada" status="loaded"`);
  expect(part(loaded, 'image')).not.toBeNull();
  expect(part(loaded, 'fallback')).toBeNull();
  const unknown = mount(`src="${SRC}" status="bogus"`);
  expect(part(unknown, 'image')).not.toBeNull();
  expect(part(unknown, 'fallback')).toBeNull();
});

it('renders each size and falls back to md', () => {
  for (const size of AVATAR_SIZES) {
    expect(part(mount(`size="${size}"`), 'root')?.className).toBe(avatarClasses({ size }).root);
  }
  expect(part(mount('size="huge"'), 'root')?.className).toBe(avatarClasses({}).root);
});

it('carries no role or aria attribute on any part', () => {
  const host = mount(`src="${SRC}" alt="Ada" status="loading"`);
  for (const name of ['root', 'image', 'fallback']) {
    const el = part(host, name);
    if (!el) throw new Error(`no ${name} part`);
    expect(el.hasAttribute('role')).toBe(false);
    expect([...el.attributes].some((a) => a.name.startsWith('aria-'))).toBe(false);
  }
});
