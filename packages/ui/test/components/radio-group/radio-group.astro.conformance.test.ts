/**
 * Astro performance of the radio-group score, driven end to end. AstroContainer
 * renders the SSR markup with the initial projection already applied, but does
 * NOT run the <script>, so the test calls bindRadioGroup directly -- that IS the
 * script's job -- then drives the same score the React and WC performances
 * drive. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import RadioGroup from '../../../src/components/radio-group/radio-group.astro';
import { bindRadioGroup } from '../../../src/components/radio-group/radio-group.behavior';

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(RadioGroup, {
    props: { id: 'rg', items, ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"][role="radiogroup"]') as HTMLElement;
  bindRadioGroup(root); // the <script> does this per instance on the real page
  return root;
}

const item = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!;

describe('radio-group conformance [astro]', () => {
  it('SSR: radiogroup + radio items, the seeded value checked, orientation reflected', async () => {
    await mount({ value: 'b', orientation: 'horizontal' });
    const root = document.body.querySelector('[data-part="root"]');
    expect(root?.getAttribute('role')).toBe('radiogroup');
    expect(root?.getAttribute('aria-orientation')).toBe('horizontal');
    expect(item('b').getAttribute('aria-checked')).toBe('true');
    expect(item('b').getAttribute('data-state')).toBe('checked');
    expect(item('a').getAttribute('aria-checked')).toBe('false');
  });

  it('click selects an item and reflects the projection', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(item('a'));
    expect(item('a').getAttribute('aria-checked')).toBe('true');
    expect(item('a').getAttribute('data-state')).toBe('checked');
  });

  it('arrow keys move focus AND select the newly focused item', async () => {
    const user = userEvent.setup();
    await mount();
    item('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(item('b'));
    expect(item('b').getAttribute('aria-checked')).toBe('true');
  });

  it('Space selects the focused item', async () => {
    const user = userEvent.setup();
    await mount();
    item('c').focus();
    await user.keyboard(' ');
    expect(item('c').getAttribute('aria-checked')).toBe('true');
  });
});
