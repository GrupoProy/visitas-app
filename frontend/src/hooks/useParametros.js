import { useEffect, useState } from 'react';
import { api } from '../api/client';

let cache = null;
let cacheTs = 0;
const TTL = 5 * 60 * 1000;

export const invalidarCacheParametros = () => {
  cache = null;
  cacheTs = 0;
};

export const useParametros = ({ enabled = true } = {}) => {
  const [parametros, setParametros] = useState(cache || {});
  const [loading, setLoading] = useState(enabled && !cache);

  useEffect(() => {
    if (!enabled) return;

    const ahora = Date.now();
    if (cache && ahora - cacheTs < TTL) {
      setParametros(cache);
      setLoading(false);
      return;
    }

    api.get('/parametros/publicos')
      .then((r) => {
        cache = r.data.data;
        cacheTs = Date.now();
        setParametros(cache);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [enabled]);

  return { parametros, loading };
};

