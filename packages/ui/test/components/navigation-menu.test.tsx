/**
 * NavigationMenu component tests
 * Tests SSR, hydration, interactions, and navigation semantics
 */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '../../src/components/ui/navigation-menu';

describe('NavigationMenu - SSR Safety', () => {
  it('should render on server without errors', () => {
    const html = renderToString(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products/widgets">Widgets</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(html).toBeTruthy();
    expect(html).toContain('Products');
  });

  it('should hide content when closed on server', () => {
    const html = renderToString(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Server Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('visibility:hidden');
  });
});

describe('NavigationMenu - Client Hydration', () => {
  afterEach(() => {
    cleanup();
  });

  it('should hydrate and render correctly on client', async () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Hydrated Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Hydrated Content')).toBeInTheDocument();
  });

  it('should maintain state after hydration', async () => {
    const { rerender } = render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();

    rerender(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('NavigationMenu - Basic Interactions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('should open on trigger click', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Widget')).not.toBeVisible();

    fireEvent.click(screen.getByText('Products'));

    expect(screen.getByText('Widget')).toBeVisible();
  });

  it('should close on trigger click when open', async () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Widget')).toBeVisible();

    fireEvent.click(screen.getByText('Products'));

    expect(screen.getByText('Widget')).not.toBeVisible();
  });

  it('should open on hover after delay', async () => {
    render(
      <NavigationMenu delayDuration={200}>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Widget')).not.toBeVisible();

    fireEvent.pointerEnter(screen.getByText('Products'));

    // Not immediately visible
    expect(screen.getByText('Widget')).not.toBeVisible();

    // Advance timer past delay
    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('Widget')).toBeVisible();
  });

  it('should close on Escape key', async () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Widget')).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByText('Widget')).not.toBeVisible();
  });

  it('should switch between items immediately when open', async () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Products Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="services">
            <NavigationMenuTrigger>Services</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/services">Services Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Products Content')).toBeVisible();
    expect(screen.getByText('Services Content')).not.toBeVisible();

    // Hover over services trigger - should switch immediately since menu is open
    fireEvent.pointerEnter(screen.getByText('Services'));

    expect(screen.getByText('Products Content')).not.toBeVisible();
    expect(screen.getByText('Services Content')).toBeVisible();
  });
});

describe('NavigationMenu - Controlled Mode', () => {
  afterEach(() => {
    cleanup();
  });

  it('should work in controlled mode', async () => {
    const onValueChange = vi.fn();

    const ControlledNav = () => {
      const [value, setValue] = React.useState('');

      return (
        <NavigationMenu
          value={value}
          onValueChange={(newValue) => {
            setValue(newValue);
            onValueChange(newValue);
          }}
        >
          <NavigationMenuList>
            <NavigationMenuItem value="products">
              <NavigationMenuTrigger>Products</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      );
    };

    render(<ControlledNav />);

    expect(screen.getByText('Widget')).not.toBeVisible();

    fireEvent.click(screen.getByText('Products'));

    expect(screen.getByText('Widget')).toBeVisible();
    expect(onValueChange).toHaveBeenCalledWith('products');

    fireEvent.click(screen.getByText('Products'));

    expect(screen.getByText('Widget')).not.toBeVisible();
    expect(onValueChange).toHaveBeenCalledWith('');
  });
});

describe('NavigationMenu - Keyboard Navigation', () => {
  afterEach(() => {
    cleanup();
  });

  it('should open on Enter key', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByText('Products');
    trigger.focus();

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('should open on Space key', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByText('Products');
    trigger.focus();

    fireEvent.keyDown(trigger, { key: ' ' });

    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('should open on ArrowDown key', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByText('Products');
    trigger.focus();

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(screen.getByText('Widget')).toBeInTheDocument();
  });

  it('should close on Enter when open', async () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Widget')).toBeVisible();

    const trigger = screen.getByText('Products');
    trigger.focus();

    fireEvent.keyDown(trigger, { key: 'Enter' });

    expect(screen.getByText('Widget')).not.toBeVisible();
  });
});

describe('NavigationMenu - ARIA Attributes', () => {
  afterEach(() => {
    cleanup();
  });

  it('should have correct aria-label on nav', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('trigger should have aria-expanded attribute', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('trigger should have aria-haspopup="menu"', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('trigger should have aria-controls pointing to content', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent data-testid="content">
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    const contentId = trigger.getAttribute('aria-controls');

    expect(contentId).toBeTruthy();

    const content = screen.getByTestId('content');
    expect(content).toHaveAttribute('id', contentId);
  });

  it('content should have aria-labelledby pointing to trigger', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent data-testid="content">
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    const content = screen.getByTestId('content');

    expect(content).toHaveAttribute('aria-labelledby', trigger.id);
  });
});

describe('NavigationMenu - Links', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render links correctly', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products/widgets">Widgets</NavigationMenuLink>
              <NavigationMenuLink href="/products/gadgets">Gadgets</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const widgetsLink = screen.getByRole('link', { name: 'Widgets' });
    const gadgetsLink = screen.getByRole('link', { name: 'Gadgets' });

    expect(widgetsLink).toHaveAttribute('href', '/products/widgets');
    expect(gadgetsLink).toHaveAttribute('href', '/products/gadgets');
  });

  it('should support asChild pattern for custom links', () => {
    const CustomLink = React.forwardRef<
      HTMLAnchorElement,
      { to: string; children: React.ReactNode }
    >(({ to, children, ...props }, ref) => (
      <a ref={ref} href={to} data-custom {...props}>
        {children}
      </a>
    ));
    CustomLink.displayName = 'CustomLink';

    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink asChild>
                <CustomLink to="/products/widgets">Widgets</CustomLink>
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const link = screen.getByRole('link', { name: 'Widgets' });
    expect(link).toHaveAttribute('href', '/products/widgets');
    expect(link).toHaveAttribute('data-custom');
  });

  it('should show active state on link', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products/widgets" active>
                Active Link
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const link = screen.getByRole('link', { name: 'Active Link' });
    expect(link).toHaveAttribute('data-active');
  });
});

