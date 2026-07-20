/**
 * Astro performance of the accordion score, driven end to end. AstroContainer
 * renders the SSR markup with the initial projection already applied, but does
 * NOT run the <script>, so the test calls bindAccordion directly -- that IS the
 * script's job -- then drives the same score the React and WC performances
 * drive. One score, three performances.
 */
import userEvent from '@testing-library/user-event';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Accordion from '../../../src/components/accordion/accordion.astro';
import { bindAccordion } from '../../../src/components/accordion/accordion.behavior';

const items = [
  { value: 'a', label: 'Alpha', body: 'Body alpha' },
  { value: 'b', label: 'Beta', body: 'Body beta' },
  { value: 'c', label: 'Gamma', body: 'Body gamma' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Accordion, {
    props: { id: 'faq', items, ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"]') as HTMLElement;
  bindAccordion(root); // the <script> does this per instance on the real page
  return root;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;

describe('accordion conformance [astro]', () => {
  it('SSR: the seeded section is open and the rest are hidden before any JS', async () => {
    const root = await mount({ value: 'b' });
    expect(root.getAttribute('data-orientation')).toBe('vertical');
    expect(root.getAttribute('data-type')).toBe('single');
    expect(trigger('b').getAttribute('aria-expanded')).toBe('true');
    expect(content('b').hasAttribute('hidden')).toBe(false);
    expect(content('a').hasAttribute('hidden')).toBe(true);
  });

  it('SSR: panel bodies are in the markup even while collapsed -- crawlable', async () => {
    await mount();
    expect(content('a').textContent).toContain('Body alpha');
    expect(content('a').hasAttribute('hidden')).toBe(true);
  });

  it('SSR: ids are minted from the root id and cross-referenced both ways', async () => {
    await mount();
    expect(trigger('a').id).toBe('faq-trigger-a');
    expect(content('a').id).toBe('faq-content-a');
    expect(trigger('a').getAttribute('aria-controls')).toBe('faq-content-a');
    expect(content('a').getAttribute('aria-labelledby')).toBe('faq-trigger-a');
  });

  it('SSR: each header sits in a role=heading wrapper at the configured level', async () => {
    await mount({ headingLevel: 2 });
    const heading = trigger('a').parentElement as HTMLElement;
    expect(heading.getAttribute('role')).toBe('heading');
    expect(heading.getAttribute('aria-level')).toBe('2');
  });

  it('SSR: panels are regions named by their header', async () => {
    await mount();
    expect(content('a').getAttribute('role')).toBe('region');
  });

  it('single: clicking a header opens it and closes the previous one', async () => {
    const user = userEvent.setup();
    await mount({ value: 'a' });
    await user.click(trigger('b'));
    expect(content('b').hasAttribute('hidden')).toBe(false);
    expect(content('a').hasAttribute('hidden')).toBe(true);
  });

  it('single collapsible: re-clicking the open header collapses everything', async () => {
    const user = userEvent.setup();
    await mount({ value: 'a', collapsible: true });
    await user.click(trigger('a'));
    expect(content('a').hasAttribute('hidden')).toBe(true);
  });

  it('multiple: SSR seeds every value and clicks accumulate', async () => {
    const user = userEvent.setup();
    await mount({ type: 'multiple', value: ['a', 'c'] });
    expect(content('a').hasAttribute('hidden')).toBe(false);
    expect(content('c').hasAttribute('hidden')).toBe(false);
    await user.click(trigger('b'));
    expect(content('b').hasAttribute('hidden')).toBe(false);
    expect(content('a').hasAttribute('hidden')).toBe(false);
  });

  it('ArrowDown/ArrowUp rove focus across the headers', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(trigger('b'));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(trigger('a'));
  });

  it('Space toggles the focused header', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('c').focus();
    await user.keyboard(' ');
    expect(content('c').hasAttribute('hidden')).toBe(false);
  });

  it('a disabled section is natively disabled and refuses activation', async () => {
    const user = userEvent.setup();
    await mount({
      items: [
        { value: 'a', label: 'Alpha', body: 'Body alpha' },
        { value: 'b', label: 'Beta', body: 'Body beta', disabled: true },
      ],
    });
    expect(trigger('b').hasAttribute('disabled')).toBe(true);
    await user.click(trigger('b'));
    expect(content('b').hasAttribute('hidden')).toBe(true);
  });
});
