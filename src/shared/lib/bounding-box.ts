import type { BoundingBox } from '../types';

export const createBoundingBox = (
  top: number,
  right: number,
  bottom: number,
  left: number,
): BoundingBox => ({
  top,
  right,
  bottom,
  left,
});

export const getWidth = (box: BoundingBox): number => box.right - box.left;

export const getHeight = (box: BoundingBox): number => box.bottom - box.top;

export const split = (
  box: BoundingBox,
  percentage: number,
  direction: 'row' | 'column',
): [BoundingBox, BoundingBox] => {
  const percent = Math.max(0, Math.min(100, percentage));

  if (direction === 'row') {
    const splitPoint = box.left + (getWidth(box) * percent) / 100;
    return [
      createBoundingBox(box.top, splitPoint, box.bottom, box.left),
      createBoundingBox(box.top, box.right, box.bottom, splitPoint),
    ];
  }
  const splitPoint = box.top + (getHeight(box) * percent) / 100;
  return [
    createBoundingBox(box.top, box.right, splitPoint, box.left),
    createBoundingBox(splitPoint, box.right, box.bottom, box.left),
  ];
};

export const containsPoint = (box: BoundingBox, x: number, y: number): boolean => {
  return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
};
