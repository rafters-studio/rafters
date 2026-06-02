import { afterEach, describe, expect, it } from 'vitest';
import './avatar.element';
import { avatarSizeClasses } from './avatar.classes';
import { composeAvatarClasses, RaftersAvatar } from './avatar.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-avatar');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function innerClass(el: Element): string {
  return el.shadowRoot?.querySelector('span')?.className ?? '';
}

describe('<rafters-avatar>', () => {
  it('registers the rafters-avatar tag on import', () => {
    expect(customElements.get('rafters-avatar')).toBe(RaftersAvatar);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./avatar.element')).resolves.toBeDefined();
    await expect(import('./avatar.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-avatar')).toBe(RaftersAvatar);
  });

  it('renders a single span containing a slot', () => {
    const el = mount();
    const span = el.shadowRoot?.querySelector('span');
    expect(span).not.toBeNull();
    expect(span?.children.length).toBe(1);
    expect(span?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('applies base + default size md classes', () => {
    const el = mount();
    expect(innerClass(el)).toBe(composeAvatarClasses('md'));
  });

  it('falls back to default size md for unknown values', () => {
    const el = mount({ size: 'mega' });
    expect(innerClass(el)).toContain(avatarSizeClasses.md);
  });

  it('reflects size attribute changes to the inner class string', () => {
    const el = mount();
    el.setAttribute('size', 'xl');
    expect(innerClass(el)).toContain(avatarSizeClasses.xl);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'avatar.element.ts'), 'utf-8');
    expect(source).not.toMatch(/var\(/);
  });
});
