/**
 * React Mosaic UI
 * A modern tiling window manager for React with FSD architecture
 */

// Main components
export { Mosaic } from './entities/mosaic';
export type {
  MosaicProps,
  MosaicControlledProps,
  MosaicUncontrolledProps,
} from './entities/mosaic';

export { MosaicWindow } from './entities/window';
export type { MosaicWindowProps } from './entities/window';

// Features
export { Split } from './features/resize';
export type { SplitProps } from './features/resize';

export { MosaicDropTarget } from './features/drag-drop';
export type { MosaicDropTargetProps } from './features/drag-drop';

// Types
export type {
  MosaicKey,
  MosaicDirection,
  MosaicBranch,
  MosaicPath,
  MosaicNode,
  MosaicParent,
  ResizeOptions,
  BoundingBox,
  MosaicUpdate,
  MosaicUpdateSpec,
  TileRenderer,
  CreateNode,
  MosaicRootActions,
  MosaicContextValue,
  MosaicWindowActions,
  MosaicWindowContextValue,
  MosaicDragItem,
  MosaicDropData,
} from './shared/types';

export { MosaicDropTargetPosition, Corner } from './shared/types';

// Utilities
export {
  isParent,
  getLeaves,
  getNodeAtPath,
  getAndAssertNodeAtPathExists,
  createBalancedTreeFromLeaves,
  getPathToCorner,
  getOtherDirection,
  getOtherBranch,
  countNodes,
  getTreeDepth,
  updateTree,
  createRemoveUpdate,
  createExpandUpdate,
  createHideUpdate,
  createDragToUpdates,
  createReplaceUpdate,
  createSplitUpdate,
  createBoundingBox,
  getWidth,
  getHeight,
  split,
  containsPoint,
} from './shared/lib';

// Context
export { MosaicContext, MosaicWindowContext } from './shared/lib/context';

// Styles
import './styles/index.css';
