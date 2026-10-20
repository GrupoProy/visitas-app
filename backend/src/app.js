import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import authRoutes        from './modules/auth/auth.routes.js';
//import apiRouter from './routes/index.js'; 
import personasRoutes    from './modules/personas/personas.routes.js';
import autorizacionesRoutes from './modules/autorizaciones/autorizaciones.routes.js';
import lugaresRoutes     from './modules/lugares/lugares.routes.js';
import usuariosRoutes    from './modules/usuarios/usuarios.routes.js';
import rolesRoutes       from './modules/roles/roles.routes.js';
import parametrosRoutes from './modules/parametros/parametros.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import menusRoutes from './modules/menus/menus.routes.js';
import permisosRoutes from './modules/permisos/permisos.routes.js';
import limpiezaRoutes from './modules/limpieza/limpieza.routes.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { authenticate, requirePasswordChanged } from './middlewares/auth.js';
import auditoriaRoutes from './modules/auditoria/auditoria.routes.js';
import reportesRoutes from './modules/reportes/reportes.routes.js';


const app = express();
app.use(helmet());
app.use(cors({
  exposedHeaders: ['Content-Disposition', 'Content-Length'],
}));app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date() }));

app.use('/api/auth', authRoutes);
//app.use('/api', authenticate, requirePasswordChanged, apiRouter);
const guard = [authenticate, requirePasswordChanged];
app.use('/api/personas', guard,personasRoutes);
app.use('/api/autorizaciones', guard, autorizacionesRoutes);
app.use('/api/lugares', guard, lugaresRoutes);
app.use('/api/usuarios', guard, usuariosRoutes);
app.use('/api/roles', guard, rolesRoutes);
app.use('/api/parametros', guard, parametrosRoutes);
app.use('/api/dashboard', guard,dashboardRoutes);
app.use('/api/menus', guard,menusRoutes);
app.use('/api/permisos', guard,permisosRoutes);
app.use('/api/limpieza', guard, limpiezaRoutes);
app.use('/api/auditoria', guard, auditoriaRoutes);
app.use('/api/reportes', guard, reportesRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;