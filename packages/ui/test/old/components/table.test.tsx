import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../src/old/ui/table';

const TestTable = () => (
  <Table data-testid="table">
    <TableCaption data-testid="caption">A list of users</TableCaption>
    <TableHeader data-testid="header">
      <TableRow data-testid="header-row">
        <TableHead data-testid="head-1">Name</TableHead>
        <TableHead data-testid="head-2">Email</TableHead>
        <TableHead data-testid="head-3">Status</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody data-testid="body">
      <TableRow data-testid="body-row-1">
        <TableCell data-testid="cell-1-1">John Doe</TableCell>
        <TableCell data-testid="cell-1-2">john@example.com</TableCell>
        <TableCell data-testid="cell-1-3">Active</TableCell>
      </TableRow>
      <TableRow data-testid="body-row-2">
        <TableCell>Jane Smith</TableCell>
        <TableCell>jane@example.com</TableCell>
        <TableCell>Inactive</TableCell>
      </TableRow>
    </TableBody>
    <TableFooter data-testid="footer">
      <TableRow data-testid="footer-row">
        <TableCell colSpan={3}>2 total users</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
);

describe('Table - Basic Rendering', () => {
  it('should render table with all parts', () => {
    render(<TestTable />);

    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toBeInTheDocument();
  });

  it('should render header row with cells', () => {
    render(<TestTable />);

    expect(screen.getByTestId('head-1')).toHaveTextContent('Name');
    expect(screen.getByTestId('head-2')).toHaveTextContent('Email');
    expect(screen.getByTestId('head-3')).toHaveTextContent('Status');
  });

  it('should render body rows with cells', () => {
    render(<TestTable />);

    expect(screen.getByTestId('cell-1-1')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('cell-1-2')).toHaveTextContent('john@example.com');
    expect(screen.getByTestId('cell-1-3')).toHaveTextContent('Active');
  });

  it('should render caption', () => {
    render(<TestTable />);

    expect(screen.getByTestId('caption')).toHaveTextContent('A list of users');
  });

  it('should render footer', () => {
    render(<TestTable />);

    expect(screen.getByTestId('footer')).toHaveTextContent('2 total users');
  });
});

