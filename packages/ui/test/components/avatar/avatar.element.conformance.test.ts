/**
 * Web Component performance of the Avatar score. The SAME score as the React
 * conformance test -- but the WC is a caller-decides static (the oracle
 * deferred runtime image-load coordination), so presence comes from the
 * `status` attribute (defaulted from `src`) through the shared `resolveAvatar`,
 * with no controller to drive.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersAvatar } from '../../../src/components/avatar/avatar.element';
import { avatar } from '../../../src/components/avatar/avatar.behavior';
import { avatarSizeClasses } from '../../../src/components/avatar/avatar.classes';
import { assertContractFulfillment } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-avatar')) {
    customElements.define('rafters-avatar', RaftersAvatar);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-avatar ${attrs}>${slots}</rafters-avatar>`;
  return document.body.querySelector('rafters-avatar') as HTMLElement;
}

function rootPart(host: HTMLElement): HTMLElement {
  return host.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

function part(host: HTMLElement, name: string): HTMLElement | null {
  return host.shadowRoot?.querySelector<HTMLElement>(`[data-part="${name}"]`) ?? null;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('avatar conformance [wc]', () => {
  it('renders a root part carrying the shared base + size classes', () => {
    const host = mount();
    const root = rootPart(host);
    expect(root).not.toBeNull();
    expect(root.className).toContain('rounded-full');
    expect(root.className).toContain(avatarSizeClasses.md);
  });

  it('fulfills the contract: root projects NO ARIA (empty, like React)', () => {
    const host = mount('status="error"');
    const root = rootPart(host);
    assertContractFulfillment(avatar, root, {}, { size: 'md', status: 'error' }, ['root']);
    expect(root.getAttribute('role')).toBeNull();
  });

  it('a present src with no status renders the image only (oracle default)', () => {
    const host = mount('src="/user.jpg" alt="Jane Doe"');
    expect(part(host, 'image')).not.toBeNull();
    expect(part(host, 'fallback')).toBeNull();
  });

  it('no src and no status falls straight back to the fallback slot', () => {
    const host = mount('', 'JD');
    expect(part(host, 'image')).toBeNull();
    const fallback = part(host, 'fallback');
    expect(fallback).not.toBeNull();
    expect(fallback?.querySelector('slot')).not.toBeNull();
  });

  it('status="error" removes the image and shows the fallback', () => {
    const host = mount('src="/user.jpg" status="error"', 'JD');
    expect(part(host, 'image')).toBeNull();
    expect(part(host, 'fallback')).not.toBeNull();
  });

  it('status="loading" keeps both the image and the fallback', () => {
    const host = mount('src="/user.jpg" status="loading" alt="Jane Doe"', 'JD');
    expect(part(host, 'image')).not.toBeNull();
    expect(part(host, 'fallback')).not.toBeNull();
  });

  it('reflects the size attribute onto the root class string', () => {
    const host = mount('size="xl" src="/user.jpg" alt="Jane Doe"');
    expect(rootPart(host).className).toContain(avatarSizeClasses.xl);
  });

  it('re-renders when the status attribute changes after connect', () => {
    const host = mount('src="/user.jpg" alt="Jane Doe"');
    expect(part(host, 'image')).not.toBeNull();
    host.setAttribute('status', 'error');
    expect(part(host, 'image')).toBeNull();
    expect(part(host, 'fallback')).not.toBeNull();
  });

  it('the loaded image carries its alt for assistive tech', () => {
    const host = mount('src="/user.jpg" alt="Jane Doe"');
    const image = part(host, 'image') as HTMLImageElement;
    expect(image.getAttribute('alt')).toBe('Jane Doe');
  });

  it('is axe-clean', async () => {
    document.body.innerHTML =
      '<main><rafters-avatar src="/user.jpg" alt="Jane Doe">JD</rafters-avatar></main>';
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
