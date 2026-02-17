import { describe, expect, it } from 'vitest';
import { Corner } from '../types';
import type { MosaicNode } from '../types';
import {
  arePathsEqual,
  countNodes,
  createBalancedTreeFromLeaves,
  getAndAssertNodeAtPathExists,
  getLeaves,
  getNodeAtPath,
  getOtherBranch,
  getOtherDirection,
  getPathToCorner,
  getTreeDepth,
  isParent,
} from './mosaic-utilities';

type TestId = 'a' | 'b' | 'c' | 'd' | 'e';

describe('mosaic-utilities', () => {
  describe('isParent', () => {
    it('should return true for parent node', () => {
      const node: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      expect(isParent(node)).toBe(true);
    });

    it('should return false for leaf node', () => {
      expect(isParent<TestId>('a')).toBe(false);
    });

    it('should return false for null', () => {
      expect(isParent(null)).toBe(false);
    });
  });

  describe('getLeaves', () => {
    it('should return empty array for null', () => {
      expect(getLeaves(null)).toEqual([]);
    });

    it('should return single leaf for leaf node', () => {
      expect(getLeaves<TestId>('a')).toEqual(['a']);
    });

    it('should return both leaves for simple parent tree', () => {
      const tree: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      expect(getLeaves(tree)).toEqual(['a', 'b']);
    });

    it('should return all leaves in order from deeply nested tree', () => {
      const tree: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: {
          direction: 'column',
          first: 'c',
          second: 'd',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      };
      expect(getLeaves(tree)).toEqual(['a', 'b', 'c', 'd']);
    });
  });

  describe('getNodeAtPath', () => {
    const tree: MosaicNode<TestId> = {
      direction: 'row',
      first: {
        direction: 'column',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      },
      second: 'c',
      splitPercentage: 50,
    };

    it('should return root node for empty path', () => {
      expect(getNodeAtPath(tree, [])).toBe(tree);
    });

    it('should return correct child for single-step path', () => {
      expect(getNodeAtPath(tree, ['second'])).toBe('c');
    });

    it('should return correct node for nested path', () => {
      expect(getNodeAtPath(tree, ['first', 'first'])).toBe('a');
      expect(getNodeAtPath(tree, ['first', 'second'])).toBe('b');
    });

    it('should return null when path goes through a leaf', () => {
      expect(getNodeAtPath(tree, ['second', 'first'])).toBeNull();
    });

    it('should return null for path deeper than the tree', () => {
      expect(getNodeAtPath(tree, ['first', 'first', 'first'])).toBeNull();
    });
  });

  describe('getAndAssertNodeAtPathExists', () => {
    const tree: MosaicNode<TestId> = {
      direction: 'row',
      first: 'a',
      second: 'b',
      splitPercentage: 50,
    };

    it('should return node for valid path', () => {
      expect(getAndAssertNodeAtPathExists(tree, [])).toBe(tree);
      expect(getAndAssertNodeAtPathExists(tree, ['first'])).toBe('a');
    });

    it('should throw for path that leads to null', () => {
      expect(() => getAndAssertNodeAtPathExists(tree, ['first', 'first'])).toThrow();
    });
  });

  describe('createBalancedTreeFromLeaves', () => {
    it('should return null for empty array', () => {
      expect(createBalancedTreeFromLeaves([])).toBeNull();
    });

    it('should return leaf directly for single item', () => {
      expect(createBalancedTreeFromLeaves<TestId>(['a'])).toBe('a');
    });

    it('should create simple two-leaf tree with default row direction', () => {
      expect(createBalancedTreeFromLeaves<TestId>(['a', 'b'])).toEqual({
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      });
    });

    it('should use custom start direction', () => {
      expect(createBalancedTreeFromLeaves<TestId>(['a', 'b'], 'column')).toEqual({
        direction: 'column',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      });
    });

    it('should create balanced tree for 3 leaves with alternating directions', () => {
      // mid=1: first='a', second=createBalanced(['b','c'], 'column')
      expect(createBalancedTreeFromLeaves<TestId>(['a', 'b', 'c'])).toEqual({
        direction: 'row',
        first: 'a',
        second: {
          direction: 'column',
          first: 'b',
          second: 'c',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      });
    });

    it('should create balanced tree for 4 leaves', () => {
      // mid=2: first=createBalanced(['a','b'], 'column'), second=createBalanced(['c','d'], 'column')
      expect(createBalancedTreeFromLeaves<TestId>(['a', 'b', 'c', 'd'])).toEqual({
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: {
          direction: 'column',
          first: 'c',
          second: 'd',
          splitPercentage: 50,
        },
        splitPercentage: 50,
      });
    });
  });

  describe('getPathToCorner', () => {
    // Tree layout:
    // Root (row)
    // ├── Left (column)
    // │   ├── a  ← TOP_LEFT
    // │   └── b  ← BOTTOM_LEFT
    // └── Right (column)
    //     ├── c  ← TOP_RIGHT
    //     └── d  ← BOTTOM_RIGHT
    const tree: MosaicNode<TestId> = {
      direction: 'row',
      first: {
        direction: 'column',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      },
      second: {
        direction: 'column',
        first: 'c',
        second: 'd',
        splitPercentage: 50,
      },
      splitPercentage: 50,
    };

    it('should find path to TOP_LEFT corner', () => {
      expect(getPathToCorner(tree, Corner.TOP_LEFT)).toEqual(['first', 'first']);
    });

    it('should find path to BOTTOM_LEFT corner', () => {
      expect(getPathToCorner(tree, Corner.BOTTOM_LEFT)).toEqual(['first', 'second']);
    });

    it('should find path to TOP_RIGHT corner', () => {
      expect(getPathToCorner(tree, Corner.TOP_RIGHT)).toEqual(['second', 'first']);
    });

    it('should find path to BOTTOM_RIGHT corner', () => {
      expect(getPathToCorner(tree, Corner.BOTTOM_RIGHT)).toEqual(['second', 'second']);
    });

    it('should return empty path for leaf node', () => {
      expect(getPathToCorner<TestId>('a', Corner.TOP_LEFT)).toEqual([]);
    });
  });

  describe('getOtherDirection', () => {
    it('should return column for row', () => {
      expect(getOtherDirection('row')).toBe('column');
    });

    it('should return row for column', () => {
      expect(getOtherDirection('column')).toBe('row');
    });
  });

  describe('getOtherBranch', () => {
    it('should return second for first', () => {
      expect(getOtherBranch('first')).toBe('second');
    });

    it('should return first for second', () => {
      expect(getOtherBranch('second')).toBe('first');
    });
  });

  describe('countNodes', () => {
    it('should return 0 for null', () => {
      expect(countNodes(null)).toBe(0);
    });

    it('should return 1 for leaf node', () => {
      expect(countNodes<TestId>('a')).toBe(1);
    });

    it('should count parent + 2 leaves = 3 for simple tree', () => {
      const tree: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      expect(countNodes(tree)).toBe(3);
    });

    it('should count all nodes in nested tree', () => {
      // 2 parents + 3 leaves = 5
      const tree: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: 'a',
          second: 'b',
          splitPercentage: 50,
        },
        second: 'c',
        splitPercentage: 50,
      };
      expect(countNodes(tree)).toBe(5);
    });
  });

  describe('getTreeDepth', () => {
    it('should return 0 for null', () => {
      expect(getTreeDepth(null)).toBe(0);
    });

    it('should return 1 for leaf node', () => {
      expect(getTreeDepth<TestId>('a')).toBe(1);
    });

    it('should return 2 for single-level parent', () => {
      const tree: MosaicNode<TestId> = {
        direction: 'row',
        first: 'a',
        second: 'b',
        splitPercentage: 50,
      };
      expect(getTreeDepth(tree)).toBe(2);
    });

    it('should return depth of the deepest branch in an unbalanced tree', () => {
      // Root(1) → Left(2) → Inner(3) → leaf(4), depth=4
      const tree: MosaicNode<TestId> = {
        direction: 'row',
        first: {
          direction: 'column',
          first: {
            direction: 'row',
            first: 'a',
            second: 'b',
            splitPercentage: 50,
          },
          second: 'c',
          splitPercentage: 50,
        },
        second: 'd',
        splitPercentage: 50,
      };
      expect(getTreeDepth(tree)).toBe(4);
    });
  });

  describe('arePathsEqual', () => {
    it('should return true for identical paths', () => {
      expect(arePathsEqual(['first', 'second'], ['first', 'second'])).toBe(true);
    });

    it('should return true for two empty paths', () => {
      expect(arePathsEqual([], [])).toBe(true);
    });

    it('should return false for paths of different lengths', () => {
      expect(arePathsEqual(['first'], ['first', 'second'])).toBe(false);
    });

    it('should return false for paths with different content', () => {
      expect(arePathsEqual(['first', 'second'], ['first', 'first'])).toBe(false);
    });

    it('should return false for reversed paths', () => {
      expect(arePathsEqual(['first', 'second'], ['second', 'first'])).toBe(false);
    });
  });
});
