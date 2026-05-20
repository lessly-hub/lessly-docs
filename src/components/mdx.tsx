import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Callout } from './docs/Callout';
import { CodeBlock } from './docs/CodeBlock';
import { DiataxisBadge } from './docs/DiataxisBadge';
import { FeedbackWidget } from './docs/FeedbackWidget';
import { PageStatus } from './docs/PageStatus';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Callout,
    CodeBlock,
    DiataxisBadge,
    FeedbackWidget,
    PageStatus,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
