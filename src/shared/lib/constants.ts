/**
 * The react-dnd item type shared by the drag source (MosaicWindow) and every
 * drop target (MosaicDropTarget). Both sides must use the same string for
 * drag-and-drop to connect, so it lives here as the single source of truth.
 */
export const MOSAIC_DRAG_ITEM_TYPE = 'MosaicWindow' as const;
