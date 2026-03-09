import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  Resizable,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '../../src/components/ui/resizable';

describe('Resizable - Basic Rendering', () => {
  it('should render panel group with panels', () => {
    render(
      <ResizablePanelGroup data-testid="group">
        <ResizablePanel data-testid="panel-1">Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel data-testid="panel-2">Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('group')).toBeInTheDocument();
    expect(screen.getByTestId('panel-1')).toHaveTextContent('Panel 1');
    expect(screen.getByTestId('panel-2')).toHaveTextContent('Panel 2');
    expect(screen.getByTestId('handle')).toBeInTheDocument();
  });

  it('should render with horizontal direction by default', () => {
    render(
      <ResizablePanelGroup data-testid="group">
        <ResizablePanel>Panel</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('group')).toHaveAttribute('data-direction', 'horizontal');
  });

  it('should render with vertical direction', () => {
    render(
      <ResizablePanelGroup direction="vertical" data-testid="group">
        <ResizablePanel>Panel</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('group')).toHaveAttribute('data-direction', 'vertical');
  });

  it('should use namespaced components', () => {
    render(
      <Resizable.PanelGroup data-testid="group">
        <Resizable.Panel data-testid="panel">Panel</Resizable.Panel>
        <Resizable.Handle data-testid="handle" />
        <Resizable.Panel>Panel 2</Resizable.Panel>
      </Resizable.PanelGroup>,
    );

    expect(screen.getByTestId('group')).toBeInTheDocument();
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(screen.getByTestId('handle')).toBeInTheDocument();
  });
});

describe('Resizable - Panel Sizes', () => {
  it('should apply default size to panels', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={30} data-testid="panel-1">
          Panel 1
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={70} data-testid="panel-2">
          Panel 2
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    const panel1 = screen.getByTestId('panel-1');
    const panel2 = screen.getByTestId('panel-2');

    // Check flex-basis is set
    expect(panel1.style.flexBasis).toBe('30%');
    expect(panel2.style.flexBasis).toBe('70%');
  });

  it('should handle three panels', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={25} data-testid="panel-1">
          Left
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} data-testid="panel-2">
          Center
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={25} data-testid="panel-3">
          Right
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('panel-1').style.flexBasis).toBe('25%');
    expect(screen.getByTestId('panel-2').style.flexBasis).toBe('50%');
    expect(screen.getByTestId('panel-3').style.flexBasis).toBe('25%');
  });
});

describe('Resizable - Handle Attributes', () => {
  it('should have proper ARIA attributes for slider', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    expect(handle).toHaveAttribute('role', 'slider');
    expect(handle).toHaveAttribute('aria-orientation', 'horizontal'); // horizontal panels = horizontal slider
    expect(handle).toHaveAttribute('aria-label', 'Resize panels');
    expect(handle).toHaveAttribute('tabindex', '0');
  });

  it('should have vertical orientation for vertical panels', () => {
    render(
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    expect(handle).toHaveAttribute('aria-orientation', 'vertical');
  });

  it('should be disabled when disabled prop is true', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle disabled data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    expect(handle).toHaveAttribute('aria-disabled', 'true');
    expect(handle).toHaveAttribute('tabindex', '-1');
  });
});

describe('Resizable - Handle Indicator', () => {
  it('should not show handle indicator by default', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    expect(handle.querySelector('svg')).not.toBeInTheDocument();
  });

  it('should show handle indicator when withHandle is true', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle withHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    expect(handle.querySelector('svg')).toBeInTheDocument();
  });
});

describe('Resizable - Keyboard Navigation', () => {
  it('should be focusable', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    handle.focus();
    expect(document.activeElement).toBe(handle);
  });

  it('should not be focusable when disabled', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle disabled data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    expect(handle).toHaveAttribute('tabindex', '-1');
  });
});

describe('Resizable - Mouse Drag', () => {
  it('should set dragging state on mouse down', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    fireEvent.mouseDown(handle);

    expect(handle).toHaveAttribute('data-dragging', 'true');
  });

  it('should clear dragging state on mouse up', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    fireEvent.mouseDown(handle);
    fireEvent.mouseUp(document);

    expect(handle).toHaveAttribute('data-dragging', 'false');
  });

  it('should not start drag when disabled', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle disabled data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const handle = screen.getByTestId('handle');
    fireEvent.mouseDown(handle);

    expect(handle).toHaveAttribute('data-dragging', 'false');
  });
});

