// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setTokens, clearTokens, getAccessToken, getRefreshToken } from '../api/client';
import { invalidarCacheMenus } from '../hooks/useMenus';
import { invalidarCacheParametros } from '../hooks/useParametros';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  // -------------------------------------------------------------------------
  // Carga inicial: si hay access token, traer perfil
  // -------------------------------------------------------------------------
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((r) => setUsuario(r.data.data.usuario))
      .catch((err) => {
        if (err.response?.status === 401) {
          clearTokens();
        } else {
          console.warn('Error cargando perfil (se mantiene sesión):', err.message);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // -------------------------------------------------------------------------
  // Escuchar el evento 'auth:logout' que dispara el interceptor
  // cuando el refresh falla. Limpia estado y cache.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const handler = () => {
      clearTokens();
      invalidarCacheMenus();
      invalidarCacheParametros();
      setUsuario(null);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    const payload = data.data;

    setTokens({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    });

    invalidarCacheMenus();
    invalidarCacheParametros();
    setUsuario(payload.usuario);
    return payload.usuario;
  }, []);

  // -------------------------------------------------------------------------
  // logout — revoca en backend (si se puede) y limpia local
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Ignorar errores de red en logout
    } finally {
      clearTokens();
      invalidarCacheMenus();
      invalidarCacheParametros();
      setUsuario(null);
    }
  }, []);

  // -------------------------------------------------------------------------
  // changePassword — tras éxito, forzamos re-login
  // -------------------------------------------------------------------------
  const changePassword = useCallback(async ({ passwordActual, passwordNueva }) => {
    const { data } = await api.post('/auth/change-password', {
      passwordActual,
      passwordNueva,
    });
    // El backend ya revocó todos los refresh. Limpiamos local.
    clearTokens();
    invalidarCacheMenus();
    invalidarCacheParametros();
    setUsuario(null);
    return data;
  }, []);

  // -------------------------------------------------------------------------
  // refrescarUsuario — re-consulta /auth/me (útil tras cambios de perfil)
  // -------------------------------------------------------------------------
  const refrescarUsuario = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUsuario(data.data.usuario);
      return data.data.usuario;
    } catch {
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        usuario,
        login,
        logout,
        changePassword,
        loading,
        refrescarUsuario,
        // Derivado útil: ¿debe cambiar contraseña?
        mustChangePassword: !!usuario?.debe_cambiar_password,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);