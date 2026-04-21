import { Mosaic } from '@/entities/mosaic/ui/mosaic';
import type { MosaicKey, MosaicNode, TileRenderer } from '@/shared/types';
import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

interface RenderWithMosaicOptions<T extends MosaicKey> extends Omit<RenderOptions, 'wrapper'> {
  value?: MosaicNode<T> | null;
  onChange?: (node: MosaicNode<T> | null) => void;
  renderTile?: TileRenderer<T>;
  mosaicId?: string;
}

export function renderWithMosaic<T extends MosaicKey = string>(
  options: RenderWithMosaicOptions<T> = {},
) {
  const {
    value = null,
    onChange = () => {},
    renderTile = (id: T) => <div data-testid={String(id)}>{String(id)}</div>,
    mosaicId,
    ...renderOptions
  } = options;

  return render(
    <Mosaic
      value={value}
      onChange={onChange}
      renderTile={renderTile}
      {...(mosaicId !== undefined && { mosaicId })}
    />,
    renderOptions,
  );
}

export function createMockContextValue(overrides = {}) {
  return {
    mosaicActions: {
      expand: vi.fn(),
      remove: vi.fn(),
      hide: vi.fn(),
      replaceWith: vi.fn(),
      updateTree: vi.fn(),
      getRoot: vi.fn(() => null),
    },
    mosaicId: 'test-mosaic',
    renderTile: (_id: unknown) => <></>,
    ...overrides,
  };
}

export function createMockWindowContextValue(overrides = {}) {
  return {
    mosaicWindowActions: {
      split: vi.fn(),
      replaceWithNew: vi.fn(),
      getPath: vi.fn(() => []),
    },
    ...overrides,
  };
}

export { render };
export type { ReactNode };
