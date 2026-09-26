import { useCallback, useEffect, useRef, useState } from "react";
import { request } from "../lib/apiClient.js";

/**
 * Data loading with loading / error / refetch state.
 *
 * `params` is compared by serialised value, so callers can pass a fresh object
 * literal on every render without causing a request loop.
 */
export function useFetch(url, params, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);

  const key = JSON.stringify(params ?? null);
  const mounted = useRef(true);
  const loadedOnce = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (mode = "initial") => {
      if (!enabled || !url) return;
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const result = await request.get(url, params ? JSON.parse(key) : undefined);
        if (mounted.current) {
          setData(result);
          loadedOnce.current = true;
        }
      } catch (requestError) {
        if (mounted.current) setError(requestError);
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // `params` is intentionally replaced by its serialised form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, key, enabled]
  );

  useEffect(() => {
    run(loadedOnce.current ? "refresh" : "initial");
  }, [run]);

  return {
    data,
    error,
    loading,
    refreshing,
    /** True only for the very first load, so lists can show skeletons once. */
    isInitialLoading: loading && !loadedOnce.current,
    refetch: useCallback(() => run("refresh"), [run]),
    setData,
  };
}
