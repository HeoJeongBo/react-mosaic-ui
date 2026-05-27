import { createContext, useContext } from 'react';
import type { MosaicContextValue, MosaicWindowContextValue } from '../types';
import type { MosaicKey } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MosaicContext = createContext<MosaicContextValue<any>>({
  mosaicActions: {
    expand: () => {},
    remove: () => {},
    hide: () => {},
    replaceWith: () => {},
    updateTree: () => {},
    getRoot: () => null,
    add: () => {},
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

export function useMosaicContext<T extends MosaicKey = string>(): MosaicContextValue<T> {
  return useContext(MosaicContext) as MosaicContextValue<T>;
}

export function useMosaicWindowContext(): MosaicWindowContextValue {
  return useContext(MosaicWindowContext);
}