describe('NavigationMenu - Data Attributes', () => {
  afterEach(() => {
    cleanup();
  });

  it('should have data-state attribute on trigger', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    expect(trigger).toHaveAttribute('data-state', 'closed');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('should have data-state attribute on content', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent data-testid="content">
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const content = screen.getByTestId('content');
    expect(content).toHaveAttribute('data-state', 'open');
  });

  it('should have data-orientation on root and list', () => {
    render(
      <NavigationMenu data-testid="nav">
        <NavigationMenuList data-testid="list">
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const nav = screen.getByTestId('nav');
    const list = screen.getByTestId('list');

    expect(nav).toHaveAttribute('data-orientation', 'horizontal');
    expect(list).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('should support vertical orientation', () => {
    render(
      <NavigationMenu orientation="vertical" data-testid="nav">
        <NavigationMenuList data-testid="list">
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const nav = screen.getByTestId('nav');
    const list = screen.getByTestId('list');

    expect(nav).toHaveAttribute('data-orientation', 'vertical');
    expect(list).toHaveAttribute('data-orientation', 'vertical');
  });
});

describe('NavigationMenu - Viewport', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render viewport when open', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport data-testid="viewport" />
      </NavigationMenu>,
    );

    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });

  it('should hide viewport when closed', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport data-testid="viewport" />
      </NavigationMenu>,
    );

    const viewport = screen.getByTestId('viewport');
    expect(viewport).toBeInTheDocument();
    expect(viewport).toHaveAttribute('aria-hidden', 'true');
  });

  it('should render viewport with forceMount', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport forceMount data-testid="viewport" />
      </NavigationMenu>,
    );

    expect(screen.getByTestId('viewport')).toBeInTheDocument();
  });
});

describe('NavigationMenu - Indicator', () => {
  afterEach(() => {
    cleanup();
  });

  it('should render indicator when open', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator data-testid="indicator" />
      </NavigationMenu>,
    );

    expect(screen.getByTestId('indicator')).toBeInTheDocument();
  });

  it('should not render indicator when closed', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator data-testid="indicator" />
      </NavigationMenu>,
    );

    expect(screen.queryByTestId('indicator')).not.toBeInTheDocument();
  });

  it('indicator should have aria-hidden', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuIndicator data-testid="indicator" />
      </NavigationMenu>,
    );

    const indicator = screen.getByTestId('indicator');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('NavigationMenu - Multiple Items', () => {
  afterEach(() => {
    cleanup();
  });

  it('should only show one content at a time', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Products Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem value="services">
            <NavigationMenuTrigger>Services</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/services">Services Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    expect(screen.getByText('Products Content')).toBeVisible();
    expect(screen.getByText('Services Content')).not.toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Services/i }));

    expect(screen.getByText('Products Content')).not.toBeVisible();
    expect(screen.getByText('Services Content')).toBeVisible();
  });

  it('should allow simple links without content', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Content</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink href="/about">About</NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const aboutLink = screen.getByRole('link', { name: 'About' });
    expect(aboutLink).toHaveAttribute('href', '/about');
  });
});

describe('NavigationMenu - Custom className', () => {
  afterEach(() => {
    cleanup();
  });

  it('should merge custom className on root', () => {
    render(
      <NavigationMenu className="custom-nav" data-testid="nav">
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const nav = screen.getByTestId('nav');
    expect(nav).toHaveClass('custom-nav');
  });

  it('should merge custom className on trigger', () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger className="custom-trigger">Products</NavigationMenuTrigger>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    expect(trigger).toHaveClass('custom-trigger');
  });

  it('should merge custom className on content', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent className="custom-content" data-testid="content">
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const content = screen.getByTestId('content');
    expect(content).toHaveClass('custom-content');
  });

  it('should merge custom className on link', () => {
    render(
      <NavigationMenu defaultValue="products">
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products" className="custom-link">
                Widget
              </NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const link = screen.getByRole('link', { name: 'Widget' });
    expect(link).toHaveClass('custom-link');
  });
});

describe('NavigationMenu - Focus Management', () => {
  afterEach(() => {
    cleanup();
  });

  it('should return focus to trigger on Escape', async () => {
    render(
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="products">
            <NavigationMenuTrigger>Products</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="/products">Widget</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>,
    );

    const trigger = screen.getByRole('button', { name: /Products/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByText('Widget')).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.getByText('Widget')).not.toBeVisible();
      expect(trigger).toHaveFocus();
    });
  });
});
