import type { HTMLAttributes, ReactNode, MouseEvent, TouchEvent } from 'react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { tableStyles } from './styles';
import './table-scrollbar-styles'; // Import scrollbar hiding styles

interface TableWrapperProps {
  children: ReactNode;
  tableRef: React.RefObject<HTMLTableElement | null>;
}

export const TableWrapper = ({ children }: TableWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const lastXRef = useRef(0);

  // Start dragging - but only if clicking on empty space or holding modifier key
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const target = e.target as HTMLElement;

    // Allow dragging if user is holding Shift/Ctrl key
    const isModifierKey = e.shiftKey || e.ctrlKey;

    // Check if the click is on actual text content
    const isClickingOnText = target.tagName === 'SPAN' ||
                            target.tagName === 'P' ||
                            target.tagName === 'STRONG' ||
                            target.tagName === 'EM' ||
                            target.tagName === 'CODE' ||
                            (target.textContent?.trim() && window.getSelection()?.toString() === '');

    // Check if clicking on empty space in cells or container
    const isClickingOnEmptySpace = target.tagName === 'DIV' ||
                                   (target.tagName === 'TD' && !target.textContent?.trim()) ||
                                   (target.tagName === 'TH' && !target.textContent?.trim()) ||
                                   target === containerRef.current ||
                                   target === e.currentTarget;

    // Only start dragging if user is holding modifier key or clicking on empty space
    // But never if clicking on actual text content
    if ((isModifierKey || isClickingOnEmptySpace) && !isClickingOnText) {
      setIsDragging(true);
      setStartX(e.pageX - containerRef.current.offsetLeft);
      setScrollLeft(containerRef.current.scrollLeft);
      lastXRef.current = e.pageX;
      e.preventDefault(); // Only prevent default when we're definitely dragging
    }
  };

  // Handle touch start
  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const touch = e.touches[0];
    setIsDragging(true);
    setStartX(touch.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    lastXRef.current = touch.pageX;
  };

  // Handle mouse move
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    // Only prevent default if we're actually dragging
    // This allows text selection to work normally
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.8; // Speed multiplier
    containerRef.current.scrollLeft = scrollLeft - walk;

    lastXRef.current = e.pageX;
  }, [isDragging, startX, scrollLeft]);

  // Handle touch move
  const handleTouchMove = useCallback((e: globalThis.TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const touch = e.touches[0];
    const x = touch.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.8;
    containerRef.current.scrollLeft = scrollLeft - walk;

    lastXRef.current = touch.pageX;
  }, [isDragging, startX, scrollLeft]);

  // Stop dragging
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);

      // Add cursor styles only
      document.body.style.cursor = 'grabbing';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);

        // Reset cursor styles
        document.body.style.cursor = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className="table-container my-4">
      {/* Draggable container - handles table dragging without overflow constraints */}
      <div
        className="relative cursor-grab active:cursor-grabbing"
        style={{
          ...tableStyles.wrapper,
          cursor: isDragging ? 'grabbing' : 'grab',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="region"
        aria-label="Draggable table container"
        data-draggable="true"
      >
        {/* Inner scrollable content wrapper */}
        <div
          ref={containerRef}
          className="overflow-x-auto scrollbar-hide"
          style={{
            maxWidth: '100%',
            overflowX: 'auto',
            overflowY: 'visible',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            cursor: isDragging ? 'grabbing' : 'default',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

type TableProps = HTMLAttributes<HTMLElement> & { node?: unknown };

export const Table = ({ children, node: _node, ...props }: TableProps) => {
  const tableRef = useRef<HTMLTableElement>(null);

  return (
    <TableWrapper tableRef={tableRef}>
      <table ref={tableRef} style={{...tableStyles.table, ...props.style}} {...props}>
        {children}
      </table>
    </TableWrapper>
  );
};

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
