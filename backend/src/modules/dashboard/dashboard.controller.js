import * as s from './dashboard.service.js';
import { expirarVencidasRapido } from '../autorizaciones/expiracion.service.js';

import { ok } from '../../utils/response.js';

export const obtenerDashboard = async (req, res, next) => {
  try {
    await expirarVencidasRapido(); // limpieza lazy

    const periodo = req.query.periodo || 'hoy';
    if (!['hoy', 'semana', 'mes'].includes(periodo))
      return res.status(400).json({ success: false, message: 'Período inválido' });

    // Si es SOLO ANFITRION, filtrar por su id_persona
    const esSoloAnfitrion =
      req.user.roles?.length === 1 &&
      req.user.roles.includes('ANFITRION');

    const idAnfitrion = esSoloAnfitrion ? req.user.id_persona : null;

    // Si es solo anfitrión y no tiene persona vinculada → dashboard vacío
    if (esSoloAnfitrion && !idAnfitrion) {
      return ok(res, {
        resumen: { total: 0, enCurso: 0, finalizadas: 0, visitantesUnicos: 0,
                   lugaresActivos: 0, pendientes: 0, rechazadas: 0, canceladas: 0,
                   aprobadas: 0, duracionPromedioMin: 0, periodo },
        serie: [], porEstado: [], topLugares: [], topAnfitriones: [],
        recientes: [], huerfanas: [],
      });
    }

    ok(res, await s.obtenerDashboard({ periodo, idAnfitrion }));
  } catch (e) { next(e); }
};