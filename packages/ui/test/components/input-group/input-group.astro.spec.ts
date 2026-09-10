/**
 * Astro performance of the input-group score, driven end to end. AstroContainer
 * renders the SSR assembly with the projection already applied, but does NOT run
 * the `<script>`, so the test calls bindInputGroup directly on the root -- that
 * IS the script's job -- then drives the same score React and the WC drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import InputGroup from '../../../src/components/input-group/input-group.astro';
import {
  bindInputGroup,
  type InputGroupConfig,
  type InputGroupPart,
  type InputGroupState,
  inputGroupBehavior,
} from '../../../src/components/input-group/input-group.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

function assertAriaContract(
  root: HTMLElement,
  state: InputGroupState,
  config: InputGroupConfig,
  expectedParts: ReadonlyArray<InputGroupPart>,
): void {
  for (const part of expectedParts) {
    expect(partElement(root, part), `declared part "${part}" must be rendered`).not.toBeNull();
  }
  const allParts = Object.keys(inputGroupBehavior.parts) as InputGroupPart[];
  const ids = {} as Record<InputGroupPart, string>;
  for (const part of allParts) {
    ids[part] = partElement(root, part)?.id ?? '';
  }
  const projection = inputGroupBehavior.aria(state, config, ids);
  for (const part of expectedParts) {
    const el = partElement(root, part);
    const attrs = projection[part];
    if (!attrs || !el) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(el.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr)).toBe(String(value));
      }
    }
  }
}

async function mount(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(InputGroup, {
    props: { id: 'amount', 'aria-label': 'Amount', ...props },
    slots,
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector<HTMLElement>(
    'rafters-input-group[data-part="root"]',
  ) as HTMLElement;
  bindInputGroup(root);
  return root;
}

const control = () => document.body.querySelector<HTMLInputElement>('[data-part="control"]')!;

describe('input-group conformance [astro]', () => {
  it('valid: SSR markup fulfils the contract with both affixes', async () => {
    const root = await mount({}, { start: '$', end: 'USD' });
    assertAriaContract(root, {}, { invalid: false }, ['root', 'control', 'addonStart', 'addonEnd']);
    expect(control().hasAttribute('aria-invalid')).toBe(false);
    expect(root.getAttribute('data-state')).toBe('default');
  });

  it('renders no affix cell for an unfilled side', async () => {
    const root = await mount({}, { start: '$' });
    expect(partElement(root, 'addonStart')).not.toBeNull();
    expect(partElement(root, 'addonEnd')).toBeNull();
  });

  it('invalid: server-rendered projection puts aria-invalid on the control', async () => {
    const root = await mount({ invalid: true }, { start: '$' });
    assertAriaContract(root, {}, { invalid: true }, ['root', 'control', 'addonStart']);
    expect(control().getAttribute('aria-invalid')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('invalid');
  });

  it('affixes carry the side they sit on', async () => {
    const root = await mount({}, { start: '$', end: 'USD' });
    expect(partElement(root, 'addonStart')?.getAttribute('data-position')).toBe('start');
    expect(partElement(root, 'addonEnd')?.getAttribute('data-position')).toBe('end');
  });

  it('a disabled group server-renders the control already disabled', async () => {
    await mount({ disabled: true });
    expect(control().disabled).toBe(true);
  });

  it('reflects the size onto the host signal the client reads back', async () => {
    const root = await mount({ size: 'sm' });
    expect(root.getAttribute('data-size')).toBe('sm');
  });

  it('the contained control keeps its own value: typing works', async () => {
    const user = userEvent.setup();
    await mount({}, { start: '$' });
    await user.type(control(), '42');
    expect(control().value).toBe('42');
  });
});
