// modules/auth/password.service.js
import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';
import { getValor } from '../parametros/parametros.service.js';
import { revocarTodosLosRefresh } from './refresh.service.js';

const BCRYPT_ROUNDS = 10;
const PISO_DURO_LONGITUD = 8;   // ⚠️ Nunca menor a esto, aunque el parámetro diga otra cosa

const SIMBOLOS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

// ---------------------------------------------------------------------------
// Validación de política
// ---------------------------------------------------------------------------
export const validarPoliticaPassword = async (password) => {
  const errores = [];

  if (typeof password !== 'string' || password.length === 0) {
    return { valida: false, errores: ['La contraseña no puede estar vacía.'] };
  }

  const minParam = parseInt(await getValor('PASSWORD_MIN_LENGTH', '8'), 10);
  const minLength = Math.max(minParam || 8, PISO_DURO_LONGITUD);

  if (password.length < minLength) {
    errores.push(`La contraseña debe tener al menos ${minLength} caracteres.`);
  }

  const requiereMayus = (await getValor('PASSWORD_REQUIERE_MAYUSCULA', true)) === true;
  const requiereMinus = (await getValor('PASSWORD_REQUIERE_MINUSCULA', true)) === true;
  const requiereNumero = (await getValor('PASSWORD_REQUIERE_NUMERO', true)) === true;
  const requiereSimbolo = (await getValor('PASSWORD_REQUIERE_SIMBOLO', true)) === true;

  if (requiereMayus && !/[A-Z]/.test(password)) {
    errores.push('Debe incluir al menos una letra mayúscula.');
  }
  if (requiereMinus && !/[a-z]/.test(password)) {
    errores.push('Debe incluir al menos una letra minúscula.');
  }
  if (requiereNumero && !/\d/.test(password)) {
    errores.push('Debe incluir al menos un número.');
  }
  if (requiereSimbolo && !SIMBOLOS.test(password)) {
    errores.push('Debe incluir al menos un símbolo.');
  }

  return { valida: errores.length === 0, errores };
};

// ---------------------------------------------------------------------------
// Cambio de contraseña (propio usuario)
// ---------------------------------------------------------------------------
export const cambiarPassword = async ({ idUsuario, username, passwordActual, passwordNueva }) => {
  // 1. Traer hash actual
  const { rows } = await query(
    `SELECT password_hash FROM usuario WHERE id = $1 LIMIT 1`,
    [idUsuario]
  );
  if (!rows[0]) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
  }

  // 2. Verificar contraseña actual
  const match = await bcrypt.compare(passwordActual, rows[0].password_hash);
  if (!match) {
    throw Object.assign(new Error('La contraseña actual es incorrecta'), {
      status: 400,
      code: 'PASSWORD_ACTUAL_INVALIDA',
    });
  }

  // 3. ✨ VALIDAR POLÍTICA — paso crítico
  const { valida, errores } = await validarPoliticaPassword(passwordNueva);
  if (!valida) {
    throw Object.assign(new Error(errores.join(' ')), {
      status: 400,
      code: 'PASSWORD_NO_CUMPLE_POLITICA',
      detalles: errores,
    });
  }

  // 4. No puede ser igual a la anterior
  if (await bcrypt.compare(passwordNueva, rows[0].password_hash)) {
    throw Object.assign(new Error('La nueva contraseña no puede ser igual a la anterior'), {
      status: 400,
      code: 'PASSWORD_REPETIDA',
    });
  }

  // 5. Actualizar
  const nuevoHash = await bcrypt.hash(passwordNueva, BCRYPT_ROUNDS);
  await query(
    `UPDATE usuario
        SET password_hash = $1,
            debe_cambiar_password = FALSE,
            password_actualizado_en = NOW(),
            intentos_fallidos = 0,
            bloqueado_hasta = NULL,
            modificado_por = $2,
            fecha_modificacion = NOW()
      WHERE id = $3`,
    [nuevoHash, username, idUsuario]
  );

  // 6. Revocar todos los refresh
  await revocarTodosLosRefresh(idUsuario, 'CAMBIO_PASSWORD');

  return { exito: true };
};

// ---------------------------------------------------------------------------
// Reset por admin
// ---------------------------------------------------------------------------
export const resetearPassword = async ({ idUsuario, adminUsername }) => {
  const temporal = generarPasswordTemporal();
  const hash = await bcrypt.hash(temporal, BCRYPT_ROUNDS);

  await query(
    `UPDATE usuario
        SET password_hash = $1,
            debe_cambiar_password = TRUE,
            password_actualizado_en = NOW(),
            intentos_fallidos = 0,
            bloqueado_hasta = NULL,
            modificado_por = $2,
            fecha_modificacion = NOW()
      WHERE id = $3`,
    [hash, adminUsername, idUsuario]
  );

  await revocarTodosLosRefresh(idUsuario, 'RESET_ADMIN');
  return { passwordTemporal: temporal };
};

// ---------------------------------------------------------------------------
// Generador de temporal
// ---------------------------------------------------------------------------
const generarPasswordTemporal = () => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const numeros = '23456789';
  const simbolos = '!@#$%&*';
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  const pwd =
    pick(letras.toUpperCase()) +
    pick(letras.toLowerCase()) +
    pick(letras.toLowerCase()) +
    pick(numeros) +
    pick(numeros) +
    pick(simbolos) +
    pick(letras.toLowerCase()) +
    pick(letras.toLowerCase());
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
};