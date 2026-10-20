// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { PrivateRoute } from './components/PrivateRoute';
import Layout from './components/Layout';
import { homePorRol } from './utils/homePorRol';

import Login from './pages/Login';
import CambiarPassword from './pages/CambiarPassword';
import Dashboard from './pages/Dashboard';
import Autorizaciones from './pages/Autorizaciones';
import Verificacion from './pages/Verificacion';
import Personas from './pages/Personas';
import Lugares from './pages/Lugares';
import Usuarios from './pages/Usuarios';
import Parametros from './pages/Parametros';
import Menus from './pages/Menus';
import Permisos from './pages/Permisos';
import Auditoria from './pages/Auditoria';
import Reportes from './pages/Reportes';
import { ThemeProvider } from './context/ThemeContext';

const AppShell = ({ children, menu, permiso }) => (
  <PrivateRoute menu={menu} permiso={permiso}>
    <Layout>{children}</Layout>
  </PrivateRoute>
);

/**
 * Ruta de cambio de contraseña: requiere sesión pero NO pasa por
 * el guard de mustChangePassword del PrivateRoute (obvio).
 */
const CambiarPasswordRoute = () => {
  const { usuario, loading } = useAuth();
  if (loading) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  return <CambiarPassword />;
};

const RootRedirect = () => {
  const { usuario, loading } = useAuth();
  if (loading) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.debe_cambiar_password) return <Navigate to="/cambiar-password" replace />;
  return <Navigate to={homePorRol(usuario)} replace />;
};

export default function App() {
  return (
    <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/cambiar-password" element={<CambiarPasswordRoute />} />

            <Route path="/dashboard" element={<AppShell menu="dashboard"><Dashboard /></AppShell>} />
            <Route path="/" element={<AppShell menu="autorizaciones"><Autorizaciones /></AppShell>} />
            <Route path="/verificacion" element={<AppShell menu="verificacion"><Verificacion /></AppShell>} />
            <Route path="/personas" element={<AppShell menu="personas"><Personas /></AppShell>} />
            <Route path="/lugares" element={<AppShell menu="lugares"><Lugares /></AppShell>} />
            <Route path="/usuarios" element={<AppShell menu="usuarios"><Usuarios /></AppShell>} />
            <Route path="/parametros" element={<AppShell menu="parametros"><Parametros /></AppShell>} />

            {/* Rutas meta */}
            <Route path="/menus" element={<AppShell permiso="menus.gestionar"><Menus /></AppShell>} />
            <Route path="/permisos" element={<AppShell permiso="menus.gestionar"><Permisos /></AppShell>} />
            <Route path="/auditoria" element={<AppShell permiso="auditoria.ver"><Auditoria /></AppShell>} />
            <Route path="/reportes" element={<AppShell permiso="reportes.ver"><Reportes /></AppShell>} />

           
           
           
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}