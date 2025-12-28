import { produce } from 'immer';
import type { MosaicKey, MosaicNode, MosaicPath, MosaicUpdate, MosaicUpdateSpec } from '../types';
import { MosaicDropTargetPosition } from '../types';
import {
  getAndAssertNodeAtPathExists,
  getNodeAtPath,
  getOtherBranch,
  isParent,
} from './mosaic-utilities';

/**
 * Apply an array of updates to a tree
 */
export const updateTree = <T extends MosaicKey>(
  root: MosaicNode<T> | null,
  updates: MosaicUpdate<T>[],
): MosaicNode<T> | null => {
  if (root === null) {
    return null;
  }

  let current = root;

  for (const update of updates) {
    // Handle root-level $set specially
    if (update.path.length === 0 && '$set' in update.spec) {
      current = update.spec.$set;
    } else {
      current = produce(current, (draft) => {
        applyUpdateAtPath(draft as MosaicNode<T>, update.path, update.spec);
      });
    }
  }

  return current;
};

const applyUpdateAtPath = <T extends MosaicKey>(
  node: MosaicNode<T>,
  path: MosaicPath,
  spec: MosaicUpdateSpec<T>,
): void => {
  if (path.length === 0) {
    if ('$set' in spec) {
      // This case is handled at the parent level
      return;
    }
    if (isParent(node)) {
      if (spec.splitPercentage) {
        node.splitPercentage = spec.splitPercentage.$set;
      }
      if (spec.direction) {
        node.direction = spec.direction.$set;
      }
      if (spec.first) {
        applyUpdateAtPath(node.first, [], spec.first);
      }
      if (spec.second) {
        applyUpdateAtPath(node.second, [], spec.second);
      }
    }
    return;
  }

  if (!isParent(node)) {
    return;
  }

  const [branch, ...rest] = path;
  if (!branch) return;

  if (rest.length === 0 && '$set' in spec) {
    node[branch] = spec.$set;
  } else {
    applyUpdateAtPath(node[branch], rest, spec);
  }
};

/**
 * Create an update to remove a node at a path
 */
export const createRemoveUpdate = <T extends MosaicKey>(
  root: MosaicNode<T> | null,
  path: MosaicPath,
): MosaicUpdate<T> => {
  if (root === null || path.length === 0) {
    throw new Error('Cannot remove root node');
  }

  const parentPath = path.slice(0, -1);
  const branch = path[path.length - 1]!;
  const siblingBranch = getOtherBranch(branch);

  const parent = getAndAssertNodeAtPathExists(root, parentPath);
  if (!isParent(parent)) {
    throw new Error('Parent is not a parent node');
  }

  const sibling = parent[siblingBranch];

  return {
    path: parentPath,
    spec: { $set: sibling },
  };
};

/**
 * Create an update to expand a node to a percentage
 */
export const createExpandUpdate = <T extends MosaicKey>(
  path: MosaicPath,
  percentage = 70,
): MosaicUpdate<T> => {
  if (path.length === 0) {
    throw new Error('Cannot expand root node');
  }

  const parentPath = path.slice(0, -1);
  const branch = path[path.length - 1]!;

  const splitPercentage = branch === 'first' ? percentage : 100 - percentage;

  return {
    path: parentPath,
    spec: {
      splitPercentage: { $set: splitPercentage },
    },
  };
};

/**
 * Create an update to hide a node (set to null placeholder)
 */
export const createHideUpdate = <T extends MosaicKey>(path: MosaicPath): MosaicUpdate<T> => {
  return {
    path,
    spec: { $set: null as unknown as MosaicNode<T> },
  };
};

/**
 * Create updates for drag and drop operation
 */
