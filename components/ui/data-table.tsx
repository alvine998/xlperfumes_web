import type { Key, ReactNode } from "react";

export type DataTableColumn<Row> = {
  id: string;
  header: ReactNode;
  renderCell: (row: Row) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type DataTableProps<Row> = {
  ariaLabel: string;
  className: string;
  columns: DataTableColumn<Row>[];
  emptyContent: ReactNode;
  getRowKey: (row: Row) => Key;
  hasError?: boolean;
  isLoading: boolean;
  loadingContent: ReactNode;
  rows: Row[];
  stateCellClassName: string;
  wrapperClassName: string;
};

export function DataTable<Row>({
  ariaLabel,
  className,
  columns,
  emptyContent,
  getRowKey,
  hasError = false,
  isLoading,
  loadingContent,
  rows,
  stateCellClassName,
  wrapperClassName,
}: DataTableProps<Row>) {
  return (
    <div className={wrapperClassName}>
      <table className={className} aria-label={ariaLabel}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                className={column.headerClassName}
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td className={stateCellClassName} colSpan={columns.length}>
                {loadingContent}
              </td>
            </tr>
          ) : rows.length > 0 ? (
            rows.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className={column.className} key={column.id}>
                    {column.renderCell(row)}
                  </td>
                ))}
              </tr>
            ))
          ) : !hasError ? (
            <tr>
              <td className={stateCellClassName} colSpan={columns.length}>
                {emptyContent}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
