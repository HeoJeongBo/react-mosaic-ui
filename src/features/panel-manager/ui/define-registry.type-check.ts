// Type-level regression guard for defineRegistry. Verified by `bun run typecheck`;
// it is not a vitest test (no `.test` suffix) and is imported nowhere, so it is
// never bundled or executed. It asserts that componentProps is checked against each
// entry's component props.
import type { FC } from 'react';
import { defineRegistry } from './use-persisted-layout';

const NoProps: FC = () => null;
const WithProps: FC<{ x: number }> = () => null;

// ✓ componentProps matches the component's props (and may be omitted when there are none).
export const validRegistry = defineRegistry({
  a: { component: NoProps },
  b: { component: WithProps, componentProps: { x: 1 } },
});

export const invalidRegistry = defineRegistry({
  // @ts-expect-error componentProps must match WithProps' props ({ x: number })
  b: { component: WithProps, componentProps: { x: 'nope' } },
});
