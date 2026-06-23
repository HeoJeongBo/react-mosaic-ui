export { Mosaic } from './ui/mosaic';
export type { MosaicProps, MosaicControlledProps, MosaicUncontrolledProps } from './ui/mosaic';
// MosaicRoot is intentionally NOT re-exported — it is an internal renderer consumed
// only by Mosaic (via a relative import), not part of the public API.
