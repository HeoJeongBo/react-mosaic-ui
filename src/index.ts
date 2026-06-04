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
export type { MosaicWindowProps, MosaicWindowToolbarProps } from './entities/window';

// Features
export { Split } from './features/resize';
export type { SplitProps } from './features/resize';

export { MosaicDropTarget } from './features/drag-drop';
export type { MosaicDropTargetProps } from './features/drag-drop';

export { MosaicLayout, useMosaicPanels, usePersistedLayout } from './features/panel-manager';
export type {
  GetDirectionFn,
  MosaicLayoutProps,
  PersistedPanelEntry,
  PersistedLayoutRegistry,
  UsePersistedLayoutOptions,
  UsePersistedLayoutResult,
} from './features/panel-manager';

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
  DragBindings,
  MosaicRootActions,
  MosaicContextValue,
  MosaicWindowActions,
  MosaicWindowContextValue,
  MosaicDragItem,
  MosaicDropData,
  MosaicPanelConfig,
} from './shared/types';

export { MosaicDropTargetPosition, Corner } from './shared/types';

// Utilities
export {
  isParent,
  getLeaves,
  pruneTree,
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
export {
  MosaicContext,
  MosaicWindowContext,
  useMosaicContext,
  useMosaicWindowContext,
} from './shared/lib/context';

// Styles
import './styles/index.css';
