import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ChromeControls, ChromeRailItem } from '../src/index';
import { Chrome } from '../src/index';
import { resetPanelRevealState } from '../src/primitives/panel-reveal';

// =============================================================================
// Helpers
// =============================================================================

function makeRailItems(count = 2): ChromeRailItem[] {
  const items: ChromeRailItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      icon: <span data-testid={`icon-${i}`}>I{i}</span>,
      label: `Item ${i}`,
      panel: <div data-testid={`panel-content-${i}`}>Panel {i} content</div>,
    });
  }
  return items;
}

function findButton(label: string): HTMLElement {
  const btn = screen.getAllByRole('button').find((b) => b.getAttribute('aria-label') === label);
  if (!btn) throw new Error(`Button with aria-label "${label}" not found`);
  return btn;
}

function renderChrome(
  overrides: Partial<React.ComponentProps<typeof Chrome>> = {},
  ref?: React.RefObject<ChromeControls | null>,
) {
  const rail = overrides.rail ?? makeRailItems();
  return render(
    <Chrome ref={ref} rail={rail} {...overrides}>
      <div data-testid="canvas-content">Canvas Content</div>
    </Chrome>,
  );
}

// =============================================================================
// Setup / teardown
// =============================================================================

beforeEach(() => {
  resetPanelRevealState();
});

afterEach(() => {
  resetPanelRevealState();
});

// =============================================================================
// Basic rendering
// =============================================================================

describe('Chrome', () => {
  it('is exported and defined', () => {
    expect(Chrome).toBeDefined();
  });

  it('renders children as canvas content', () => {
    renderChrome();
    expect(screen.getByTestId('canvas-content')).toBeInTheDocument();
    expect(screen.getByText('Canvas Content')).toBeInTheDocument();
  });

  it('sets data-chrome attribute', () => {
    const { container } = renderChrome();
    expect(container.querySelector('[data-chrome]')).toBeInTheDocument();
  });

  it('renders rail items as buttons with icons', () => {
    renderChrome();
    expect(screen.getByTestId('icon-0')).toBeInTheDocument();
    expect(screen.getByTestId('icon-1')).toBeInTheDocument();
    // Rail items should be buttons with aria-label
    const buttons = screen.getAllByRole('button');
    const item0Button = buttons.find((btn) => btn.getAttribute('aria-label') === 'Item 0');
    expect(item0Button).toBeDefined();
  });

  it('renders settings cog when settings prop is provided', () => {
    renderChrome({
      settings: <div data-testid="settings-content">Settings</div>,
    });
    const settingsBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('aria-label') === 'Settings');
    expect(settingsBtn).toBeDefined();
  });

  it('does not render settings cog when settings prop is omitted', () => {
    renderChrome();
    const settingsBtn = screen
      .queryAllByRole('button')
      .find((btn) => btn.getAttribute('aria-label') === 'Settings');
    expect(settingsBtn).toBeUndefined();
  });
});

// =============================================================================
// ARIA attributes
// =============================================================================

describe('Chrome ARIA', () => {
  it('sets role="main" on canvas area', () => {
    renderChrome();
    expect(screen.getByRole('main')).toBeInTheDocument();
    // Canvas should contain our content
    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('canvas-content'));
  });

  it('uses semantic section elements with aria-label on panel areas', () => {
    const { container } = renderChrome();
    // Panels are hidden by default, so they wont appear in role queries.
    // Check the DOM directly for section elements with aria-label attributes.
    // section + aria-label gives implicit role="region".
    const panels = container.querySelectorAll('[data-chrome-panel]');
    expect(panels.length).toBeGreaterThan(0);
    // All panels should be <section> elements (implicit region role)
    for (const panel of panels) {
      expect(panel.tagName).toBe('SECTION');
    }
    // At least one panel should have an aria-label
    const panelWithLabel = Array.from(panels).find((p) => p.hasAttribute('aria-label'));
    expect(panelWithLabel).toBeDefined();
  });

  it('marks panels as data-state="closed" by default', () => {
    const { container } = renderChrome();
    const panels = container.querySelectorAll('[data-chrome-panel]');
    for (const panel of panels) {
      expect(panel.getAttribute('data-state')).toBe('closed');
    }
  });
});

// =============================================================================
// Panel open/close
// =============================================================================

