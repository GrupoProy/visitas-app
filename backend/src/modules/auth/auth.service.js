// =============================================================================
// Servicio de autenticación:
//   · Login con control de intentos y bloqueo progresivo
//   · Emisión de par access+refresh
//   · Perfil completo
// =============================================================================

import bcrypt from 'bcryptjs';
import { query } from '../../config/db.js';
import { listarClavesPorUsuario } from '../permisos/permisos.service.js';
import { getValor } from '../parametros/parametros.service.js';
import { emitirPar } from './refresh.service.js';

// ---------------------------------------------------------------------------
// PERFIL COMPLETO (sin cambios de forma)
// ---------------------------------------------------------------------------
export const obtenerPerfil = async (usuarioId) => {
  const { rows } = await query(
    `SELECT
        u.id, u.username, u.email, u.nombres,
        u.primer_apellido, u.segundo_apellido,
        u.telefono, u.estado, u.ultimo_acceso,
        u.id_persona, u.debe_cambiar_password, u.password_actualizado_en,
        COALESCE(
          (SELECT json_agg(json_build_object('id', r.id, 'nombre', r.nombre) ORDER BY r.nombre)
             FROM rol_usuario ru
             JOIN rol r ON r.id = ru.id_rol
            WHERE ru.id_usuario = u.id
              AND ru.estado = 'ACTIVO'
              AND r.estado = 'ACTIVO'),
          '[]'::json
        ) AS roles_json,
        (SELECT json_build_object(
                   'id', p.id,
                   'tipo_documento', p.tipo_documento,
                   'numero_documento', p.numero_documento,
                   'nombres', p.nombres,
                   'primer_apellido', p.primer_apellido,
                   'segundo_apellido', p.segundo_apellido,
                   'email', p.email,
                   'telefono', p.telefono,
                   'procedencia', p.procedencia,
                   'es_anfitrion', p.es_anfitrion
                 )
            FROM persona p
           WHERE p.id = u.id_persona) AS persona
       FROM usuario u
      WHERE u.id = $1
      LIMIT 1`,
    [usuarioId]
  );

  const u = rows[0];
  if (!u) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });

  return {
    id: u.id,
    username: u.username,
    email: u.email,
    nombres: u.nombres,
    primer_apellido: u.primer_apellido,
    segundo_apellido: u.segundo_apellido,
    telefono: u.telefono,
    estado: u.estado,
    ultimo_acceso: u.ultimo_acceso,
    id_persona: u.id_persona,
    persona: u.persona,
    debe_cambiar_password: u.debe_cambiar_password,
    password_actualizado_en: u.password_actualizado_en,
    roles: (u.roles_json || []).map((r) => r.nombre),
    rolesDetalle: u.roles_json || [],
  };
};

