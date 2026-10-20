import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { requirePermiso } from '../../middlewares/permisos.js';
import * as s from './roles.service.js';
import { ok } from '../../utils/response.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermiso('menus.gestionar', 'usuarios.listar'),
  async (req, res, next) => {
    try { ok(res, await s.listar()); } catch (e) { next(e); }
  }
);

export default router;