import { createElement, type HTMLAttributes } from 'react';
import { headingStyles } from './styles';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  node?: unknown;
};

/**
 * Factory function to create heading components with dynamic level adjustment
 * @param markdownLevel - The heading level from markdown (1-6)
 * @param baseHeadingLevel - The base level to offset headings by (default 1)
 */
export const createHeadingComponent = (
  markdownLevel: HeadingLevel,
  baseHeadingLevel = 1,
) => {
  const HeadingComponent = ({
    children,
    node: _node,
    ...props
  }: HeadingProps) => {
    // Calculate the actual heading level, capped at 6
    const actualLevel = Math.min(
      baseHeadingLevel + (markdownLevel - 1),
      6,
    ) as HeadingLevel;
    const styleKey = `h${markdownLevel}` as keyof typeof headingStyles;

    return createElement(
      `h${actualLevel}`,
      {
        className: headingStyles[styleKey],
        ...props,
      },
      children,
    );
  };

  HeadingComponent.displayName = `MarkdownH${markdownLevel}`;
  return HeadingComponent;
};

/**
 * Creates all heading components (h1-h6) for a given base heading level
 * @param baseHeadingLevel - The base level to offset headings by
 */
export const createHeadingComponents = (baseHeadingLevel = 1) => ({
  h1: createHeadingComponent(1, baseHeadingLevel),
  h2: createHeadingComponent(2, baseHeadingLevel),
  h3: createHeadingComponent(3, baseHeadingLevel),
  h4: createHeadingComponent(4, baseHeadingLevel),
  h5: createHeadingComponent(5, baseHeadingLevel),
  h6: createHeadingComponent(6, baseHeadingLevel),
});
