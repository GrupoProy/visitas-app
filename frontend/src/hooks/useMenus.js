import { useEffect, useState } from 'react';
import { api } from '../api/client';

let cache = null;
let cacheTs = 0;
const TTL = 5 * 60 * 1000;

export const invalidarCacheMenus = () => {
  cache = null;
  cacheTs = 0;
};

/**
 * @param {Object} opts
 * @param {boolean} opts.enabled Solo carga cuando es true (ej. ya hay usuario).
 */
export const useMenus = ({ enabled = true } = {}) => {
  // El state incluye "loaded" para saber si ya intentamos cargar.
  const [state, setState] = useState({
    menus: cache || [],
    loaded: !!cache,
  });

  useEffect(() => {
    if (!enabled) return;
    if (state.loaded) return;

    // Caché válida
    const ahora = Date.now();
    if (cache && ahora - cacheTs < TTL) {
      setState({ menus: cache, loaded: true });
      return;
    }

    // Cargar y poblar caché
    api.get('/menus/mios')
      .then((r) => {
        cache = r.data.data || [];
        cacheTs = Date.now();
        setState({ menus: cache, loaded: true });
      })
      .catch(() => {
        cache = [];
        cacheTs = Date.now();
        setState({ menus: [], loaded: true });
      });
  }, [enabled, state.loaded]);

  // ⭐ loading es derivado: mientras enabled y aún no cargamos nada
  const loading = enabled && !state.loaded;

  return { menus: state.menus, loading, invalidar: invalidarCacheMenus };
};