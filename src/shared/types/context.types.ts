import type { MosaicKey, MosaicNode, MosaicPath, MosaicUpdate } from './mosaic.types';

/**
 * Root-level actions available through MosaicContext
 */
export interface MosaicRootActions<T extends MosaicKey = string> {
  /**
   * Expand a node at the given path to a percentage of the container
   */
  expand: (path: MosaicPath, percentage?: number) => void;

  /**
   * Remove the node at the given path
   */
  remove: (path: MosaicPath) => void;

  /**
   * Hide the node at the given path (for drag and drop)
   */
  hide: (path: MosaicPath) => void;

  /**
   * Replace the node at the given path with a new node
   */
  replaceWith: (path: MosaicPath, node: MosaicNode<T>) => void;

  /**
   * Update the tree with an array of updates
   */
  updateTree: (updates: MosaicUpdate<T>[], suppressOnRelease?: boolean) => void;

  /**
   * Get the current root node
   */
  getRoot: () => MosaicNode<T> | null;
}

/**
 * Context provided by Mosaic component
 */
export interface MosaicContextValue<T extends MosaicKey = string> {
  mosaicActions: MosaicRootActions<T>;
  mosaicId: string;
}

/**
 * Window-level actions available through MosaicWindowContext
 */
export interface MosaicWindowActions {
  /**
   * Split the current window
   */
  split: () => Promise<void>;

  /**
   * Replace the current window with a new node
   */
  replaceWithNew: () => Promise<void>;

  /**
   * Get the path of the current window
   */
  getPath: () => MosaicPath;

  /**
   * Connect a drag source element
   */
  connectDragSource: (element: React.ReactElement) => React.ReactElement | null;
}

/**
 * Context provided by MosaicWindow component
 */
export interface MosaicWindowContextValue {
  mosaicWindowActions: MosaicWindowActions;
}
