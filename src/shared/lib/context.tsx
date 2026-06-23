import { createContext, useContext } from 'react';
import type { ActiveWindowManager, MosaicContextValue, MosaicWindowContextValue } from '../types';
import type { MosaicKey } from '../types';

// biome-ignore lint/suspicious/noExplicitAny: the default context is shared across all MosaicKey types
export const MosaicContext = createContext<MosaicContextValue<any>>({
  mosaicActions: {
    expand: () => {},
    remove: () => {},
    hide: () => {},
    replaceWith: () => {},
    updateTree: () => {},
    getRoot: () => null,
    add: () => {},
    maximize: () => {},
    restore: () => {},
    isMaximized: () => false,
  },
  mosaicId: 'default',
  renderTile: () => null as unknown as JSX.Element,
});

export const MosaicWindowContext = createContext<MosaicWindowContextValue>({
  mosaicWindowActions: {
    split: async () => {},
    replaceWithNew: async () => {},
    getPath: () => [],
  },
});

/**
 * Tracks the active (focused) window so it can be highlighted. `null` when a
 * MosaicWindow is rendered standalone (outside a Mosaic that enables it).
 */
export const ActiveWindowContext = createContext<ActiveWindowManager | null>(null);

export function useMosaicContext<T extends MosaicKey = string>(): MosaicContextValue<T> {
  return useContext(MosaicContext) as MosaicContextValue<T>;
}

export function useMosaicWindowContext(): MosaicWindowContextValue {
  return useContext(MosaicWindowContext);
}
