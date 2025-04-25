'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { TreeDataGrid, textEditor } from 'react-data-grid'; // Changed DataGrid to TreeDataGrid
import type { Column, RenderEditCellProps } from 'react-data-grid';
import { parse, unparse } from 'papaparse';
import { cn } from '@/lib/utils';

import 'react-data-grid/lib/styles.css';

type SheetEditorProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  status: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
};

// Define a type for the row data
interface RowData {
  id: number;
  rowNumber: number;
  [key: string]: string | number; // Allow string keys for column data
}

const MIN_ROWS = 50;
const MIN_COLS = 26;

// Define consistent CSV parsing/generation options once
const CSV_OPTIONS = {
  quotes: true, // Always quote fields
  quoteChar: '"', // Use double quotes
  escapeChar: '"', // Escape quotes by doubling
  delimiter: ',', // Use comma as delimiter
};

const PureSpreadsheetEditor = ({
  content,
  saveContent,
}: SheetEditorProps) => {
  const parseData = useMemo(() => {
    if (!content) return Array(MIN_ROWS).fill(Array(MIN_COLS).fill(''));
    // Use consistent parsing options
    const result = parse<string[]>(content, {
      skipEmptyLines: true,
      ...CSV_OPTIONS,
    });

    const paddedData = result.data.map((row) => {
      const paddedRow = [...row];
      while (paddedRow.length < MIN_COLS) {
        paddedRow.push('');
      }
      return paddedRow;
    });

    while (paddedData.length < MIN_ROWS) {
      paddedData.push(Array(MIN_COLS).fill(''));
    }

    return paddedData;
  }, [content]);

  const columns = useMemo((): readonly Column<RowData>[] => {
    const rowNumberColumn: Column<RowData> = {
      key: 'rowNumber',
      name: '',
      frozen: true,
      width: 50,
      renderCell: ({ rowIdx }: { rowIdx: number }) => rowIdx + 1,
      cellClass: 'border-t border-r dark:bg-zinc-950 dark:text-zinc-50',
      headerCellClass: 'border-t border-r dark:bg-zinc-900 dark:text-zinc-50',
    };

    const dataColumns: Column<RowData>[] = Array.from({ length: MIN_COLS }, (_, i) => ({
      key: i.toString(),
      name: String.fromCharCode(65 + i),
      renderEditCell: (props: RenderEditCellProps<RowData, unknown>) => textEditor(props),
      width: 120,
      cellClass: cn(`border-t dark:bg-zinc-950 dark:text-zinc-50`, {
        'border-l': i !== 0,
      }),
      headerCellClass: cn(`border-t dark:bg-zinc-900 dark:text-zinc-50`, {
        'border-l': i !== 0,
      }),
    }));

    return [rowNumberColumn, ...dataColumns];
  }, []);

  const initialRows = useMemo(() => {
    return parseData.map((row, rowIndex) => {
      const rowData: RowData = {
        id: rowIndex,
        rowNumber: rowIndex + 1,
      };

      columns.slice(1).forEach((col, colIndex) => {
        rowData[col.key] = row[colIndex] || '';
      });

      return rowData;
    });
  }, [parseData, columns]);

  const [localRows, setLocalRows] = useState<RowData[]>(initialRows);

  useEffect(() => {
    setLocalRows(initialRows);
  }, [initialRows]);

  const generateCsv = (data: (string | number)[][]) => {
    // Use PapaParse's unparse with proper quoting configuration
    return unparse(data, CSV_OPTIONS);
  };

  const handleRowsChange = (newRows: RowData[]) => {
    setLocalRows(newRows);

    const updatedData = newRows.map((row) => {
      return columns.slice(1).map((col) => row[col.key] || '');
    });

    const newCsvContent = generateCsv(updatedData);
    saveContent(newCsvContent, true);
  };

  // Add required props for TreeDataGrid
  const [expandedGroupIds] = useState<ReadonlySet<unknown>>(new Set());

  return (
    <TreeDataGrid
      columns={columns}
      rows={localRows}
      enableVirtualization
      onRowsChange={handleRowsChange}
      onCellClick={(args) => {
        if (args.column.key !== 'rowNumber') {
          args.selectCell(true);
        }
      }}
      style={{ height: '100%' }}
      defaultColumnOptions={{
        resizable: true,
        sortable: true,
      }}
      groupBy={[]}
      rowGrouper={() => ({})}
      expandedGroupIds={expandedGroupIds}
      onExpandedGroupIdsChange={() => {}}
    />
  );
};

function areEqual(prevProps: SheetEditorProps, nextProps: SheetEditorProps) {
  return (
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.saveContent === nextProps.saveContent
  );
}

export const SpreadsheetEditor = memo(PureSpreadsheetEditor, areEqual);
