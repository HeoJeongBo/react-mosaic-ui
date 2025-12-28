import { createContext } from 'react';
import type { MosaicContextValue, MosaicWindowContextValue } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MosaicContext = createContext<MosaicContextValue<any>>({
  mosaicActions: {
    expand: () => {},
    remove: () => {},
    hide: () => {},
    replaceWith: () => {},
    updateTree: () => {},
    getRoot: () => null,
  },
  mosaicId: 'default',
});

export const MosaicWindowContext = createContext<MosaicWindowContextValue>({
  mosaicWindowActions: {
    split: async () => {},
    replaceWithNew: async () => {},
    getPath: () => [],
    connectDragSource: (el) => el,
  },
});
