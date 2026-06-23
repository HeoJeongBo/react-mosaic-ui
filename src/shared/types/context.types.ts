import type {
  MosaicDirection,
  MosaicKey,
  MosaicNode,
  MosaicPath,
  MosaicUpdate,
  TileRenderer,
} from './mosaic.types';

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

  /**
   * Append a new node by wrapping the existing root in a single new parent.
   * Preserves all existing subtree references so memoized renderers skip re-render.
   */
  add: (newNode: T, direction?: MosaicDirection) => void;

  /**
   * Maximize the tile at `path`: render only that leaf, remembering the previous
   * full tree so {@link restore} can put it back. No-op for the root path or a
   * missing path. Works in controlled mode (the captured tree is emitted via
   * onChange on restore).
   */
  maximize: (path: MosaicPath) => void;

  /**
   * Restore the tree captured by the last {@link maximize} call. No-op when
   * nothing is currently maximized.
   */
  restore: () => void;

  /**
   * Whether a tile is currently maximized (between a maximize and a restore).
   */
  isMaximized: () => boolean;
}

/**
 * Context provided by Mosaic component
 */
export interface MosaicContextValue<T extends MosaicKey = string> {
  mosaicActions: MosaicRootActions<T>;
  mosaicId: string;
  renderTile: TileRenderer<T>;
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
}

/**
 * Context provided by MosaicWindow component
 */
export interface MosaicWindowContextValue<T extends MosaicKey = string> {
  mosaicWindowActions: MosaicWindowActions;
  /** The leaf ID of this window in the mosaic tree. Provided by MosaicLayout; undefined when MosaicWindow is used standalone. */
  panelId?: T;
}

/**
 * Imperative tracker for the currently-active (focused) window. Toggles the
 * `.rm-mosaic-window--active` class directly on the DOM so activating a window
 * never triggers a React re-render. Internal — provided by Mosaic via
 * ActiveWindowContext.
 */
export interface ActiveWindowManager {
  /** Mark `el` as the active window (clears the previously-active one). */
  activate: (el: HTMLElement | null) => void;
  /** Clear `el`'s active state; used when a window unmounts while active. */
  deactivate: (el: HTMLElement) => void;
}
