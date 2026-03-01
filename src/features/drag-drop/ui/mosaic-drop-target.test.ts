import { MosaicDropTargetPosition } from '@/shared/types';
import { describe, expect, it } from 'vitest';
import { getDropTargetStyle } from './mosaic-drop-target';

describe('getDropTargetStyle', () => {
  it('uses 30% edge size when not hovered', () => {
    expect(getDropTargetStyle(MosaicDropTargetPosition.LEFT, false)).toMatchObject({
      left: 0,
      right: 'calc(100% - 30%)',
    });
    expect(getDropTargetStyle(MosaicDropTargetPosition.TOP, false)).toMatchObject({
      top: 0,
      bottom: 'calc(100% - 30%)',
    });
  });

  it('expands hovered target to 50% of the window edge', () => {
    expect(getDropTargetStyle(MosaicDropTargetPosition.RIGHT, true)).toMatchObject({
      right: 0,
      left: 'calc(100% - 50%)',
    });
    expect(getDropTargetStyle(MosaicDropTargetPosition.BOTTOM, true)).toMatchObject({
      bottom: 0,
      top: 'calc(100% - 50%)',
    });
  });

  it('uses a thin viewport hit strip and expands to 50% on hover', () => {
    expect(getDropTargetStyle(MosaicDropTargetPosition.LEFT, false, 'viewport-edge')).toMatchObject(
      {
        left: 0,
        right: 'calc(100% - 24px)',
      },
    );
    expect(getDropTargetStyle(MosaicDropTargetPosition.TOP, true, 'viewport-edge')).toMatchObject({
      top: 0,
      bottom: 'calc(100% - 50%)',
    });
  });
});
