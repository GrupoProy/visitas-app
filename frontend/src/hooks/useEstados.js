import { useEffect, useState } from 'react';
import { api } from '../api/client';

let cache = null;
let cacheTs = 0;
const TTL = 10 * 60 * 1000;

export const invalidarCacheEstados = () => {
  cache = null;
  cacheTs = 0;
};

/**
 * Devuelve los VALORES válidos de cada módulo.
 * La metadata visual se lee de `utils/estadosMeta.js`.
 */
export const useEstados = ({ enabled = true } = {}) => {
  const [estados, setEstados] = useState(cache || {});
  const [loading, setLoading] = useState(enabled && !cache);

  useEffect(() => {
    if (!enabled) return;

    const ahora = Date.now();
    if (cache && ahora - cacheTs < TTL) {
      setEstados(cache);
      setLoading(false);
      return;
    }

    api.get('/parametros/estados')
      .then((r) => {
        cache = r.data.data || {};
        cacheTs = Date.now();
        setEstados(cache);
      })
      .catch(() => setEstados({}))
      .finally(() => setLoading(false));
  }, [enabled]);

  /**
   * Devuelve los VALORES válidos de un módulo.
   * Ej: valoresDe('usuario') → ['ACTIVO', 'INACTIVO', 'BLOQUEADO', 'ELIMINADO']
   */
  const valoresDe = (modulo) => estados[modulo] || [];

  return { estados, loading, valoresDe };
};