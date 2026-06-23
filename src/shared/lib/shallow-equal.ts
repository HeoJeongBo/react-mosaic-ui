/**
 * Shallow-compares two objects of the same shape, ignoring the keys in
 * `skipKeys` (typically callback props read from refs, where a new identity
 * should not force a re-render). Returns `true` when every non-skipped key is
 * referentially equal and both objects expose the same key set.
 *
 * Used by the React.memo comparators in MosaicWindow / MosaicWindowToolbar.
 */
export function shallowEqualSkipping<T extends object>(
  prev: T,
  next: T,
  skipKeys: ReadonlySet<string>,
): boolean {
  for (const key of Object.keys(prev)) {
    if (skipKeys.has(key)) continue;
    if (prev[key as keyof T] !== next[key as keyof T]) return false;
  }
  for (const key of Object.keys(next)) {
    if (skipKeys.has(key)) continue;
    if (!(key in prev)) return false;
  }
  return true;
}
