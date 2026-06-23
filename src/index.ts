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

// Shared UI (presentational components that depend only on shared/*)
export { Split } from './shared/ui';
export type { SplitProps } from './shared/ui';

export { MosaicDropTarget } from './shared/ui';
export type { MosaicDropTargetProps } from './shared/ui';

export {
  MosaicLayout,
  useMosaicPanels,
  usePersistedLayout,
  usePanelState,
  defineRegistry,
} from './features/panel-manager';
export type {
  GetDirectionFn,
  MosaicLayoutProps,
  PersistedPanelEntry,
  PersistedLayoutRegistry,
  UsePersistedLayoutOptions,
  UsePersistedLayoutResult,
  UsePanelStateOptions,
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
