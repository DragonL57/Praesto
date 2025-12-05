import type { HTMLAttributes, ReactNode } from 'react';
import { tableStyles } from './styles';

interface TableWrapperProps {
  children: ReactNode;
}

export const TableWrapper = ({ children }: TableWrapperProps) => (
  <div className="table-container my-4" style={tableStyles.wrapper}>
    {children}
  </div>
);

type TableProps = HTMLAttributes<HTMLElement> & { node?: unknown };

export const Table = ({ children, node: _node, ...props }: TableProps) => (
  <TableWrapper>
    <table style={tableStyles.table} {...props}>
      {children}
    </table>
  </TableWrapper>
);

export const TableHead = ({ children, node: _node, ...props }: TableProps) => (
  <thead
    className={tableStyles.thead}
    style={tableStyles.theadStyle}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody = ({ children, node: _node, ...props }: TableProps) => (
  <tbody {...props}>{children}</tbody>
);

export const TableRow = ({ children, node: _node, ...props }: TableProps) => (
  <tr className={tableStyles.tr} {...props}>
    {children}
  </tr>
);

export const TableHeader = ({
  children,
  node: _node,
  ...props
}: TableProps) => (
  <th className={tableStyles.th} style={tableStyles.thStyle} {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, node: _node, ...props }: TableProps) => (
  <td className={tableStyles.td} style={tableStyles.tdStyle} {...props}>
    {children}
  </td>
);

/**
 * Creates all table components for react-markdown
 */
export const createTableComponents = () => ({
  table: Table,
  thead: TableHead,
  tbody: TableBody,
  tr: TableRow,
  th: TableHeader,
  td: TableCell,
});
