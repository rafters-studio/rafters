/**
 * Web Component performance of the ButtonGroup score. The SAME score as the
 * React and Astro conformances -- but ButtonGroup is a PURE STATIC, so there
 * is no controller to drive. The host IS the adjoining root: role="group",
 * data-orientation, and data-part="root" are reflected onto it, and the
 * connected-border rules live as ::slotted shadow CSS (the Tailwind descendant
 * selectors of the React/Astro surface cannot cross the shadow boundary). These
 * assertions prove the one contract (host carries role=group + the resolved
 * orientation, buttons project through the slot) holds in the shadow-DOM
 * performance too. Axe cleanliness for this markup is asserted in the .a11y
 * tier, not here.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buttonGroup } from '../../../src/components/button-group/button-group.behavior';
import { RaftersButtonGroup } from '../../../src/components/button-group/button-group.element';

beforeAll(() => {
  if (!customElements.get('rafters-button-group')) {
    customElements.define('rafters-button-group', RaftersButtonGroup);
  }
});

function mount(attrs = '', slots = ''): HTMLElement {
  document.body.innerHTML = `<rafters-button-group ${attrs}>${slots}</rafters-button-group>`;
  return document.body.querySelector('rafters-button-group') as HTMLElement;
}

const BUTTONS = '<button type="button">Bold</button><button type="button">Italic</button>';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('button-group [wc]', () => {
  it('the host IS the root and fulfills the contract: role=group', () => {
    const host = mount('aria-label="Text style"', BUTTONS);
    const projection = buttonGroup.aria({}, { orientation: 'horizontal' }, { root: host.id });
    expect(host.getAttribute('role')).toBe(projection.root?.['role']);
  });

  it('reflects the resolved orientation onto the host', () => {
    expect(mount('orientation="vertical"', BUTTONS).getAttribute('data-orientation')).toBe(
      'vertical',
    );
    expect(mount('orientation="sideways"', BUTTONS).getAttribute('data-orientation')).toBe(
      'horizontal',
    );
    expect(mount('', BUTTONS).getAttribute('data-orientation')).toBe('horizontal');
  });

  it('re-reflects orientation when the attribute changes', () => {
    const host = mount('orientation="horizontal"', BUTTONS);
    host.setAttribute('orientation', 'vertical');
    expect(host.getAttribute('data-orientation')).toBe('vertical');
  });

  it('slotted light-DOM buttons pass through the default slot', () => {
    const host = mount('aria-label="Text style"', BUTTONS);
    const slot = host.shadowRoot?.querySelector<HTMLSlotElement>('slot');
    const assigned = slot?.assignedElements() ?? [];
    expect(assigned.map((n) => n.textContent).join('')).toContain('Bold');
    expect(assigned.length).toBe(2);
  });
});