describe('Chrome panel interaction', () => {
  it('opens panel on rail item click', async () => {
    const { container } = renderChrome();
    const user = userEvent.setup();

    const button = findButton('Item 0');
    await user.click(button);

    // Panel should become visible
    const panel = container.querySelector('[data-panel-id="item-0"]');
    expect(panel?.getAttribute('data-state')).toBe('open');
  });

  it('shows panel content when panel is open', async () => {
    renderChrome();
    const user = userEvent.setup();

    const button = findButton('Item 0');
    await user.click(button);

    expect(screen.getByTestId('panel-content-0')).toBeInTheDocument();
  });

  it('re-pinning an already open panel keeps it open', async () => {
    const { container } = renderChrome();
    const user = userEvent.setup();

    const button = findButton('Item 0');

    // Open and pin via click
    await user.click(button);
    let panel = container.querySelector('[data-panel-id="item-0"]');
    expect(panel?.getAttribute('data-state')).toBe('open');

    // Click the same item again -- onActivate always calls pinPanel,
    // so the panel stays open (click-to-pin semantics).
    await user.click(button);
    panel = container.querySelector('[data-panel-id="item-0"]');
    expect(panel?.getAttribute('data-state')).toBe('open');
  });

  it('switches panels when clicking a different rail item', async () => {
    const { container } = renderChrome();
    const user = userEvent.setup();

    const button0 = findButton('Item 0');
    const button1 = findButton('Item 1');

    await user.click(button0);
    await user.click(button1);

    const panel0 = container.querySelector('[data-panel-id="item-0"]');
    const panel1 = container.querySelector('[data-panel-id="item-1"]');

    // Item 1's panel should be open
    expect(panel1?.getAttribute('data-state')).toBe('open');
    // Item 0's panel should be closed
    expect(panel0?.getAttribute('data-state')).toBe('closed');
  });
});

// =============================================================================
// Settings panel
// =============================================================================

describe('Chrome settings panel', () => {
  it('opens settings panel on settings button click', async () => {
    const { container } = renderChrome({
      settings: <div data-testid="settings-content">Settings Panel</div>,
    });
    const user = userEvent.setup();

    const settingsBtn = findButton('Settings');
    await user.click(settingsBtn);

    const settingsPanel = container.querySelector('[data-panel-id="settings"]');
    expect(settingsPanel?.getAttribute('data-state')).toBe('open');
  });

  it('renders settings content when panel is open', async () => {
    renderChrome({
      settings: <div data-testid="settings-content">Settings Panel</div>,
    });
    const user = userEvent.setup();

    const settingsBtn = findButton('Settings');
    await user.click(settingsBtn);

    expect(screen.getByTestId('settings-content')).toBeInTheDocument();
  });
});

// =============================================================================
// Imperative handle
// =============================================================================

describe('Chrome imperative handle', () => {
  it('exposes openPanel/closePanel on the ref', async () => {
    const ref = React.createRef<ChromeControls>();
    const { container } = renderChrome({}, ref);

    // Open panel via imperative API
    await act(async () => {
      ref.current?.openPanel('item-0');
    });

    const panel = container.querySelector('[data-panel-id="item-0"]');
    expect(panel?.getAttribute('data-state')).toBe('open');

    // Close panel
    await act(async () => {
      ref.current?.closePanel();
    });

    expect(panel?.getAttribute('data-state')).toBe('closed');
  });

  it('exposes togglePanel on the ref', async () => {
    const ref = React.createRef<ChromeControls>();
    const { container } = renderChrome({}, ref);

    await act(async () => {
      ref.current?.togglePanel('item-1');
    });

    const panel = container.querySelector('[data-panel-id="item-1"]');
    expect(panel?.getAttribute('data-state')).toBe('open');

    await act(async () => {
      ref.current?.togglePanel('item-1');
    });

    expect(panel?.getAttribute('data-state')).toBe('closed');
  });

  it('exposes collapse/expand on the ref', async () => {
    const ref = React.createRef<ChromeControls>();
    const { container } = renderChrome({}, ref);

    await act(async () => {
      ref.current?.collapse();
    });

    const root = container.querySelector('[data-chrome]');
    expect(root?.getAttribute('data-collapsed')).toBeTruthy();

    await act(async () => {
      ref.current?.expand();
    });

    expect(root?.hasAttribute('data-collapsed')).toBe(false);
  });

  it('exposes openSettings/closeSettings on the ref', async () => {
    const ref = React.createRef<ChromeControls>();
    const { container } = renderChrome({ settings: <div>Settings</div> }, ref);

    await act(async () => {
      ref.current?.openSettings();
    });

    const settingsPanel = container.querySelector('[data-panel-id="settings"]');
    expect(settingsPanel?.getAttribute('data-state')).toBe('open');

    await act(async () => {
      ref.current?.closeSettings();
    });

    expect(settingsPanel?.getAttribute('data-state')).toBe('closed');
  });
});

