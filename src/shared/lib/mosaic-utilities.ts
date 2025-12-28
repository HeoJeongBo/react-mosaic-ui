import type {
  MosaicBranch,
  MosaicDirection,
  MosaicKey,
  MosaicNode,
  MosaicParent,
  MosaicPath,
} from '../types';
import { Corner } from '../types';

/**
 * Type guard to check if a node is a parent node
 */
export const isParent = <T extends MosaicKey>(
  node: MosaicNode<T> | null,
): node is MosaicParent<T> => {
  return (
    node !== null &&
    typeof node === 'object' &&
    'direction' in node &&
    'first' in node &&
    'second' in node
  );
};

/**
 * Get all leaf nodes from a tree
 */
export const getLeaves = <T extends MosaicKey>(node: MosaicNode<T> | null): T[] => {
  if (node === null) {
    return [];
  }

  if (isParent(node)) {
    return [...getLeaves(node.first), ...getLeaves(node.second)];
  }

  return [node];
};

/**
 * Get the node at a given path
 */
export const getNodeAtPath = <T extends MosaicKey>(
  node: MosaicNode<T>,
  path: MosaicPath,
): MosaicNode<T> | null => {
  if (path.length === 0) {
    return node;
  }

  if (!isParent(node)) {
    return null;
  }

  const [branch, ...rest] = path;
  if (!branch) return null;
  return getNodeAtPath(node[branch], rest);
};

/**
 * Get the node at a given path, throws if not found
 */
export const getAndAssertNodeAtPathExists = <T extends MosaicKey>(
  node: MosaicNode<T>,
  path: MosaicPath,
): MosaicNode<T> => {
  const result = getNodeAtPath(node, path);
  if (result === null) {
    throw new Error(`Node at path ${path.join('/')} not found`);
  }
  return result;
};

/**
 * Create a balanced tree from an array of leaves
 */
export const createBalancedTreeFromLeaves = <T extends MosaicKey>(
  leaves: T[],
  startDirection: MosaicDirection = 'row',
): MosaicNode<T> | null => {
  if (leaves.length === 0) {
    return null;
  }

  if (leaves.length === 1) {
    return leaves[0]!;
  }

  const mid = Math.floor(leaves.length / 2);
  const first = createBalancedTreeFromLeaves(
    leaves.slice(0, mid),
    getOtherDirection(startDirection),
  );
  const second = createBalancedTreeFromLeaves(leaves.slice(mid), getOtherDirection(startDirection));

  if (first === null || second === null) {
    return first ?? second;
  }

  return {
    direction: startDirection,
    first,
    second,
    splitPercentage: 50,
  };
};

/**
 * Get the path to a corner of the tree
 */
export const getPathToCorner = <T extends MosaicKey>(
  node: MosaicNode<T>,
  corner: Corner,
): MosaicPath => {
  const path: MosaicPath = [];
  let current: MosaicNode<T> = node;

  while (isParent(current)) {
    const isTop = corner === Corner.TOP_LEFT || corner === Corner.TOP_RIGHT;
    const isLeft = corner === Corner.TOP_LEFT || corner === Corner.BOTTOM_LEFT;

    const branch: MosaicBranch =
      (current.direction === 'column' && isTop) || (current.direction === 'row' && isLeft)
        ? 'first'
        : 'second';

    path.push(branch);
    current = current[branch];
  }

  return path;
};

/**
 * Get the opposite direction
 */
export const getOtherDirection = (direction: MosaicDirection): MosaicDirection => {
  return direction === 'row' ? 'column' : 'row';
};

/**
 * Get the opposite branch
 */
export const getOtherBranch = (branch: MosaicBranch): MosaicBranch => {
  return branch === 'first' ? 'second' : 'first';
};

/**
 * Count the total number of nodes in the tree
 */
export const countNodes = <T extends MosaicKey>(node: MosaicNode<T> | null): number => {
  if (node === null) {
    return 0;
  }

  if (isParent(node)) {
    return 1 + countNodes(node.first) + countNodes(node.second);
  }

  return 1;
};

/**
 * Get the depth of the tree
 */
export const getTreeDepth = <T extends MosaicKey>(node: MosaicNode<T> | null): number => {
  if (node === null) {
    return 0;
  }

  if (isParent(node)) {
    return 1 + Math.max(getTreeDepth(node.first), getTreeDepth(node.second));
  }

  return 1;
};