// ---------------------------------------------------------------------------
// LOGIN con control de intentos
// ---------------------------------------------------------------------------
export const loginService = async ({ username, password, ip, userAgent }) => {
  // Parámetros de política
  const maxIntentos = parseInt(await getValor('LOGIN_MAX_INTENTOS', '5'), 10);
  const minutosBloqueoBase = parseInt(await getValor('LOGIN_BLOQUEO_MINUTOS', '15'), 10);
  const factorBackoff = parseInt(await getValor('LOGIN_BACKOFF_MULTIPLICADOR', '2'), 10);
  const topeBloqueo = parseInt(await getValor('LOGIN_MAX_BLOQUEO_MINUTOS', '120'), 10);

  // 1. Buscar usuario
  const { rows } = await query(
    `SELECT id, username, email, password_hash, nombres,
            primer_apellido, segundo_apellido, estado, id_persona,
            debe_cambiar_password,
            intentos_fallidos, bloqueado_hasta
       FROM usuario
      WHERE username = $1 OR email = $1
      LIMIT 1`,
    [username]
  );
  const user = rows[0];

  // Usuario no existe → auditoría + error genérico
  if (!user) {
    await auditarIntento({
      username,
      idUsuario: null,
      ip,
      userAgent,
      exitoso: false,
      motivo: 'CREDENCIALES_INVALIDAS',
    });
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  // 2. ¿Está bloqueado?
  if (user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
    const restante = Math.ceil(
      (new Date(user.bloqueado_hasta) - Date.now()) / 60000
    );
    await auditarIntento({
      username,
      idUsuario: user.id,
      ip,
      userAgent,
      exitoso: false,
      motivo: 'BLOQUEADO',
    });
    throw Object.assign(
      new Error(`Cuenta bloqueada temporalmente. Intente en ${restante} minuto(s).`),
      { status: 423, code: 'CUENTA_BLOQUEADA', minutosRestantes: restante }
    );
  }

  // 3. ¿Estado válido?
  if (user.estado !== 'ACTIVO') {
    await auditarIntento({
      username,
      idUsuario: user.id,
      ip,
      userAgent,
      exitoso: false,
      motivo: user.estado === 'ELIMINADO' ? 'ELIMINADO' : 'INACTIVO',
    });
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  // 4. Comparar contraseña
  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    // Calcular nuevo estado de bloqueo
    const nuevosIntentos = (user.intentos_fallidos || 0) + 1;
    let bloqueadoHasta = null;

    if (nuevosIntentos >= maxIntentos) {
      // Backoff: base * factor^(reincidencias), con tope
      const reincidencias = Math.floor(nuevosIntentos / maxIntentos) - 1;
      const minutos = Math.min(
        minutosBloqueoBase * Math.pow(factorBackoff, Math.max(0, reincidencias)),
        topeBloqueo
      );
      bloqueadoHasta = new Date(Date.now() + minutos * 60000);
    }

    await query(
      `UPDATE usuario
          SET intentos_fallidos = $1,
              bloqueado_hasta = $2,
              modificado_por = 'auth',
              fecha_modificacion = NOW()
        WHERE id = $3`,
      [nuevosIntentos, bloqueadoHasta, user.id]
    );

    await auditarIntento({
      username,
      idUsuario: user.id,
      ip,
      userAgent,
      exitoso: false,
      motivo: bloqueadoHasta ? 'BLOQUEADO' : 'CREDENCIALES_INVALIDAS',
    });

    if (bloqueadoHasta) {
      const minutos = Math.round((bloqueadoHasta - Date.now()) / 60000);
      throw Object.assign(
        new Error(`Cuenta bloqueada por ${minutos} minuto(s) tras demasiados intentos.`),
        { status: 423, code: 'CUENTA_BLOQUEADA', minutosRestantes: minutos }
      );
    }

    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  // 5. Login exitoso → resetear contadores
  await query(
    `UPDATE usuario
        SET intentos_fallidos = 0,
            bloqueado_hasta = NULL,
            ultimo_acceso = NOW(),
            modificado_por = 'auth',
            fecha_modificacion = NOW()
      WHERE id = $1`,
    [user.id]
  );

  await auditarIntento({
    username,
    idUsuario: user.id,
    ip,
    userAgent,
    exitoso: true,
  });

  // 6. Roles
  const { rows: rolesRows } = await query(
    `SELECT r.nombre
       FROM rol r
       JOIN rol_usuario ru ON ru.id_rol = r.id
      WHERE ru.id_usuario = $1
        AND ru.estado = 'ACTIVO'
        AND r.estado = 'ACTIVO'`,
    [user.id]
  );
  const roles = rolesRows.map((r) => r.nombre);

  // 7. Emitir par access+refresh
  const { accessToken, refreshToken, refreshExpiraEn } = await emitirPar({
    usuario: user,
    roles,
    recordar: false,
    ip,
    userAgent,
  });

  // 8. Perfil + permisos
  const perfil = await obtenerPerfil(user.id);
  const permisos = await listarClavesPorUsuario(user.id);

  return {
    accessToken,
    refreshToken,
    refreshExpiraEn,
    usuario: { ...perfil, permisos },
  };
};

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------
const auditarIntento = async ({ username, idUsuario, ip, userAgent, exitoso, motivo }) => {
  try {
    await query(
      `INSERT INTO login_intento
         (username, id_usuario, ip, user_agent, exitoso, motivo_fallo)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        username?.substring(0, 50) || null,
        idUsuario || null,
        ip || null,
        (userAgent || '').substring(0, 255) || null,
        exitoso,
        motivo || null,
      ]
    );
  } catch (err) {
    // No bloquear login por fallo de auditoría
    console.error('[auditarIntento] Error:', err.message);
  }
};