// =============================================================================
// Collapse / expand
// =============================================================================

describe('Chrome collapse/expand', () => {
  it('starts collapsed when defaultCollapsed is true', () => {
    const { container } = renderChrome({ defaultCollapsed: true });
    const root = container.querySelector('[data-chrome]');
    expect(root?.getAttribute('data-collapsed')).toBeTruthy();
  });

  it('collapses rail width when collapsed', () => {
    const { container } = renderChrome({ defaultCollapsed: true });
    const rail = container.querySelector('[data-chrome-rail]');
    expect(rail?.className).toContain('w-0');
  });
});

// =============================================================================
// RTL layout
// =============================================================================

describe('Chrome RTL support', () => {
  it('sets dir="rtl" on root element', () => {
    const { container } = renderChrome({ dir: 'rtl' });
    const root = container.querySelector('[data-chrome]');
    expect(root?.getAttribute('dir')).toBe('rtl');
  });

  it('uses flex-row-reverse for RTL layout', () => {
    const { container } = renderChrome({ dir: 'rtl' });
    const root = container.querySelector('[data-chrome]');
    expect(root?.className).toContain('flex-row-reverse');
  });

  it('does not use flex-row-reverse for LTR layout', () => {
    const { container } = renderChrome({ dir: 'ltr' });
    const root = container.querySelector('[data-chrome]');
    expect(root?.className).not.toContain('flex-row-reverse');
  });

  it('applies border-l instead of border-r in RTL mode on rail', () => {
    const { container } = renderChrome({ dir: 'rtl' });
    const rail = container.querySelector('[data-chrome-rail]');
    expect(rail?.className).toContain('border-l');
    expect(rail?.className).not.toContain('border-r');
  });
});

// =============================================================================
// Disabled state
// =============================================================================

describe('Chrome disabled state', () => {
  it('disables all rail item buttons when disabled', () => {
    renderChrome({ disabled: true });
    const buttons = screen.getAllByRole('button');
    const railButtons = buttons.filter(
      (btn) =>
        btn.getAttribute('aria-label') === 'Item 0' || btn.getAttribute('aria-label') === 'Item 1',
    );
    for (const btn of railButtons) {
      expect(btn).toBeDisabled();
    }
  });

  it('disables settings button when disabled', () => {
    renderChrome({
      disabled: true,
      settings: <div>Settings</div>,
    });
    const settingsBtn = screen
      .getAllByRole('button')
      .find((btn) => btn.getAttribute('aria-label') === 'Settings');
    expect(settingsBtn).toBeDisabled();
  });
});

// =============================================================================
// Depth tokens
// =============================================================================

describe('Chrome depth', () => {
  it('uses z-depth-base on rail', () => {
    const { container } = renderChrome();
    const rail = container.querySelector('[data-chrome-rail]');
    expect(rail?.className).toContain('z-depth-base');
  });

  it('uses z-depth-dropdown on canvas', () => {
    const { container } = renderChrome();
    const canvas = container.querySelector('[data-chrome-canvas]');
    expect(canvas?.className).toContain('z-depth-dropdown');
  });
});

// =============================================================================
// Pass-through props
// =============================================================================

describe('Chrome pass-through props', () => {
  it('forwards extra HTML attributes to root element', () => {
    const { container } = renderChrome({ id: 'my-chrome' });
    const root = container.querySelector('[data-chrome]');
    expect(root?.getAttribute('id')).toBe('my-chrome');
  });

  it('merges className onto root element', () => {
    const { container } = renderChrome({ className: 'my-custom-class' });
    const root = container.querySelector('[data-chrome]');
    expect(root?.className).toContain('my-custom-class');
  });
});

// =============================================================================
// Empty rail
// =============================================================================

describe('Chrome with empty rail', () => {
  it('renders without errors when rail is empty', () => {
    const { container } = renderChrome({ rail: [] });
    expect(container.querySelector('[data-chrome]')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

// =============================================================================
// Display name
// =============================================================================

describe('Chrome displayName', () => {
  it('has displayName set to Chrome', () => {
    expect(Chrome.displayName).toBe('Chrome');
  });
});
