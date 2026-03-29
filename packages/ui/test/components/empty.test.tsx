import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from '../../src/components/ui/empty';

describe('Empty', () => {
  it('renders with default props', () => {
    render(<Empty data-testid="empty">Empty content</Empty>);
    const empty = screen.getByTestId('empty');
    expect(empty).toBeInTheDocument();
    expect(empty.tagName).toBe('DIV');
  });

  it('applies base styles', () => {
    const { container } = render(<Empty>Content</Empty>);
    const empty = container.firstChild;
    expect(empty).toHaveClass('flex');
    expect(empty).toHaveClass('flex-col');
    expect(empty).toHaveClass('items-center');
    expect(empty).toHaveClass('justify-center');
    expect(empty).toHaveClass('py-12');
    expect(empty).toHaveClass('text-center');
  });

  it('renders children', () => {
    render(
      <Empty>
        <span data-testid="child">Child content</span>
      </Empty>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<Empty className="custom-class">Content</Empty>);
    expect(container.firstChild).toHaveClass('custom-class');
    expect(container.firstChild).toHaveClass('flex');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Empty ref={ref}>Content</Empty>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <Empty data-testid="empty" aria-label="Empty state" id="empty-container">
        Content
      </Empty>,
    );
    const empty = screen.getByTestId('empty');
    expect(empty).toHaveAttribute('aria-label', 'Empty state');
    expect(empty).toHaveAttribute('id', 'empty-container');
  });
});

describe('EmptyIcon', () => {
  it('renders with default styles', () => {
    const { container } = render(
      <EmptyIcon>
        <svg data-testid="icon" />
      </EmptyIcon>,
    );
    const icon = container.firstChild;
    // mb-4 removed -- parent uses gap instead
    expect(icon).toHaveClass('text-muted-foreground');
  });

  it('renders children', () => {
    render(
      <EmptyIcon>
        <svg data-testid="icon" />
      </EmptyIcon>,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <EmptyIcon className="custom-icon">
        <svg />
      </EmptyIcon>,
    );
    expect(container.firstChild).toHaveClass('custom-icon');
    // mb-4 removed -- parent uses gap instead
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <EmptyIcon ref={ref}>
        <svg />
      </EmptyIcon>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <EmptyIcon data-testid="icon-container" aria-hidden="true">
        <svg />
      </EmptyIcon>,
    );
    const icon = screen.getByTestId('icon-container');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('EmptyTitle', () => {
  it('renders as h3 by default', () => {
    render(<EmptyTitle data-testid="title">Title</EmptyTitle>);
    const title = screen.getByTestId('title');
    expect(title.tagName).toBe('H3');
  });

  it('applies default styles', () => {
    const { container } = render(<EmptyTitle>Title</EmptyTitle>);
    const title = container.firstChild;
    // mb-2 removed -- parent uses gap instead
    expect(title).toHaveClass('text-lg');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('text-foreground');
  });

  it('renders children', () => {
    render(<EmptyTitle>No results found</EmptyTitle>);
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(<EmptyTitle className="custom-title">Title</EmptyTitle>);
    expect(container.firstChild).toHaveClass('custom-title');
    expect(container.firstChild).toHaveClass('text-lg');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<EmptyTitle ref={ref}>Title</EmptyTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <EmptyTitle data-testid="title" id="empty-title">
        Title
      </EmptyTitle>,
    );
    const title = screen.getByTestId('title');
    expect(title).toHaveAttribute('id', 'empty-title');
  });
});

describe('EmptyDescription', () => {
  it('renders as paragraph', () => {
    render(<EmptyDescription data-testid="desc">Description</EmptyDescription>);
    const desc = screen.getByTestId('desc');
    expect(desc.tagName).toBe('P');
  });

  it('applies default styles', () => {
    const { container } = render(<EmptyDescription>Description</EmptyDescription>);
    const desc = container.firstChild;
    // mb-4 removed -- parent uses gap instead
    expect(desc).toHaveClass('max-w-sm');
    expect(desc).toHaveClass('text-sm');
    expect(desc).toHaveClass('text-muted-foreground');
  });

  it('renders children', () => {
    render(<EmptyDescription>Try adjusting your search.</EmptyDescription>);
    expect(screen.getByText('Try adjusting your search.')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <EmptyDescription className="custom-desc">Description</EmptyDescription>,
    );
    expect(container.firstChild).toHaveClass('custom-desc');
    expect(container.firstChild).toHaveClass('text-sm');
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLParagraphElement>();
    render(<EmptyDescription ref={ref}>Description</EmptyDescription>);
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <EmptyDescription data-testid="desc" id="empty-desc">
        Description
      </EmptyDescription>,
    );
    const desc = screen.getByTestId('desc');
    expect(desc).toHaveAttribute('id', 'empty-desc');
  });
});

describe('EmptyAction', () => {
  it('renders with default styles', () => {
    const { container } = render(
      <EmptyAction>
        <button type="button">Action</button>
      </EmptyAction>,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <EmptyAction>
        <button type="button" data-testid="action-button">
          Create Project
        </button>
      </EmptyAction>,
    );
    expect(screen.getByTestId('action-button')).toBeInTheDocument();
  });

  it('merges custom className', () => {
    const { container } = render(
      <EmptyAction className="custom-action">
        <button type="button">Action</button>
      </EmptyAction>,
    );
    expect(container.firstChild).toHaveClass('custom-action');
    // mt-2 removed -- parent uses gap instead
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <EmptyAction ref={ref}>
        <button type="button">Action</button>
      </EmptyAction>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('passes through HTML attributes', () => {
    render(
      <EmptyAction data-testid="action" role="group">
        <button type="button">Action</button>
      </EmptyAction>,
    );
    const action = screen.getByTestId('action');
    expect(action).toHaveAttribute('role', 'group');
  });
});

describe('Empty composition', () => {
  it('renders a complete empty state with all subcomponents', () => {
    render(
      <Empty data-testid="empty">
        <EmptyIcon data-testid="icon">
          <svg aria-hidden="true" />
        </EmptyIcon>
        <EmptyTitle data-testid="title">No results found</EmptyTitle>
        <EmptyDescription data-testid="desc">
          Try adjusting your search terms or filters.
        </EmptyDescription>
        <EmptyAction data-testid="action">
          <button type="button">Clear filters</button>
        </EmptyAction>
      </Empty>,
    );

    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveTextContent('No results found');
    expect(screen.getByTestId('desc')).toHaveTextContent(
      'Try adjusting your search terms or filters.',
    );
    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  it('renders without action (informational only)', () => {
    render(
      <Empty data-testid="empty">
        <EmptyIcon>
          <svg aria-hidden="true" />
        </EmptyIcon>
        <EmptyTitle>All caught up!</EmptyTitle>
        <EmptyDescription>No new notifications.</EmptyDescription>
      </Empty>,
    );

    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(screen.getByText('All caught up!')).toBeInTheDocument();
    expect(screen.getByText('No new notifications.')).toBeInTheDocument();
  });

  it('renders with multiple action buttons', () => {
    render(
      <Empty>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create your first project to get started.</EmptyDescription>
        <EmptyAction>
          <button type="button" data-testid="primary-action">
            Create project
          </button>
          <button type="button" data-testid="secondary-action">
            Import project
          </button>
        </EmptyAction>
      </Empty>,
    );

    expect(screen.getByTestId('primary-action')).toBeInTheDocument();
    expect(screen.getByTestId('secondary-action')).toBeInTheDocument();
  });
});
