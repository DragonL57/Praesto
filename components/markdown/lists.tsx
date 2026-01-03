import type { HTMLAttributes } from 'react';
import { listStyles, textStyles } from './styles';

type ListProps = HTMLAttributes<HTMLElement> & { node?: unknown };

export const OrderedList = ({ children, node: _node, ...props }: ListProps) => (
  <ol className={listStyles.ordered} {...props}>
    {children}
  </ol>
);

export const UnorderedList = ({
  children,
  node: _node,
  ...props
}: ListProps) => (
  <ul className={listStyles.unordered} {...props}>
    {children}
  </ul>
);

export const ListItem = ({ children, node: _node, ...props }: ListProps) => (
  <li className={textStyles.listItem} {...props}>
    {children}
  </li>
);

/**
 * Creates all list components for react-markdown
 */
export const createListComponents = () => ({
  ol: OrderedList,
  ul: UnorderedList,
  li: ListItem,
});
