/**
 * Web Component performance of the Kbd score. Kbd is a pure static: the
 * element renders the <kbd> cap with the shared classes and a default slot,
 * performs no binding, and wires no event. `kbd.element.ts` self-registers
 * `rafters-kbd` on import.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { kbdClasses } from '../../../src/components/kbd/kbd.classes';
import { RaftersKbd } from '../../../src/components/kbd/kbd.element';
import { RaftersElement } from '../../../src/primitives/rafters-element';

// Set before any mount: RaftersElement adopts the shared sheet on connect.
RaftersElement.setUtilityCSS('.rounded{border-radius:4px}');

function mount(content = ''): RaftersKbd {
  document.body.innerHTML = `<rafters-kbd>${content}</rafters-kbd>`;
  return document.body.querySelector('rafters-kbd') as RaftersKbd;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('kbd [wc]', () => {
  it('is a registered RaftersKbd with an open shadow root holding only the cap', () => {
    const host = mount('Cmd');
    expect(host).toBeInstanceOf(RaftersKbd);
    const shadow = host.shadowRoot as ShadowRoot;
    expect(shadow.children).toHaveLength(1);
    expect(shadow.querySelector('kbd[data-part="root"]')).not.toBeNull();
  });

  it('the cap carries the shared kbdClasses projection', () => {
    const cap = mount('Cmd').shadowRoot?.querySelector('kbd[data-part="root"]') as HTMLElement;
    expect(cap.className).toBe(kbdClasses({}, {}).root);
  });

  it('the cap holds a default slot assigned the key text', () => {
    const cap = mount('Cmd').shadowRoot?.querySelector('kbd[data-part="root"]') as HTMLElement;
    const slot = cap.querySelector('slot') as HTMLSlotElement;
    expect(slot.getAttribute('name')).toBeNull();
    expect(
      slot
        .assignedNodes()
        .map((n) => n.textContent)
        .join(''),
    ).toBe('Cmd');
  });

  it('the cap carries no role and no aria attribute', () => {
    const cap = mount('Cmd').shadowRoot?.querySelector('kbd[data-part="root"]') as HTMLElement;
    expect(cap.getAttribute('role')).toBeNull();
    expect([...cap.attributes].some((a) => a.name.startsWith('aria-'))).toBe(false);
  });

  it('observedAttributes is empty', () => {
    expect(RaftersKbd.observedAttributes).toEqual([]);
  });

  it('the host computes display: inline-flex', () => {
    expect(getComputedStyle(mount('Cmd')).display).toBe('inline-flex');
  });

  it('the shared utility sheet applies inside the shadow root', () => {
    const cap = mount('Cmd').shadowRoot?.querySelector('kbd[data-part="root"]') as HTMLElement;
    expect(getComputedStyle(cap).borderTopLeftRadius).toBe('4px');
  });

  it('an empty element renders an empty cap and does not throw', () => {
    const host = mount();
    expect(host.shadowRoot?.querySelector('kbd[data-part="root"]')).not.toBeNull();
  });
});
