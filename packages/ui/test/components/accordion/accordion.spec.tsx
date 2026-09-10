/**
 * React performance of the accordion score, driven end to end. Expansion
 * moves only through dispatched actions, and focus movement is the composed
 * roving-focus primitive.
 */
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../../src/components/accordion/accordion';
import {
  accordion,
  accordionInstanceAria,
  type AccordionConfig,
  type AccordionPart,
  type AccordionState,
} from '../../../src/components/accordion/accordion.behavior';

interface SetupProps {
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  collapsible?: boolean;
  disabled?: boolean;
  headingLevel?: number;
  disabledItem?: string;
}

function TestAccordion({ disabledItem, ...props }: SetupProps) {
  return (
    <Accordion {...props}>
      {['a', 'b', 'c'].map((value) => (
        <AccordionItem key={value} value={value} disabled={disabledItem === value}>
          <AccordionTrigger>Section {value}</AccordionTrigger>
          <AccordionContent>Body {value}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

const body = () => document.body;

function triggerFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`);
  if (!element) throw new Error(`no trigger for ${value}`);
  return element;
}

function contentFor(value: string): HTMLElement {
  const element = body().querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`);
  if (!element) throw new Error(`no content for ${value}`);
  return element;
}

function partElement(root: ParentNode, part: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

/** Assert every rendered instance of a many part against the score's own
 *  instanceAria projection, reading sibling ids off the real DOM the way the
 *  score requires (behaviors never generate ids). */
function assertInstanceAria(
  root: HTMLElement,
  state: AccordionState,
  config: AccordionConfig,
): void {
  const manyParts = (Object.keys(accordion.parts) as AccordionPart[]).filter(
    (part) => accordion.parts[part].many,
  );
  for (const part of manyParts) {
    for (const element of root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)) {
      const value = element.dataset['value'];
      if (value === undefined) continue;
      const ids: Partial<Record<AccordionPart, string>> = {};
      for (const sibling of manyParts) {
        ids[sibling] =
          root.querySelector<HTMLElement>(`[data-part="${sibling}"][data-value="${value}"]`)?.id ??
          '';
      }
      const projected = accordionInstanceAria(part, value, state, config, ids);
      for (const [attr, expected] of Object.entries(projected)) {
        if (expected === undefined) {
          expect(
            element.hasAttribute(attr),
            `"${value}" of "${part}" must NOT render ${attr}`,
          ).toBe(false);
        } else if (typeof expected === 'boolean') {
          // A boolean projection (accordion's `inert`) asserts PRESENCE, not a
          // serialized value: React writes hidden={true} as `inert=""` while
          // the DOM-native binding writes `inert="true"`. hasAttribute is the
          // only check that holds across both.
          expect(element.hasAttribute(attr), `"${value}" of "${part}" ${attr}`).toBe(expected);
        } else {
          expect(element.getAttribute(attr), `"${value}" of "${part}" ${attr}`).toBe(
            String(expected),
          );
        }
      }
    }
  }
}

afterEach(() => {
  cleanup();
});

describe('accordion conformance [react]', () => {
  it('collapsed: panels stay in the DOM, inert -- the body is crawlable', async () => {
    render(<TestAccordion />);
    expect(body().querySelectorAll('[data-part="content"]')).toHaveLength(3);
    // inert, never hidden: removed from the a11y tree + tab order while staying
    // rendered so the grid-rows transition can run.
    expect(contentFor('a').hasAttribute('inert')).toBe(true);
    expect(contentFor('a').hasAttribute('hidden')).toBe(false);
    expect(contentFor('a').getAttribute('data-state')).toBe('closed');
    expect(triggerFor('a').getAttribute('aria-expanded')).toBe('false');
  });

  it('each header button sits inside a role=heading wrapper at the configured level', async () => {
    render(<TestAccordion headingLevel={2} defaultValue="a" />);
    const heading = triggerFor('a').parentElement as HTMLElement;
    expect(heading.getAttribute('role')).toBe('heading');
    expect(heading.getAttribute('aria-level')).toBe('2');
    expect(partElement(body(), 'root')?.getAttribute('data-heading-level')).toBe('2');
  });

  it('trigger and panel are wired by real ids, collapsed as well as expanded', () => {
    render(<TestAccordion defaultValue="a" />);
    for (const value of ['a', 'b']) {
      expect(triggerFor(value).getAttribute('aria-controls')).toBe(contentFor(value).id);
      expect(contentFor(value).getAttribute('aria-labelledby')).toBe(triggerFor(value).id);
    }
    expect(contentFor('b').hasAttribute('inert')).toBe(true);
  });

  it('per-instance ARIA equals the score projection, collapsed and expanded', async () => {
    const user = userEvent.setup();
    render(<TestAccordion />);
    const root = partElement(body(), 'root') as HTMLElement;
    assertInstanceAria(root, { value: [], multiple: false, collapsible: false }, {});
    await user.click(triggerFor('b'));
    assertInstanceAria(root, { value: ['b'], multiple: false, collapsible: false }, {});
  });

  it('single: opening a section closes the previously open one', async () => {
    const user = userEvent.setup();
    render(<TestAccordion defaultValue="a" />);
    await user.click(triggerFor('b'));
    expect(contentFor('b').hasAttribute('inert')).toBe(false);
    expect(contentFor('a').hasAttribute('inert')).toBe(true);
  });

  it('single non-collapsible: clicking the open header keeps it open', async () => {
    const user = userEvent.setup();
    render(<TestAccordion defaultValue="a" />);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hasAttribute('inert')).toBe(false);
  });

  it('single collapsible: clicking the open header closes everything', async () => {
    const user = userEvent.setup();
    render(<TestAccordion defaultValue="a" collapsible />);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hasAttribute('inert')).toBe(true);
  });

  it('multiple: sections expand independently and accumulate', async () => {
    const user = userEvent.setup();
    render(<TestAccordion type="multiple" />);
    await user.click(triggerFor('a'));
    await user.click(triggerFor('c'));
    expect(contentFor('a').hasAttribute('inert')).toBe(false);
    expect(contentFor('c').hasAttribute('inert')).toBe(false);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hasAttribute('inert')).toBe(true);
    expect(contentFor('c').hasAttribute('inert')).toBe(false);
  });

  it('ArrowDown/ArrowUp rove focus across headers with wrap; Home/End jump', async () => {
    const user = userEvent.setup();
    render(<TestAccordion />);
    triggerFor('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(triggerFor('b'));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(triggerFor('a'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(triggerFor('c'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(triggerFor('a'));
  });

  it('arrow keys move focus ONLY -- expansion does not follow focus', async () => {
    const user = userEvent.setup();
    render(<TestAccordion />);
    triggerFor('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(contentFor('b').hasAttribute('inert')).toBe(true);
  });

  it('Enter and Space on the focused header toggle it', async () => {
    const user = userEvent.setup();
    render(<TestAccordion type="multiple" />);
    triggerFor('a').focus();
    await user.keyboard('{Enter}');
    expect(contentFor('a').hasAttribute('inert')).toBe(false);
    triggerFor('b').focus();
    await user.keyboard(' ');
    expect(contentFor('b').hasAttribute('inert')).toBe(false);
  });

  it('a disabled section cannot be opened and is skipped by roving', async () => {
    const user = userEvent.setup();
    render(<TestAccordion disabledItem="b" />);
    await user.click(triggerFor('b'));
    expect(contentFor('b').hasAttribute('inert')).toBe(true);
    triggerFor('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(triggerFor('c'));
  });

  it('a disabled accordion refuses every section', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestAccordion disabled onValueChange={onValueChange} />);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hasAttribute('inert')).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(partElement(body(), 'root')?.getAttribute('data-disabled')).toBe('true');
  });

  it('controlled: the callback reports, state follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestAccordion value="" onValueChange={onValueChange} />);

    await user.click(triggerFor('a'));
    expect(onValueChange).toHaveBeenLastCalledWith('a');
    expect(contentFor('a').hasAttribute('inert')).toBe(true);

    rerender(<TestAccordion value="a" onValueChange={onValueChange} />);
    expect(contentFor('a').hasAttribute('inert')).toBe(false);
    expect(triggerFor('a').getAttribute('aria-expanded')).toBe('true');
  });

  it('controlled multiple: the callback reports the whole set as an array', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestAccordion type="multiple" value={['a']} onValueChange={onValueChange} />);
    await user.click(triggerFor('b'));
    expect(onValueChange).toHaveBeenLastCalledWith(['a', 'b']);
  });

  it('uncontrolled callback fires once per real transition, never for a refused one', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestAccordion defaultValue="a" onValueChange={onValueChange} />);
    await user.click(triggerFor('b'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith('b');
    // Single non-collapsible: re-activating the open section moves nothing.
    await user.click(triggerFor('b'));
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('a part used outside its provider fails loudly', () => {
    expect(() => render(<AccordionItem value="a">x</AccordionItem>)).toThrow(
      /must be used within <Accordion>/,
    );
  });

  it('the shadcn namespaced surface renders the same parts', () => {
    render(
      <Accordion defaultValue="a">
        <Accordion.Item value="a">
          <Accordion.Trigger>Section a</Accordion.Trigger>
          <Accordion.Content>Body a</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    );
    expect(contentFor('a').hasAttribute('inert')).toBe(false);
    expect(triggerFor('a').getAttribute('aria-expanded')).toBe('true');
  });
});
