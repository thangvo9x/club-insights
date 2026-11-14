'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchJson } from '@/lib/api-client';

type QueryResult<T> =
  | { key: string; status: 'success'; data: T }
  | { key: string; status: 'error'; error: string };

/** Pass null to pause a query until its parameters are available. */
export function useJsonQuery<T>(url: string | null) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<QueryResult<T>>();
  const key = JSON.stringify([url, revision]);
  const refetch = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (url === null) return;
    const controller = new AbortController();
    fetchJson<T>(url, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setResult({ key, status: 'success', data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            key,
            status: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load data. Please retry.',
          });
        }
      });
    return () => controller.abort();
  }, [url, key]);

  // Hide results from an earlier URL or refresh immediately, before effects run.
  const current = url !== null && result?.key === key ? result : undefined;
  return {
    data: current?.status === 'success' ? current.data : undefined,
    error: current?.status === 'error' ? current.error : undefined,
    isLoading: url !== null && !current,
    refetch,
  };
}