export const createDragToUpdates = <T extends MosaicKey>(
  root: MosaicNode<T>,
  sourcePath: MosaicPath,
  destinationPath: MosaicPath,
  position: MosaicDropTargetPosition,
): MosaicUpdate<T>[] => {
  const sourceNode = getNodeAtPath(root, sourcePath);
  if (sourceNode === null) {
    return [];
  }

  const destinationNode = getNodeAtPath(root, destinationPath);
  if (destinationNode === null) {
    return [];
  }

  // Don't allow dropping on itself
  if (JSON.stringify(sourcePath) === JSON.stringify(destinationPath)) {
    return [];
  }

  // Determine split direction based on drop position
  const direction =
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.RIGHT
      ? 'row'
      : 'column';

  // Determine which node goes first
  const first =
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
      ? sourceNode
      : destinationNode;

  const second =
    position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
      ? destinationNode
      : sourceNode;

  const newSplitNode: MosaicNode<T> = {
    direction,
    first,
    second,
    splitPercentage: 50,
  };

  // Check if destination is a parent of source
  const isDestinationParentOfSource =
    sourcePath.length > destinationPath.length &&
    destinationPath.every((branch, index) => sourcePath[index] === branch);

  if (isDestinationParentOfSource) {
    // Special case: destination contains source
    // We need to remove source from within destination first, then split
    const relativeSourcePath = sourcePath.slice(destinationPath.length);
    const updatedDestination = updateTree(destinationNode, [
      createRemoveUpdate(destinationNode, relativeSourcePath),
    ]);

    if (updatedDestination === null) {
      return [];
    }

    // Create new split node with updated destination
    const adjustedSplitNode: MosaicNode<T> = {
      direction,
      first:
        position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
          ? sourceNode
          : updatedDestination,
      second:
        position === MosaicDropTargetPosition.LEFT || position === MosaicDropTargetPosition.TOP
          ? updatedDestination
          : sourceNode,
      splitPercentage: 50,
    };

    return [
      {
        path: destinationPath,
        spec: { $set: adjustedSplitNode },
      },
    ];
  }

  // Standard case: remove source, then add split at destination
  const updates: MosaicUpdate<T>[] = [];

  // Remove source
  if (sourcePath.length > 0) {
    updates.push(createRemoveUpdate(root, sourcePath));
  }

  // Determine if we need to adjust the destination path after removal
  let adjustedDestinationPath = destinationPath;

  // Check if source and destination are siblings (share the same parent)
  const sourceParentPath = sourcePath.slice(0, -1);
  const destParentPath = destinationPath.slice(0, -1);

  const areSiblings =
    sourceParentPath.length === destParentPath.length &&
    sourceParentPath.every((branch, index) => destParentPath[index] === branch);

  if (areSiblings) {
    // After removing source, destination becomes its parent's only child
    // So the parent is replaced with destination
    // New destination path is the parent path
    adjustedDestinationPath = sourceParentPath;
  } else {
    // Check if source parent path is a prefix of destination path
    const isSourceParentInDestPath =
      sourceParentPath.length > 0 &&
      sourceParentPath.length < destinationPath.length &&
      sourceParentPath.every((branch, index) => destinationPath[index] === branch);

    if (isSourceParentInDestPath) {
      // Source parent is an ancestor of destination
      // After removing source, the tree structure changes
      const sourceBranch = sourcePath[sourceParentPath.length];
      const destBranchAtSameLevel = destinationPath[sourceParentPath.length];

      // If both are at the same level under source's parent
      if (sourceBranch === destBranchAtSameLevel) {
        // Destination is a descendant of source's sibling
        // After removal, destination moves up in the path
        adjustedDestinationPath = [
          ...sourceParentPath,
          ...destinationPath.slice(sourceParentPath.length + 1),
        ];
      }
    }
  }

  // Add the new split at destination
  updates.push({
    path: adjustedDestinationPath,
    spec: { $set: newSplitNode },
  });

  return updates;
};

/**
 * Create an update to replace a node at a path
 */
export const createReplaceUpdate = <T extends MosaicKey>(
  path: MosaicPath,
  node: MosaicNode<T>,
): MosaicUpdate<T> => {
  return {
    path,
    spec: { $set: node },
  };
};

/**
 * Create an update to split a node
 */
export const createSplitUpdate = <T extends MosaicKey>(
  path: MosaicPath,
  newNode: T,
  direction: 'row' | 'column' = 'row',
): MosaicUpdate<T> => {
  return {
    path,
    spec: {
      $set: {
        direction,
        first: newNode,
        second: newNode,
        splitPercentage: 50,
      },
    },
  };
};