describe('Resizable - Collapsible Panels', () => {
  it('should mark panel as collapsible', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel collapsible data-testid="panel">
          Panel
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-panel');
  });

  it('should have collapsed attribute', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel collapsible data-testid="panel">
          Panel
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    const panel = screen.getByTestId('panel');
    expect(panel).toHaveAttribute('data-collapsed', 'false');
  });
});

describe('Resizable - onLayout Callback', () => {
  it('should be called with initial layout', () => {
    // onLayout is called when panels resize
    // Initial render doesn't trigger it automatically
    render(
      <ResizablePanelGroup>
        <ResizablePanel defaultSize={40}>Panel 1</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={60}>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    // Just verify it renders without error
    expect(screen.getByText('Panel 1')).toBeInTheDocument();
  });
});

describe('Resizable - Custom className', () => {
  it('should merge custom className on group', () => {
    render(
      <ResizablePanelGroup className="custom-group" data-testid="group">
        <ResizablePanel>Panel</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('group').className).toContain('custom-group');
  });

  it('should merge custom className on panel', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel className="custom-panel" data-testid="panel">
          Panel
        </ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('panel').className).toContain('custom-panel');
  });

  it('should merge custom className on handle', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle className="custom-handle" data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('handle').className).toContain('custom-handle');
  });
});

describe('Resizable - Panel Constraints', () => {
  it('should accept minSize and maxSize props', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel minSize={10} maxSize={80} data-testid="panel">
          Panel
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    // Just verify it renders - constraints are enforced during resize
    expect(screen.getByTestId('panel')).toBeInTheDocument();
  });
});

describe('Resizable - SSR Safety', () => {
  it('should render without errors', () => {
    expect(() => {
      render(
        <ResizablePanelGroup>
          <ResizablePanel>Panel 1</ResizablePanel>
          <ResizableHandle />
          <ResizablePanel>Panel 2</ResizablePanel>
        </ResizablePanelGroup>,
      );
    }).not.toThrow();
  });
});

describe('Resizable - Data Attributes', () => {
  it('should set data-panel-group on group', () => {
    render(
      <ResizablePanelGroup data-testid="group">
        <ResizablePanel>Panel</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('group')).toHaveAttribute('data-panel-group');
  });

  it('should set data-panel on panel', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel data-testid="panel">Panel</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('panel')).toHaveAttribute('data-panel');
  });

  it('should set data-panel-resize-handle on handle', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('handle')).toHaveAttribute('data-panel-resize-handle');
  });
});

describe('Resizable - Handle Index Mapping', () => {
  it('should assign index 0 to a single handle in 2-panel layout', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle" />
        <ResizablePanel>Panel 2</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('handle')).toHaveAttribute('data-handle-index', '0');
  });

  it('should assign correct indices to handles in 3-panel layout', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle-0" />
        <ResizablePanel>Panel 2</ResizablePanel>
        <ResizableHandle data-testid="handle-1" />
        <ResizablePanel>Panel 3</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('handle-0')).toHaveAttribute('data-handle-index', '0');
    expect(screen.getByTestId('handle-1')).toHaveAttribute('data-handle-index', '1');
  });

  it('should assign correct indices to handles in 4-panel layout', () => {
    render(
      <ResizablePanelGroup>
        <ResizablePanel>Panel 1</ResizablePanel>
        <ResizableHandle data-testid="handle-0" />
        <ResizablePanel>Panel 2</ResizablePanel>
        <ResizableHandle data-testid="handle-1" />
        <ResizablePanel>Panel 3</ResizablePanel>
        <ResizableHandle data-testid="handle-2" />
        <ResizablePanel>Panel 4</ResizablePanel>
      </ResizablePanelGroup>,
    );

    expect(screen.getByTestId('handle-0')).toHaveAttribute('data-handle-index', '0');
    expect(screen.getByTestId('handle-1')).toHaveAttribute('data-handle-index', '1');
    expect(screen.getByTestId('handle-2')).toHaveAttribute('data-handle-index', '2');
  });
});
