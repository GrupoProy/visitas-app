// utils/storage.js
// =============================================================================
// Helpers para persistir tokens en localStorage
// =============================================================================

const KEY_ACCESS = 'visitas_access';
const KEY_REFRESH = 'visitas_refresh';

export const guardarTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(KEY_ACCESS, accessToken);
  if (refreshToken) localStorage.setItem(KEY_REFRESH, refreshToken);
};

export const obtenerAccess = () => localStorage.getItem(KEY_ACCESS);
export const obtenerRefresh = () => localStorage.getItem(KEY_REFRESH);

export const limpiarTokens = () => {
  localStorage.removeItem(KEY_ACCESS);
  localStorage.removeItem(KEY_REFRESH);
};

export const haySesion = () => !!obtenerRefresh();