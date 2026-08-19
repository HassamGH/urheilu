import { useCallback, useEffect, useState } from 'react';

export function useAsync<T>(loader: (signal: AbortSignal) => Promise<T>, deps: unknown[], initialData?: T) {
  const [data, setData] = useState<T | null>(initialData ?? null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const retry = useCallback(() => setRefreshIndex((value) => value + 1), []);

  useEffect(() => {
    if (initialData !== undefined && refreshIndex === 0) {
      setData(initialData);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loader(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [...deps, refreshIndex, initialData]);

  return { data, error, loading, retry };
}
