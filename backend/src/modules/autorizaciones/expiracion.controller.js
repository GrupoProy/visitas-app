import { expirarVencidas } from './expiracion.service.js';
import { ok } from '../../utils/response.js';

export const ejecutarExpiracion = async (req, res, next) => {
  try {
    const result = await expirarVencidas();
    ok(res, result, `Expiradas ${result.total} autorizaciones`);
  } catch (e) { next(e); }
};