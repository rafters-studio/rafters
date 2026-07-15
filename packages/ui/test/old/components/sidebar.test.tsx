import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from '../../../src/old/ui/sidebar';

// Helper component to access sidebar context in tests
function SidebarStateDisplay() {
  const { state, open, isMobile, openMobile } = useSidebar();
  return (
    <div data-testid="sidebar-state">
      <span data-testid="state">{state}</span>
      <span data-testid="open">{String(open)}</span>
      <span data-testid="is-mobile">{String(isMobile)}</span>
      <span data-testid="open-mobile">{String(openMobile)}</span>
    </div>
  );
}

// Mock matchMedia for mobile detection
function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
      removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx >= 0) listeners.splice(idx, 1);
      },
      dispatchEvent: vi.fn(),
    })),
  });
  return {
    setMatches: (newMatches: boolean) => {
      for (const cb of listeners) {
        cb({ matches: newMatches, media: '(max-width: 768px)' } as MediaQueryListEvent);
      }
    },
  };
}

describe('Sidebar - Basic Rendering', () => {
  beforeEach(() => {
    mockMatchMedia(false); // Desktop by default
  });

  it('should render sidebar with provider', () => {
    render(
      <SidebarProvider data-testid="provider">
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('provider')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render header, content, and footer', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader data-testid="header">Header</SidebarHeader>
          <SidebarContent data-testid="content">Content</SidebarContent>
          <SidebarFooter data-testid="footer">Footer</SidebarFooter>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('header')).toHaveTextContent('Header');
    expect(screen.getByTestId('content')).toHaveTextContent('Content');
    expect(screen.getByTestId('footer')).toHaveTextContent('Footer');
  });

  it('should render menu structure', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>Dashboard</SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>Settings</SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

describe('Sidebar - Open/Close State', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should start expanded by default', () => {
    render(
      <SidebarProvider>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('expanded');
    expect(screen.getByTestId('open')).toHaveTextContent('true');
  });

  it('should start collapsed when defaultOpen is false', () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('collapsed');
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });

  it('should toggle sidebar when trigger is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('expanded');

    await user.click(screen.getByTestId('trigger'));

    expect(screen.getByTestId('state')).toHaveTextContent('collapsed');

    await user.click(screen.getByTestId('trigger'));

    expect(screen.getByTestId('state')).toHaveTextContent('expanded');
  });

  it('should work in controlled mode', async () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <SidebarProvider open={true} onOpenChange={onOpenChange}>
        <SidebarTrigger data-testid="trigger" />
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('open')).toHaveTextContent('true');

    await userEvent.click(screen.getByTestId('trigger'));

    expect(onOpenChange).toHaveBeenCalledWith(false);

    // Rerender with new value
    rerender(
      <SidebarProvider open={false} onOpenChange={onOpenChange}>
        <SidebarTrigger data-testid="trigger" />
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });
});

describe('Sidebar - Cookie Persistence', () => {
  let cookieSpy: ReturnType<typeof vi.fn>;
  let originalCookie: PropertyDescriptor | undefined;

  beforeEach(() => {
    mockMatchMedia(false);
    cookieSpy = vi.fn();
    let store = '';
    originalCookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => store,
      set: (value: string) => {
        store = value;
        cookieSpy(value);
      },
    });
  });

  afterEach(() => {
    if (originalCookie) {
      Object.defineProperty(document, 'cookie', originalCookie);
    }
  });

  it('does not write the cookie on initial mount (subscriber is equality-gated)', () => {
    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
      </SidebarProvider>,
    );

    expect(cookieSpy).not.toHaveBeenCalled();
  });

  it('writes the cookie once when open changes via toggle', async () => {
    const user = userEvent.setup();

    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(cookieSpy).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('trigger'));

    expect(screen.getByTestId('state')).toHaveTextContent('collapsed');
    expect(cookieSpy).toHaveBeenCalledTimes(1);
    expect(cookieSpy).toHaveBeenCalledWith(expect.stringContaining('sidebar:state=false'));
  });

  it('does not write the cookie on an unrelated re-render', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <SidebarProvider data-foo="a">
        <SidebarTrigger data-testid="trigger" />
      </SidebarProvider>,
    );

    await user.click(screen.getByTestId('trigger'));
    expect(cookieSpy).toHaveBeenCalledTimes(1);

    // Re-render without changing open state: the subscriber must not fire again.
    rerender(
      <SidebarProvider data-foo="b">
        <SidebarTrigger data-testid="trigger" />
      </SidebarProvider>,
    );

    expect(cookieSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar - Keyboard Shortcuts', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should toggle sidebar on Cmd+B', async () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('expanded');

    // Simulate Cmd+B
    await act(async () => {
      fireEvent.keyDown(window, { key: 'b', metaKey: true });
    });

    expect(screen.getByTestId('state')).toHaveTextContent('collapsed');
  });

  it('should toggle sidebar on Ctrl+B', async () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('state')).toHaveTextContent('expanded');

    // Simulate Ctrl+B
    await act(async () => {
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    });

    expect(screen.getByTestId('state')).toHaveTextContent('collapsed');
  });
});

