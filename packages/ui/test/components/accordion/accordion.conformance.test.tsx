/**
 * React performance of the accordion score, driven end to end. Replaces the
 * oracle's imperative createAccordion controller: expansion moves only through
 * dispatched actions, and focus movement is the composed roving-focus primitive.
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
import { accordion } from '../../../src/components/accordion/accordion.behavior';
import {
  assertAxeClean,
  assertInstanceAriaFulfillment,
  partElement,
  partElements,
} from '../../harness/conformance';

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

afterEach(() => {
  cleanup();
});

describe('accordion conformance [react]', () => {
  it('collapsed: panels stay in the DOM, hidden -- the body is crawlable', async () => {
    render(<TestAccordion />);
    expect(partElements(body(), 'content')).toHaveLength(3);
    expect(contentFor('a').hidden).toBe(true);
    expect(contentFor('a').getAttribute('data-state')).toBe('closed');
    expect(triggerFor('a').getAttribute('aria-expanded')).toBe('false');
    await assertAxeClean(body());
  });

  it('each header button sits inside a role=heading wrapper at the configured level', async () => {
    render(<TestAccordion headingLevel={2} defaultValue="a" />);
    const heading = triggerFor('a').parentElement as HTMLElement;
    expect(heading.getAttribute('role')).toBe('heading');
    expect(heading.getAttribute('aria-level')).toBe('2');
    expect(partElement(body(), 'root')?.getAttribute('data-heading-level')).toBe('2');
    await assertAxeClean(body());
  });

  it('trigger and panel are wired by real ids, collapsed as well as expanded', () => {
    render(<TestAccordion defaultValue="a" />);
    for (const value of ['a', 'b']) {
      expect(triggerFor(value).getAttribute('aria-controls')).toBe(contentFor(value).id);
      expect(contentFor(value).getAttribute('aria-labelledby')).toBe(triggerFor(value).id);
    }
    expect(contentFor('b').hidden).toBe(true);
  });

  it('per-instance ARIA equals the score projection, collapsed and expanded', async () => {
    const user = userEvent.setup();
    render(<TestAccordion />);
    const root = partElement(body(), 'root') as HTMLElement;
    assertInstanceAriaFulfillment(
      accordion,
      root,
      { value: [], multiple: false, collapsible: false },
      {},
    );
    await user.click(triggerFor('b'));
    assertInstanceAriaFulfillment(
      accordion,
      root,
      { value: ['b'], multiple: false, collapsible: false },
      {},
    );
  });

  it('single: opening a section closes the previously open one', async () => {
    const user = userEvent.setup();
    render(<TestAccordion defaultValue="a" />);
    await user.click(triggerFor('b'));
    expect(contentFor('b').hidden).toBe(false);
    expect(contentFor('a').hidden).toBe(true);
    await assertAxeClean(body());
  });

  it('single non-collapsible: clicking the open header keeps it open', async () => {
    const user = userEvent.setup();
    render(<TestAccordion defaultValue="a" />);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hidden).toBe(false);
  });

  it('single collapsible: clicking the open header closes everything', async () => {
    const user = userEvent.setup();
    render(<TestAccordion defaultValue="a" collapsible />);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hidden).toBe(true);
  });

  it('multiple: sections expand independently and accumulate', async () => {
    const user = userEvent.setup();
    render(<TestAccordion type="multiple" />);
    await user.click(triggerFor('a'));
    await user.click(triggerFor('c'));
    expect(contentFor('a').hidden).toBe(false);
    expect(contentFor('c').hidden).toBe(false);
    await assertAxeClean(body());
    await user.click(triggerFor('a'));
    expect(contentFor('a').hidden).toBe(true);
    expect(contentFor('c').hidden).toBe(false);
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
    expect(contentFor('b').hidden).toBe(true);
  });

  it('Enter and Space on the focused header toggle it', async () => {
    const user = userEvent.setup();
    render(<TestAccordion type="multiple" />);
    triggerFor('a').focus();
    await user.keyboard('{Enter}');
    expect(contentFor('a').hidden).toBe(false);
    triggerFor('b').focus();
    await user.keyboard(' ');
    expect(contentFor('b').hidden).toBe(false);
  });

  it('a disabled section cannot be opened and is skipped by roving', async () => {
    const user = userEvent.setup();
    render(<TestAccordion disabledItem="b" />);
    await user.click(triggerFor('b'));
    expect(contentFor('b').hidden).toBe(true);
    triggerFor('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(triggerFor('c'));
  });

  it('a disabled accordion refuses every section', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TestAccordion disabled onValueChange={onValueChange} />);
    await user.click(triggerFor('a'));
    expect(contentFor('a').hidden).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
    expect(partElement(body(), 'root')?.getAttribute('data-disabled')).toBe('true');
  });

  it('controlled: the callback reports, state follows the prop', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<TestAccordion value="" onValueChange={onValueChange} />);

    await user.click(triggerFor('a'));
    expect(onValueChange).toHaveBeenLastCalledWith('a');
    expect(contentFor('a').hidden).toBe(true);

    rerender(<TestAccordion value="a" onValueChange={onValueChange} />);
    expect(contentFor('a').hidden).toBe(false);
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
    expect(contentFor('a').hidden).toBe(false);
    expect(triggerFor('a').getAttribute('aria-expanded')).toBe('true');
  });
});