describe('Table - Namespaced Components', () => {
  it('should render with namespaced components', () => {
    render(
      <Table data-testid="table">
        <Table.Caption data-testid="caption">Caption</Table.Caption>
        <Table.Header data-testid="header">
          <Table.Row data-testid="row">
            <Table.Head data-testid="head">Header</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body data-testid="body">
          <Table.Row>
            <Table.Cell data-testid="cell">Cell</Table.Cell>
          </Table.Row>
        </Table.Body>
        <Table.Footer data-testid="footer">
          <Table.Row>
            <Table.Cell>Footer</Table.Cell>
          </Table.Row>
        </Table.Footer>
      </Table>,
    );

    expect(screen.getByTestId('table')).toBeInTheDocument();
    expect(screen.getByTestId('caption')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('body')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    expect(screen.getByTestId('row')).toBeInTheDocument();
    expect(screen.getByTestId('head')).toBeInTheDocument();
    expect(screen.getByTestId('cell')).toBeInTheDocument();
  });
});

describe('Table - Semantic Elements', () => {
  it('should use table element', () => {
    render(<TestTable />);

    expect(screen.getByTestId('table').tagName).toBe('TABLE');
  });

  it('should use thead element for header', () => {
    render(<TestTable />);

    expect(screen.getByTestId('header').tagName).toBe('THEAD');
  });

  it('should use tbody element for body', () => {
    render(<TestTable />);

    expect(screen.getByTestId('body').tagName).toBe('TBODY');
  });

  it('should use tfoot element for footer', () => {
    render(<TestTable />);

    expect(screen.getByTestId('footer').tagName).toBe('TFOOT');
  });

  it('should use tr element for rows', () => {
    render(<TestTable />);

    expect(screen.getByTestId('header-row').tagName).toBe('TR');
    expect(screen.getByTestId('body-row-1').tagName).toBe('TR');
  });

  it('should use th element for header cells', () => {
    render(<TestTable />);

    expect(screen.getByTestId('head-1').tagName).toBe('TH');
  });

  it('should use td element for body cells', () => {
    render(<TestTable />);

    expect(screen.getByTestId('cell-1-1').tagName).toBe('TD');
  });

  it('should use caption element', () => {
    render(<TestTable />);

    expect(screen.getByTestId('caption').tagName).toBe('CAPTION');
  });
});

describe('Table - Data Attributes', () => {
  it('should set data-table on table', () => {
    render(<TestTable />);

    expect(screen.getByTestId('table')).toHaveAttribute('data-table');
  });

  it('should set data-table-header on header', () => {
    render(<TestTable />);

    expect(screen.getByTestId('header')).toHaveAttribute('data-table-header');
  });

  it('should set data-table-body on body', () => {
    render(<TestTable />);

    expect(screen.getByTestId('body')).toHaveAttribute('data-table-body');
  });

  it('should set data-table-footer on footer', () => {
    render(<TestTable />);

    expect(screen.getByTestId('footer')).toHaveAttribute('data-table-footer');
  });

  it('should set data-table-row on rows', () => {
    render(<TestTable />);

    expect(screen.getByTestId('header-row')).toHaveAttribute('data-table-row');
    expect(screen.getByTestId('body-row-1')).toHaveAttribute('data-table-row');
  });

  it('should set data-table-head on header cells', () => {
    render(<TestTable />);

    expect(screen.getByTestId('head-1')).toHaveAttribute('data-table-head');
  });

  it('should set data-table-cell on body cells', () => {
    render(<TestTable />);

    expect(screen.getByTestId('cell-1-1')).toHaveAttribute('data-table-cell');
  });

  it('should set data-table-caption on caption', () => {
    render(<TestTable />);

    expect(screen.getByTestId('caption')).toHaveAttribute('data-table-caption');
  });
});

describe('Table - Custom className', () => {
  it('should merge custom className on table', () => {
    render(
      <Table className="custom-table" data-testid="table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('table').className).toContain('custom-table');
  });

  it('should merge custom className on header', () => {
    render(
      <Table>
        <TableHeader className="custom-header" data-testid="header">
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(screen.getByTestId('header').className).toContain('custom-header');
  });

  it('should merge custom className on body', () => {
    render(
      <Table>
        <TableBody className="custom-body" data-testid="body">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('body').className).toContain('custom-body');
  });

  it('should merge custom className on footer', () => {
    render(
      <Table>
        <TableFooter className="custom-footer" data-testid="footer">
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );

    expect(screen.getByTestId('footer').className).toContain('custom-footer');
  });

  it('should merge custom className on row', () => {
    render(
      <Table>
        <TableBody>
          <TableRow className="custom-row" data-testid="row">
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('row').className).toContain('custom-row');
  });

  it('should merge custom className on head cell', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="custom-head" data-testid="head">
              Head
            </TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(screen.getByTestId('head').className).toContain('custom-head');
  });

  it('should merge custom className on cell', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="custom-cell" data-testid="cell">
              Cell
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('cell').className).toContain('custom-cell');
  });

  it('should merge custom className on caption', () => {
    render(
      <Table>
        <TableCaption className="custom-caption" data-testid="caption">
          Caption
        </TableCaption>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('caption').className).toContain('custom-caption');
  });
});

describe('Table - Ref Forwarding', () => {
  it('should forward ref to table', () => {
    const ref = React.createRef<HTMLTableElement>();
    render(
      <Table ref={ref}>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(ref.current).toBeInstanceOf(HTMLTableElement);
  });

  it('should forward ref to header', () => {
    const ref = React.createRef<HTMLTableSectionElement>();
    render(
      <Table>
        <TableHeader ref={ref}>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
  });

  it('should forward ref to body', () => {
    const ref = React.createRef<HTMLTableSectionElement>();
    render(
      <Table>
        <TableBody ref={ref}>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(ref.current).toBeInstanceOf(HTMLTableSectionElement);
  });

  it('should forward ref to row', () => {
    const ref = React.createRef<HTMLTableRowElement>();
    render(
      <Table>
        <TableBody>
          <TableRow ref={ref}>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(ref.current).toBeInstanceOf(HTMLTableRowElement);
  });

  it('should forward ref to head cell', () => {
    const ref = React.createRef<HTMLTableCellElement>();
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead ref={ref}>Head</TableHead>
          </TableRow>
        </TableHeader>
      </Table>,
    );

    expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
  });

  it('should forward ref to cell', () => {
    const ref = React.createRef<HTMLTableCellElement>();
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell ref={ref}>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(ref.current).toBeInstanceOf(HTMLTableCellElement);
  });
});

describe('Table - Cell Props', () => {
  it('should support colSpan on cells', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell colSpan={3} data-testid="cell">
              Spanning cell
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('cell')).toHaveAttribute('colspan', '3');
  });

  it('should support rowSpan on cells', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell rowSpan={2} data-testid="cell">
              Spanning cell
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByTestId('cell')).toHaveAttribute('rowspan', '2');
  });
});

describe('Table - Overflow Container', () => {
  it('should have overflow container wrapper', () => {
    render(
      <Table data-testid="table">
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    const table = screen.getByTestId('table');
    const wrapper = table.parentElement;

    expect(wrapper?.className).toContain('overflow-auto');
  });
});
