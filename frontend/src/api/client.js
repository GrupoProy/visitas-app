// api/client.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// ---------------------------------------------------------------------------
// Claves de storage (centralizadas para no equivocarse)
// ---------------------------------------------------------------------------
const STORAGE = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
};

export const getAccessToken = () => localStorage.getItem(STORAGE.ACCESS);
export const getRefreshToken = () => localStorage.getItem(STORAGE.REFRESH);

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(STORAGE.ACCESS, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE.REFRESH, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(STORAGE.ACCESS);
  localStorage.removeItem(STORAGE.REFRESH);
};

// ---------------------------------------------------------------------------
// Instancia principal
// ---------------------------------------------------------------------------
export const api = axios.create({ baseURL: BASE_URL });

// ---------------------------------------------------------------------------
// Interceptor de REQUEST: adjunta access token
// ---------------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config._skipAuth) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// Interceptor de RESPONSE: refresh automático
// ---------------------------------------------------------------------------

// Cola de requests que esperan a que termine el refresh actual
let refreshPromise = null;

/**
 * Pide un nuevo par de tokens al backend usando el refresh actual.
 * Devuelve el accessToken nuevo o lanza error.
 */
const ejecutarRefresh = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('Sin refresh token');

  // Cliente "limpio" para no recursar el interceptor
  const { data } = await axios.post(
    `${BASE_URL}/auth/refresh`,
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } }
  );

  // El backend responde { success, data: { accessToken, refreshToken, usuario } }
  const nuevos = data?.data || {};
  if (!nuevos.accessToken || !nuevos.refreshToken) {
    throw new Error('Respuesta de refresh inválida');
  }
  setTokens(nuevos);
  return { accessToken: nuevos.accessToken, usuario: nuevos.usuario };
};

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config || {};
    const status = err.response?.status;
    const code = err.response?.data?.code;

    // 1. NO refrescar si:
    //    - No es 401
    //    - El código no es TOKEN_EXPIRED
    //    - Ya reintentamos este request
    //    - El endpoint es del propio auth (login/refresh/logout/change-password)
    const esAuthEndpoint =
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/logout');

    if (
      status !== 401 ||
      code !== 'TOKEN_EXPIRED' ||
      original._retry ||
      esAuthEndpoint ||
      original._skipAuth
    ) {
      return Promise.reject(err);
    }

    // 2. Marcar el request como reintentado
    original._retry = true;

    // 3. Si ya hay un refresh en curso, esperar a ese
    if (!refreshPromise) {
      refreshPromise = ejecutarRefresh()
        .catch((e) => {
          // Refresh falló → limpiar sesión y propagar error
          clearTokens();
          // Avisamos a la app (opcional: evento para que AuthContext reaccione)
          window.dispatchEvent(new Event('auth:logout'));
          throw e;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      await refreshPromise;
      // Reintentar el request original (ya con el nuevo access token)
      return api(original);
    } catch (e) {
      return Promise.reject(e);
    }
  }
);