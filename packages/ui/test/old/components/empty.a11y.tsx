import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Empty,
  EmptyAction,
  EmptyDescription,
  EmptyIcon,
  EmptyTitle,
} from '../../../src/old/ui/empty';

describe('Empty - Accessibility', () => {
  it('has no accessibility violations with default props', async () => {
    const { container } = render(
      <Empty>
        <EmptyTitle>No results</EmptyTitle>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with complete empty state', async () => {
    const { container } = render(
      <Empty>
        <EmptyIcon aria-hidden="true">
          <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </EmptyIcon>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>Try adjusting your search terms or filters.</EmptyDescription>
        <EmptyAction>
          <button type="button">Clear filters</button>
        </EmptyAction>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations without action (informational only)', async () => {
    const { container } = render(
      <Empty>
        <EmptyIcon aria-hidden="true">
          <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
            <path d="M12 2L2 7v10l10 5 10-5V7z" />
          </svg>
        </EmptyIcon>
        <EmptyTitle>All caught up!</EmptyTitle>
        <EmptyDescription>No new notifications.</EmptyDescription>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with multiple action buttons', async () => {
    const { container } = render(
      <Empty>
        <EmptyTitle>No projects yet</EmptyTitle>
        <EmptyDescription>Create your first project to get started.</EmptyDescription>
        <EmptyAction>
          <button type="button">Create project</button>
          <button type="button">Import project</button>
        </EmptyAction>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with link action', async () => {
    const { container } = render(
      <Empty>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>The page you are looking for does not exist.</EmptyDescription>
        <EmptyAction>
          <a href="/">Go back home</a>
        </EmptyAction>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <Empty role="status" aria-live="polite">
        <EmptyTitle>Search complete</EmptyTitle>
        <EmptyDescription>No matches found for your query.</EmptyDescription>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in a list context', async () => {
    const { container } = render(
      // biome-ignore lint/a11y/useSemanticElements: Testing empty state in list context requires role="list"
      <div role="list" aria-label="Projects list">
        {/* biome-ignore lint/a11y/useSemanticElements: Testing empty state in list context requires role="listitem" */}
        <div role="listitem">
          <Empty>
            <EmptyTitle>No projects</EmptyTitle>
            <EmptyDescription>Create a new project to get started.</EmptyDescription>
            <EmptyAction>
              <button type="button">Create project</button>
            </EmptyAction>
          </Empty>
        </div>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with descriptive icon', async () => {
    const { container } = render(
      <Empty>
        <EmptyIcon>
          <svg viewBox="0 0 24 24" width="48" height="48" role="img" aria-label="Empty inbox">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7L12 13L2 7" />
          </svg>
        </EmptyIcon>
        <EmptyTitle>Inbox is empty</EmptyTitle>
        <EmptyDescription>New messages will appear here.</EmptyDescription>
      </Empty>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used inside a main landmark', async () => {
    const { container } = render(
      <main>
        <h2>Search Results</h2>
        <Empty>
          <EmptyTitle>No results</EmptyTitle>
          <EmptyDescription>Try a different search term.</EmptyDescription>
        </Empty>
      </main>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('EmptyIcon - Accessibility', () => {
  it('has no accessibility violations with decorative icon', async () => {
    const { container } = render(
      <EmptyIcon aria-hidden="true">
        <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </EmptyIcon>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('EmptyTitle - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<EmptyTitle>Empty State Title</EmptyTitle>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('EmptyDescription - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <EmptyDescription>Description of the empty state.</EmptyDescription>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('EmptyAction - Accessibility', () => {
  it('has no accessibility violations with button', async () => {
    const { container } = render(
      <EmptyAction>
        <button type="button">Take Action</button>
      </EmptyAction>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with link', async () => {
    const { container } = render(
      <EmptyAction>
        <a href="/create">Create new item</a>
      </EmptyAction>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
