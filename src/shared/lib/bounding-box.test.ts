import { describe, expect, it } from 'vitest';
import { containsPoint, createBoundingBox, getHeight, getWidth, split } from './bounding-box';

describe('bounding-box', () => {
  describe('createBoundingBox', () => {
    it('should create a bounding box with given values', () => {
      expect(createBoundingBox(10, 200, 100, 0)).toEqual({
        top: 10,
        right: 200,
        bottom: 100,
        left: 0,
      });
    });

    it('should handle zero values', () => {
      expect(createBoundingBox(0, 0, 0, 0)).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
    });
  });

  describe('getWidth', () => {
    it('should calculate width as right minus left', () => {
      expect(getWidth(createBoundingBox(0, 100, 50, 20))).toBe(80);
    });

    it('should return 0 for zero-width box', () => {
      expect(getWidth(createBoundingBox(0, 50, 100, 50))).toBe(0);
    });
  });

  describe('getHeight', () => {
    it('should calculate height as bottom minus top', () => {
      expect(getHeight(createBoundingBox(10, 100, 90, 0))).toBe(80);
    });

    it('should return 0 for zero-height box', () => {
      expect(getHeight(createBoundingBox(50, 100, 50, 0))).toBe(0);
    });
  });

  describe('containsPoint', () => {
    const box = createBoundingBox(10, 90, 80, 20);

    it('should return true for point inside the box', () => {
      expect(containsPoint(box, 50, 50)).toBe(true);
    });

    it('should return true for point on the left boundary', () => {
      expect(containsPoint(box, 20, 50)).toBe(true);
    });

    it('should return true for point on the right boundary', () => {
      expect(containsPoint(box, 90, 50)).toBe(true);
    });

    it('should return true for point on the top boundary', () => {
      expect(containsPoint(box, 50, 10)).toBe(true);
    });

    it('should return true for point on the bottom boundary', () => {
      expect(containsPoint(box, 50, 80)).toBe(true);
    });

    it('should return false for point above the box', () => {
      expect(containsPoint(box, 50, 9)).toBe(false);
    });

    it('should return false for point below the box', () => {
      expect(containsPoint(box, 50, 81)).toBe(false);
    });

    it('should return false for point left of the box', () => {
      expect(containsPoint(box, 19, 50)).toBe(false);
    });

    it('should return false for point right of the box', () => {
      expect(containsPoint(box, 91, 50)).toBe(false);
    });
  });

  describe('split', () => {
    const box = createBoundingBox(0, 100, 100, 0);

    it('should split horizontally (row) at 50%', () => {
      const [left, right] = split(box, 50, 'row');
      expect(left).toEqual({ top: 0, right: 50, bottom: 100, left: 0 });
      expect(right).toEqual({ top: 0, right: 100, bottom: 100, left: 50 });
    });

    it('should split vertically (column) at 50%', () => {
      const [top, bottom] = split(box, 50, 'column');
      expect(top).toEqual({ top: 0, right: 100, bottom: 50, left: 0 });
      expect(bottom).toEqual({ top: 50, right: 100, bottom: 100, left: 0 });
    });

    it('should split at asymmetric percentage', () => {
      const [left, right] = split(box, 70, 'row');
      expect(left.right).toBe(70);
      expect(right.left).toBe(70);
    });

    it('should clamp percentage below 0 to 0', () => {
      const [first, second] = split(box, -10, 'row');
      expect(first.right).toBe(0);
      expect(second.left).toBe(0);
    });

    it('should clamp percentage above 100 to 100', () => {
      const [first, second] = split(box, 110, 'row');
      expect(first.right).toBe(100);
      expect(second.left).toBe(100);
    });

    it('should preserve non-split dimensions', () => {
      const [left, right] = split(box, 30, 'row');
      expect(left.top).toBe(box.top);
      expect(left.bottom).toBe(box.bottom);
      expect(right.top).toBe(box.top);
      expect(right.bottom).toBe(box.bottom);
    });
  });
});
