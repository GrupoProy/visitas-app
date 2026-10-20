import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import * as ctrl from './dashboard.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', requirePermiso('dashboard.ver'), ctrl.obtenerDashboard);

export default router;