describe('Sidebar - Mobile Behavior', () => {
  it('should detect mobile viewport', () => {
    mockMatchMedia(true);

    render(
      <SidebarProvider>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
  });

  it('should toggle openMobile on mobile', async () => {
    mockMatchMedia(true);

    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    expect(screen.getByTestId('open-mobile')).toHaveTextContent('false');

    await userEvent.click(screen.getByTestId('trigger'));

    expect(screen.getByTestId('open-mobile')).toHaveTextContent('true');
  });

  it('should render overlay on mobile when open', async () => {
    mockMatchMedia(true);

    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    // Open sidebar
    await userEvent.click(screen.getByTestId('trigger'));

    // Check for overlay
    expect(document.querySelector('[data-sidebar="overlay"]')).toBeInTheDocument();
  });

  it('should close sidebar when overlay is clicked', async () => {
    mockMatchMedia(true);

    render(
      <SidebarProvider>
        <SidebarTrigger data-testid="trigger" />
        <Sidebar>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    // Open sidebar
    await userEvent.click(screen.getByTestId('trigger'));
    expect(screen.getByTestId('open-mobile')).toHaveTextContent('true');

    // Click overlay
    const overlay = document.querySelector('[data-sidebar="overlay"]');
    if (overlay) {
      await userEvent.click(overlay);
    }

    expect(screen.getByTestId('open-mobile')).toHaveTextContent('false');
  });
});

describe('Sidebar - Menu Button States', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should show active state', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive data-testid="active-button">
                  Active Item
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton data-testid="inactive-button">Inactive Item</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('active-button')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('inactive-button')).toHaveAttribute('data-active', 'false');
  });

  it('should support asChild pattern', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/dashboard" data-testid="menu-link">
                    Dashboard
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    const link = screen.getByTestId('menu-link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveAttribute('data-sidebar', 'menu-button');
  });

  it('should support size variants', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="sm" data-testid="sm-button">
                  Small
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" data-testid="lg-button">
                  Large
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('sm-button')).toHaveAttribute('data-size', 'sm');
    expect(screen.getByTestId('lg-button')).toHaveAttribute('data-size', 'lg');
  });
});

describe('Sidebar - Submenu', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should render submenu structure', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Parent</SidebarMenuButton>
                <SidebarMenuSub data-testid="submenu">
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton>Child 1</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton>Child 2</SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('submenu')).toBeInTheDocument();
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('should support active submenu button', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Parent</SidebarMenuButton>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuSubButton isActive data-testid="active-sub">
                      Active Child
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('active-sub')).toHaveAttribute('data-active', 'true');
  });
});

describe('Sidebar - Sidebar Inset', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should render inset area for main content', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Nav</SidebarContent>
        </Sidebar>
        <SidebarInset data-testid="inset">
          <div>Main Content</div>
        </SidebarInset>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('inset')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
  });
});

describe('Sidebar - Variants', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should render sidebar with sidebar variant', () => {
    render(
      <SidebarProvider>
        <Sidebar variant="sidebar">
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    // Check that sidebar is rendered
    expect(document.querySelector('[data-sidebar="sidebar"]')).toBeInTheDocument();
  });

  it('should render sidebar with floating variant', () => {
    render(
      <SidebarProvider>
        <Sidebar variant="floating">
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    // Verify it renders
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render sidebar with inset variant', () => {
    render(
      <SidebarProvider>
        <Sidebar variant="inset">
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    // Verify it renders
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should support left and right sides', () => {
    const { rerender } = render(
      <SidebarProvider>
        <Sidebar side="left">
          <SidebarContent>Left Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByText('Left Content')).toBeInTheDocument();

    rerender(
      <SidebarProvider>
        <Sidebar side="right">
          <SidebarContent>Right Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByText('Right Content')).toBeInTheDocument();
  });
});

describe('Sidebar - Collapsible Modes', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should render without collapse behavior when collapsible is none', () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <Sidebar collapsible="none">
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarStateDisplay />
      </SidebarProvider>,
    );

    // Should still render content regardless of open state
    expect(screen.getByText('Content')).toBeInTheDocument();
  });
});

describe('Sidebar - Separator', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should render separator', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Group 1</SidebarGroupLabel>
            </SidebarGroup>
            <SidebarSeparator data-testid="separator" />
            <SidebarGroup>
              <SidebarGroupLabel>Group 2</SidebarGroupLabel>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('separator')).toHaveAttribute('data-sidebar', 'separator');
  });
});

describe('Sidebar - Custom className', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should merge custom className', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton className="custom-class" data-testid="button">
                  Item
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByTestId('button').className).toContain('custom-class');
  });
});

describe('Sidebar - Design System Widths', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('should use design system width classes', () => {
    render(
      <SidebarProvider data-testid="provider">
        <Sidebar data-testid="sidebar">
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
      </SidebarProvider>,
    );

    // Sidebar uses w-64 (16rem) from design system
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar.querySelector('[data-sidebar="content-wrapper"]')).toBeTruthy();
  });
});
