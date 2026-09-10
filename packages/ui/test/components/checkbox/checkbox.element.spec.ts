/**
 * WC render + performance of the checkbox score, driven end to end.
 *
 * The Web Component is a light-DOM enhancer: the author provides a real inner
 * `<button data-part="root" role="checkbox">` so native Enter/Space activation
 * survives, plus a sibling hidden input for form association. This test
 * server-renders that markup with the score's initial projection already
 * applied -- exactly what Astro emits -- then lets RaftersCheckbox hand the root
 * to bindCheckbox (the SAME controller React composes).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { checkbox, type CheckboxConfig } from '../../../src/components/checkbox/checkbox.behavior';
import { checkboxClasses } from '../../../src/components/checkbox/checkbox.classes';
import { RaftersCheckbox } from '../../../src/components/checkbox/checkbox.element';

interface ScenarioProps {
  checked?: CheckboxConfig['checked'];
  disabled?: boolean;
  required?: boolean;
  variant?: CheckboxConfig['variant'];
  size?: CheckboxConfig['size'];
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'unchecked default', props: {} },
  { name: 'checked', props: { checked: true } },
  { name: 'indeterminate', props: { checked: 'indeterminate' } },
  { name: 'required', props: { required: true } },
  { name: 'hard disabled', props: { disabled: true } },
  { name: 'destructive lg checked', props: { checked: true, variant: 'destructive', size: 'lg' } },
];

function configFor(props: ScenarioProps): CheckboxConfig {
  return {
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
  };
}

function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

function glyph(className: string, d: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  return svg;
}

beforeAll(() => {
  if (!customElements.get('rafters-checkbox')) {
    customElements.define('rafters-checkbox', RaftersCheckbox);
  }
});

async function mount(props: ScenarioProps, label: string): Promise<HTMLElement> {
  const config = configFor(props);
  const state = checkbox.initialState(config);
  const ids = { root: 'wc-root' };
  const aria = checkbox.aria(state, config, ids);
  const classes = checkboxClasses(config, state);

  const host = document.createElement('rafters-checkbox');

  const root = document.createElement('button');
  root.type = 'button';
  root.dataset['part'] = 'root';
  root.id = ids.root;
  root.className = classes.root;
  if (props.disabled) root.disabled = true;
  root.setAttribute('aria-label', label);
  if (aria.root) applyAria(root, aria.root);
  root.appendChild(glyph(classes.check, 'M5 13l4 4L19 7'));
  root.appendChild(glyph(classes.dash, 'M5 12h14'));

  host.appendChild(root);
  document.body.appendChild(host);
  // connectedCallback defers the bind one microtask (upgrade order); wait for it.
  await Promise.resolve();
  return root;
}

describe('checkbox conformance [wc]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const root = await mount(scenario.props, 'Accept terms');
      try {
        const config = configFor(scenario.props);
        const state = checkbox.initialState(config);
        const projection = checkbox.aria(state, config, { root: root.id })['root'];
        for (const [attr, value] of Object.entries(projection ?? {})) {
          if (value === undefined) {
            expect(root.hasAttribute(attr), `root must NOT render ${attr}`).toBe(false);
          } else {
            expect(root.getAttribute(attr), `root ${attr}`).toBe(String(value));
          }
        }
      } finally {
        root.closest('rafters-checkbox')?.remove();
      }
    });
  }

  it('Space toggles aria-checked false -> true -> false (native button key path)', async () => {
    const root = await mount({}, 'Subscribe');
    try {
      expect(root.getAttribute('aria-checked')).toBe('false');
      const user = userEvent.setup();
      root.focus();
      await user.keyboard(' ');
      expect(root.getAttribute('aria-checked')).toBe('true');
      expect(root.getAttribute('data-state')).toBe('checked');
      await user.keyboard(' ');
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      root.closest('rafters-checkbox')?.remove();
    }
  });

  it('click toggles the checked axis', async () => {
    const root = await mount({}, 'Subscribe');
    try {
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('true');
    } finally {
      root.closest('rafters-checkbox')?.remove();
    }
  });

  it('indeterminate toggles to checked (mixed -> true), never back to mixed', async () => {
    const root = await mount({ checked: 'indeterminate' }, 'Select all');
    try {
      expect(root.getAttribute('aria-checked')).toBe('mixed');
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('true');
    } finally {
      root.closest('rafters-checkbox')?.remove();
    }
  });

  it('hard disabled: native disabled, no aria-disabled, click does not toggle', async () => {
    const root = await mount({ disabled: true }, 'Locked');
    try {
      expect(root.hasAttribute('disabled')).toBe(true);
      expect(root.hasAttribute('aria-disabled')).toBe(false);
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      root.closest('rafters-checkbox')?.remove();
    }
  });
});
