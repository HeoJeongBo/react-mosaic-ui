/**
 * Core types for React Mosaic UI
 * Based on Feature-Sliced Design architecture
 */

export type MosaicKey = string | number;

export type MosaicDirection = 'row' | 'column';

export type MosaicBranch = 'first' | 'second';

export type MosaicPath = MosaicBranch[];

/**
 * Mosaic node can be either a parent node (split) or a leaf (window id)
 */
export type MosaicNode<T extends MosaicKey = string> = MosaicParent<T> | T;

/**
 * Parent node representing a split in the layout
 */
export interface MosaicParent<T extends MosaicKey = string> {
  direction: MosaicDirection;
  first: MosaicNode<T>;
  second: MosaicNode<T>;
  splitPercentage?: number;
}

/**
 * Drop target position for drag and drop
 */
export enum MosaicDropTargetPosition {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

/**
 * Corner positions for utility functions
 */
export enum Corner {
  TOP_LEFT = 1,
  TOP_RIGHT = 2,
  BOTTOM_LEFT = 3,
  BOTTOM_RIGHT = 4,
}

/**
 * Resize options
 */
export interface ResizeOptions {
  minimumPaneSizePercentage?: number;
}

/**
 * Bounding box for layout calculations
 */
export interface BoundingBox {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Update specification for immutable tree updates
 */
export interface MosaicUpdate<T extends MosaicKey = string> {
  path: MosaicPath;
  spec: MosaicUpdateSpec<T>;
}

/**
 * Update spec compatible with immer
 */
export type MosaicUpdateSpec<T extends MosaicKey = string> =
  | { $set: MosaicNode<T> }
  | {
      splitPercentage?: { $set: number };
      direction?: { $set: MosaicDirection };
      first?: MosaicUpdateSpec<T>;
      second?: MosaicUpdateSpec<T>;
    };

/**
 * Drag and drop types
 */
export interface MosaicDragItem {
  mosaicId: string;
  path: MosaicPath;
}

export interface MosaicDropData {
  path: MosaicPath;
  position: MosaicDropTargetPosition;
}

/**
 * Render function for tiles
 */
export type TileRenderer<T extends MosaicKey = string> = (id: T, path: MosaicPath) => JSX.Element;

/**
 * Function to create new nodes
 */
export type CreateNode<T extends MosaicKey = string> = () => T | Promise<T>;
