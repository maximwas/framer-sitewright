/**
 * Memoizes one load per key. The promise itself is stored, so concurrent callers share a single load;
 * a rejected load is evicted and the next call retries.
 */
export function cached<K extends object, T>(memo: WeakMap<K, Promise<T>>, key: K, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);

  if (hit !== undefined) {
    return hit;
  }

  const loading = load();

  memo.set(key, loading);
  loading.catch(() => memo.delete(key));

  return loading;
}
