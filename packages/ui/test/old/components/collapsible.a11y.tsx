import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../../src/old/ui/collapsible';

describe('Collapsible - Accessibility', () => {
  it('has no accessibility violations when closed', async () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger>Show more information</CollapsibleTrigger>
        <CollapsibleContent>Additional content here</CollapsibleContent>
      </Collapsible>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const { container } = render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Hide information</CollapsibleTrigger>
        <CollapsibleContent>Additional content here</CollapsibleContent>
      </Collapsible>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when disabled', async () => {
    const { container } = render(
      <Collapsible disabled>
        <CollapsibleTrigger>Cannot toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has correct aria-expanded attribute', () => {
    const { rerender } = render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('has aria-controls linking trigger to content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    const content = screen.getByTestId('content');

    const ariaControls = trigger.getAttribute('aria-controls');
    expect(ariaControls).toBeTruthy();
    expect(content.id).toBe(ariaControls);
  });

  it('has aria-labelledby linking content to trigger', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    const content = screen.getByTestId('content');

    const labelledBy = content.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(trigger.id).toBe(labelledBy);
  });

  it('hides content from assistive technology when closed', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent forceMount data-testid="content">
          Hidden Content
        </CollapsibleContent>
      </Collapsible>,
    );

    const content = screen.getByTestId('content');
    expect(content).toHaveAttribute('hidden');
  });

  it('shows content to assistive technology when open', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Visible Content</CollapsibleContent>
      </Collapsible>,
    );

    const content = screen.getByTestId('content');
    expect(content).not.toHaveAttribute('hidden');
  });

  it('trigger is keyboard accessible', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');

    // Can receive focus
    trigger.focus();
    expect(trigger).toHaveFocus();

    // Can be activated with Enter
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(trigger); // Button click happens after Enter

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('disabled trigger cannot be focused via tab', () => {
    render(
      <Collapsible disabled>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
  });

  it('has no violations with nested interactive content', async () => {
    const { container } = render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Show form</CollapsibleTrigger>
        <CollapsibleContent>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" />
          <button type="submit">Submit</button>
        </CollapsibleContent>
      </Collapsible>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with asChild trigger', async () => {
    const { container } = render(
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button type="button">Custom Button</button>
        </CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('maintains ARIA relationships after toggling', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button');
    const ariaControls = trigger.getAttribute('aria-controls');
    const triggerId = trigger.id;

    // Open
    fireEvent.click(trigger);

    const content = screen.getByTestId('content');
    expect(content.id).toBe(ariaControls);
    expect(content.getAttribute('aria-labelledby')).toBe(triggerId);

    // Close and reopen
    fireEvent.click(trigger);
    fireEvent.click(trigger);

    const reopenedContent = screen.getByTestId('content');
    expect(reopenedContent.id).toBe(ariaControls);
    expect(reopenedContent.getAttribute('aria-labelledby')).toBe(triggerId);
  });
});
