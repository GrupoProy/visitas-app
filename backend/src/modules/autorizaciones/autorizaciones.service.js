// modules/autorizaciones/autorizaciones.service.js
import { query } from '../../config/db.js';
import { generarCodigo } from '../../utils/auditoria.js';
import { obtenerOCrear } from '../personas/personas.service.js';
import { getValor } from '../parametros/parametros.service.js';
import { validarRangoHorario } from '../../utils/horario.js';

// =============================================================================
// HELPERS
// =============================================================================
const formatearHora = (d) =>
  new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

// =============================================================================
// ⭐ SEGURIDAD: Helpers de control de acceso por rol ANFITRION
// =============================================================================

const cargarUsuarioCompleto = async (username) => {
  const { rows } = await query(
    `SELECT
        u.id, u.username, u.id_persona, u.estado,
        COALESCE(
          (SELECT json_agg(r.nombre)
             FROM rol_usuario ru
             JOIN rol r ON r.id = ru.id_rol
            WHERE ru.id_usuario = u.id
              AND ru.estado = 'ACTIVO'
              AND r.estado = 'ACTIVO'),
          '[]'::json
        ) AS roles
       FROM usuario u
      WHERE u.username = $1
      LIMIT 1`,
    [username]
  );
  if (!rows[0]) {
    throw Object.assign(new Error('Usuario no encontrado'), { status: 401 });
  }
  return rows[0];
};

const esSoloAnfitrion = (usuario) => {
  const roles = usuario.roles || [];
  return roles.length === 1 && roles.includes('ANFITRION');
};

const validarAnfitrionPermitidoPorId = (usuario, idAnfitrion) => {
  if (!esSoloAnfitrion(usuario)) return;

  if (!usuario.id_persona) {
    throw Object.assign(
      new Error('Tu usuario no está vinculado a una persona. Contactá al administrador.'),
      { status: 403, code: 'USUARIO_SIN_PERSONA' }
    );
  }

  if (Number(idAnfitrion) !== Number(usuario.id_persona)) {
    console.warn(
      `[SEGURIDAD] Anfitrión "${usuario.username}" intentó usar id_anfitrion=${idAnfitrion} ` +
      `(su persona=${usuario.id_persona})`
    );
    throw Object.assign(
      new Error('Como anfitrión, solo podés gestionar autorizaciones donde tú seas el anfitrión'),
      { status: 403, code: 'ANFITRION_NO_AUTORIZADO' }
    );
  }
};

const validarAccesoAAutorizacion = (usuario, autorizacion) => {
  if (!esSoloAnfitrion(usuario)) return;

  if (!usuario.id_persona) {
    throw Object.assign(
      new Error('Tu usuario no está vinculado a una persona'),
      { status: 403, code: 'USUARIO_SIN_PERSONA' }
    );
  }

  if (Number(autorizacion.id_anfitrion) !== Number(usuario.id_persona)) {
    console.warn(
      `[SEGURIDAD] Anfitrión "${usuario.username}" intentó operar sobre autorización ` +
      `id=${autorizacion.id} (anfitrión=${autorizacion.id_anfitrion}, su persona=${usuario.id_persona})`
    );
    throw Object.assign(
      new Error('No tenés permiso para operar sobre esta autorización'),
      { status: 403, code: 'ANFITRION_NO_AUTORIZADO' }
    );
  }
};

/**
 * Resuelve la persona del anfitrión:
 *   - Si el usuario es SOLO ANFITRION → desde usuario.id_persona
 *   - Si el usuario es ADMIN/OPERADOR → desde payload.anfitrion (documento)
 *     ⭐ EXCEPCIÓN: un OPERADOR/ADMIN puede usar SU PROPIA persona como anfitrión
 *        aunque no esté marcada con es_anfitrion = true (para el prefill del frontend).
 */
const resolverAnfitrion = async (usuario, payload) => {
  // --- Caso A: usuario solo ANFITRION ---
  if (esSoloAnfitrion(usuario)) {
    if (!usuario.id_persona) {
      throw Object.assign(
        new Error('Tu usuario no está vinculado a una persona. Contactá al administrador.'),
        { status: 403, code: 'USUARIO_SIN_PERSONA' }
      );
    }

    const { rows: [persona] } = await query(
      `SELECT id, tipo_documento, numero_documento,
              nombres, primer_apellido, segundo_apellido,
              email, telefono, procedencia
         FROM persona
        WHERE id = $1
        LIMIT 1`,
      [usuario.id_persona]
    );

    if (!persona) {
      throw Object.assign(
        new Error('La persona vinculada a tu usuario no existe'),
        { status: 403, code: 'PERSONA_NO_ENCONTRADA' }
      );
    }

    return persona;
  }

  // --- Caso B: usuario ADMIN/OPERADOR → debe venir en payload ---
  if (!payload.anfitrion?.tipo_documento || !payload.anfitrion?.numero_documento) {
    throw Object.assign(
      new Error('Seleccioná un anfitrión para la visita'),
      { status: 400, code: 'ANFITRION_REQUERIDO' }
    );
  }

  const { rows: [persona] } = await query(
    `SELECT id, tipo_documento, numero_documento,
            nombres, primer_apellido, segundo_apellido,
            email, telefono, procedencia, es_anfitrion, estado
       FROM persona
      WHERE tipo_documento = $1 AND numero_documento = $2
      LIMIT 1`,
    [payload.anfitrion.tipo_documento, payload.anfitrion.numero_documento]
  );

  if (!persona) {
    throw Object.assign(
      new Error(
        `No se encontró un anfitrión registrado con el documento ${payload.anfitrion.tipo_documento} ${payload.anfitrion.numero_documento}. Registrá primero a la persona y marcala como "Es anfitrión".`
      ),
      { status: 404, code: 'ANFITRION_NO_ENCONTRADO' }
    );
  }

  // ⭐ Un OPERADOR/ADMIN puede usar SU PROPIA persona como anfitrión,
  //    aunque no esté marcada con es_anfitrion = true.
  const esPropioUsuario =
    usuario.id_persona != null &&
    Number(usuario.id_persona) === Number(persona.id);
  const tieneRolAutoautorizado =
    (usuario.roles || []).some((r) => ['ADMIN', 'OPERADOR'].includes(r));

  if (!persona.es_anfitrion && !(esPropioUsuario && tieneRolAutoautorizado)) {
    throw Object.assign(
      new Error(`La persona ${persona.nombres} ${persona.primer_apellido} NO está marcada como anfitrión.`),
      { status: 409, code: 'PERSONA_NO_ES_ANFITRION' }
    );
  }

  if (persona.estado !== 'ACTIVO') {
    throw Object.assign(
      new Error(`El anfitrión ${persona.nombres} ${persona.primer_apellido} está ${persona.estado.toLowerCase()}.`),
      { status: 409, code: 'ANFITRION_NO_ACTIVO' }
    );
  }

  return persona;
};

// =============================================================================
// CREAR
// =============================================================================
export const crear = async (payload, userId) => {
  // 1) Cargar usuario y resolver anfitrión
  const usuario = await cargarUsuarioCompleto(userId);
  const anfitrion = await resolverAnfitrion(usuario, payload);

  // 2) Resolver visitante
  const { persona: visitante } = await obtenerOCrear(payload.visitante, userId);

  if (visitante.es_anfitrion) {
    throw Object.assign(
      new Error(
        `"${visitante.nombres} ${visitante.primer_apellido}" está registrada como anfitrión y no puede registrarse como visitante.`
      ),
      { status: 409 }
    );
  }

  // 3) Validar fechas
  const ini = new Date(payload.fecha_inicio);
  const fin = new Date(payload.fecha_fin);
  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime()))
    throw Object.assign(new Error('Fechas inválidas'), { status: 400 });
  if (fin <= ini)
    throw Object.assign(new Error('fecha_fin debe ser mayor que fecha_inicio'), { status: 400 });

  // 4) Validar horario (⭐ pasa es_excepcion)
  await validarRangoHorario(ini, fin, payload.es_excepcion);

  // 5) Validar solapamiento
  await validarSinSolapamiento({
    idPersona: visitante.id,
    fechaInicio: ini,
    fechaFin: fin,
  });

  // 6) Validar duración
  const minMin   = await getValor('DURACION_MIN_VISITA_MIN', 15);
  const maxHoras = await getValor('DURACION_MAX_VISITA_HORAS', 12);
  const duracionMin = (fin.getTime() - ini.getTime()) / 60000;

  if (duracionMin < minMin)
    throw Object.assign(
      new Error(`La duración mínima de una visita es ${minMin} minuto(s)`),
      { status: 400 }
    );

  // ⭐ LÓGICA DE EXCEPCIÓN
  if (duracionMin > maxHoras * 60) {
    if (!payload.es_excepcion) {
      throw Object.assign(
        new Error(`La duración máxima permitida es ${maxHoras} hora(s). Si necesitas exceder este límite, marca la casilla de excepción y justifica el motivo.`),
        { status: 400 }
      );
    }

    const rolesPermitidos = ['ADMIN', 'OPERADOR'];
    if (!usuario.roles.some(r => rolesPermitidos.includes(r))) {
      throw Object.assign(new Error('No tienes permiso para crear autorizaciones excepcionales.'), { status: 403 });
    }

    if (!payload.motivo_excepcion || payload.motivo_excepcion.trim() === '') {
      throw Object.assign(new Error('El motivo de la excepción es obligatorio.'), { status: 400 });
    }
  }

  // 7) Estado inicial
  const estadoInicial = await getValor('ESTADO_AUTORIZACION_DEFAULT', 'APROBADA');

  // 8) Insertar (⭐ incluye es_excepcion y motivo_excepcion)
  const codigo = generarCodigo('AUT');
  const { rows } = await query(
    `INSERT INTO autorizacion
       (codigo, id_persona, id_lugar, id_anfitrion, motivo,
        fecha_inicio, fecha_fin, observaciones, estado, creado_por,
        es_excepcion, motivo_excepcion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      codigo,
      visitante.id,
      payload.id_lugar,
      anfitrion.id,
      payload.motivo,
      ini,
      fin,
      payload.observaciones || null,
      estadoInicial,
      userId,
      payload.es_excepcion || false,
      payload.motivo_excepcion || null,
    ]
  );
  return rows[0];
};

// =============================================================================
// ACTUALIZAR
// =============================================================================
export const actualizar = async (id, datos, userId) => {
  const actual = await obtenerPorId(id);

  const usuario = await cargarUsuarioCompleto(userId);
  validarAccesoAAutorizacion(usuario, actual);

  if (esSoloAnfitrion(usuario) && datos.id_anfitrion) {
    validarAnfitrionPermitidoPorId(usuario, datos.id_anfitrion);
  }

  if (!['PENDIENTE', 'APROBADA'].includes(actual.estado)) {
    throw Object.assign(
      new Error(`No se puede editar una autorización en estado ${actual.estado}`),
      { status: 409 }
    );
  }

  const ini = datos.fecha_inicio ? new Date(datos.fecha_inicio) : new Date(actual.fecha_inicio);
  const fin = datos.fecha_fin    ? new Date(datos.fecha_fin)    : new Date(actual.fecha_fin);

  if (Number.isNaN(ini.getTime()) || Number.isNaN(fin.getTime()))
    throw Object.assign(new Error('Fechas inválidas'), { status: 400 });
  if (fin <= ini)
    throw Object.assign(new Error('fecha_fin debe ser mayor que fecha_inicio'), { status: 400 });

  // ⭐ Determinar es_excepcion y motivo finales
  const esExcepcionFinal =
    datos.es_excepcion !== undefined
      ? datos.es_excepcion
      : (actual.es_excepcion || false);
  const motivoExcepcionFinal =
    datos.es_excepcion !== undefined
      ? (datos.es_excepcion ? (datos.motivo_excepcion || null) : null)
      : (actual.motivo_excepcion || null);

  await validarRangoHorario(ini, fin, esExcepcionFinal);

  await validarSinSolapamiento({
    idPersona: actual.id_persona,
    fechaInicio: ini,
    fechaFin: fin,
    excluirId: id,
  });

  const minMin   = await getValor('DURACION_MIN_VISITA_MIN', 15);
  const maxHoras = await getValor('DURACION_MAX_VISITA_HORAS', 12);
  const duracionMin = (fin.getTime() - ini.getTime()) / 60000;

  if (duracionMin < minMin)
    throw Object.assign(
      new Error(`La duración mínima de una visita es ${minMin} minuto(s)`),
      { status: 400 }
    );

  // ⭐ LÓGICA DE EXCEPCIÓN AL ACTUALIZAR
  if (duracionMin > maxHoras * 60) {
    if (!esExcepcionFinal) {
      throw Object.assign(
        new Error(`La duración máxima permitida es ${maxHoras} hora(s). Marca excepción si necesitas autorizarla.`),
        { status: 400 }
      );
    }
    const rolesPermitidos = ['ADMIN', 'OPERADOR'];
    if (!usuario.roles.some(r => rolesPermitidos.includes(r))) {
      throw Object.assign(new Error('No tienes permiso para autorizaciones excepcionales.'), { status: 403 });
    }
    if (!motivoExcepcionFinal || motivoExcepcionFinal.trim() === '') {
      throw Object.assign(new Error('El motivo de la excepción es obligatorio.'), { status: 400 });
    }
  }

  const { rows } = await query(
    `UPDATE autorizacion
        SET id_lugar       = COALESCE($1, id_lugar),
            id_anfitrion   = COALESCE($2, id_anfitrion),
            motivo         = COALESCE($3, motivo),
            fecha_inicio   = $4,
            fecha_fin      = $5,
            observaciones  = COALESCE($6, observaciones),
            es_excepcion   = $7,
            motivo_excepcion = $8,
            modificado_por = $9,
            fecha_modificacion = NOW()
      WHERE id = $10
      RETURNING *`,
    [
      datos.id_lugar ?? null,
      datos.id_anfitrion ?? null,
      datos.motivo ?? null,
      ini,
      fin,
      datos.observaciones ?? null,
      esExcepcionFinal,
      motivoExcepcionFinal,
      userId,
      id,
    ]
  );
  return rows[0];
};

// =============================================================================
// LISTAR
// =============================================================================
export const listar = async ({
  estado,
  desde,
  hasta,
  id_persona,
  id_anfitrion,
  solo_huerfanas = false,
  q,
  page = 1,
  limit = 20,
}) => {
  const offset = (page - 1) * limit;
  const filtros = [`a.estado <> 'ELIMINADO'`];
  const valores = [];

  if (estado)      { valores.push(estado);      filtros.push(`a.estado = $${valores.length}`); }
  if (id_persona)  { valores.push(id_persona);  filtros.push(`a.id_persona = $${valores.length}`); }
  if (id_anfitrion) { valores.push(id_anfitrion); filtros.push(`a.id_anfitrion = $${valores.length}`); }
  if (desde)       { valores.push(desde);       filtros.push(`a.fecha_inicio >= $${valores.length}`); }
  if (hasta)       { valores.push(hasta);       filtros.push(`a.fecha_fin   <= $${valores.length}`); }
  if (solo_huerfanas) {
    filtros.push(`a.estado = 'EN_CURSO'`);
    filtros.push(`a.fecha_ingreso_real IS NOT NULL`);
    filtros.push(`a.fecha_salida_real IS NULL`);
    filtros.push(`a.fecha_ingreso_real::date < CURRENT_DATE`);
  }
  if (q) {
    valores.push(`%${q}%`);
    filtros.push(`(
      a.codigo ILIKE $${valores.length} OR
      p.nombres ILIKE $${valores.length} OR
      p.primer_apellido ILIKE $${valores.length} OR
      p.numero_documento ILIKE $${valores.length} OR
      l.nombre ILIKE $${valores.length}
    )`);
  }

  const where = `WHERE ${filtros.join(' AND ')}`;

  const sqlData = `
    SELECT a.*,
           p.nombres || ' ' || p.primer_apellido ||
             COALESCE(' ' || p.segundo_apellido, '') AS visitante,
           p.numero_documento AS documento_visitante,
           an.nombres || ' ' || an.primer_apellido ||
             COALESCE(' ' || an.segundo_apellido, '') AS anfitrion,
           l.nombre AS lugar
      FROM autorizacion a
      JOIN persona p       ON p.id  = a.id_persona
      JOIN persona an      ON an.id = a.id_anfitrion
      JOIN lugar_visita l  ON l.id  = a.id_lugar
      ${where}
     ORDER BY a.fecha_creacion DESC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`;
  const { rows } = await query(sqlData, [...valores, limit, offset]);

  const { rows: [{ total }] } = await query(
    `SELECT COUNT(*)::int AS total
       FROM autorizacion a
       JOIN persona p      ON p.id = a.id_persona
       JOIN lugar_visita l ON l.id = a.id_lugar
       ${where}`,
    valores
  );

  return { items: rows, total, page, limit };
};

// =============================================================================
// OBTENER
// =============================================================================
export const obtenerPorCodigo = async (codigo) => {
  const { rows } = await query(
    `SELECT a.*,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante,
            p.numero_documento, p.foto_url,
            an.nombres || ' ' || an.primer_apellido ||
              COALESCE(' ' || an.segundo_apellido, '') AS anfitrion,
            l.nombre AS lugar
       FROM autorizacion a
       JOIN persona p      ON p.id  = a.id_persona
       JOIN persona an     ON an.id = a.id_anfitrion
       JOIN lugar_visita l ON l.id  = a.id_lugar
      WHERE a.codigo = $1
      LIMIT 1`,
    [codigo]
  );
  return rows[0] || null;
};

export const obtenerPorId = async (id) => {
  const { rows } = await query(
    `SELECT a.*,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante,
            p.numero_documento,
            an.nombres || ' ' || an.primer_apellido ||
              COALESCE(' ' || an.segundo_apellido, '') AS anfitrion,
            l.nombre AS lugar
       FROM autorizacion a
       JOIN persona p      ON p.id  = a.id_persona
       JOIN persona an     ON an.id = a.id_anfitrion
       JOIN lugar_visita l ON l.id  = a.id_lugar
      WHERE a.id = $1
      LIMIT 1`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Autorización no encontrada'), { status: 404 });
  return rows[0];
};

// =============================================================================
// CAMBIAR ESTADO
// =============================================================================
const TRANSICIONES = {
  PENDIENTE:  ['APROBADA', 'RECHAZADA', 'CANCELADA'],
  APROBADA:   ['RECHAZADA', 'CANCELADA', 'EN_CURSO', 'EXPIRADA'],
  EN_CURSO:   ['FINALIZADA', 'CANCELADA'],
  FINALIZADA: [],
  RECHAZADA:  ['PENDIENTE', 'APROBADA'],
  CANCELADA:  ['PENDIENTE', 'APROBADA'],
  EXPIRADA:   ['APROBADA'],
};

export const cambiarEstado = async (id, nuevoEstado, userId) => {
  const permitidos = Object.keys(TRANSICIONES);
  if (!permitidos.includes(nuevoEstado))
    throw Object.assign(new Error('Estado destino inválido'), { status: 400 });

  const { rows: actualRows } = await query(
    `SELECT id, estado, fecha_ingreso_real, id_anfitrion
       FROM autorizacion WHERE id = $1`,
    [id]
  );
  const actual = actualRows[0];
  if (!actual)
    throw Object.assign(new Error('Autorización no encontrada'), { status: 404 });

  const usuario = await cargarUsuarioCompleto(userId);
  validarAccesoAAutorizacion(usuario, actual);

  const destinos = TRANSICIONES[actual.estado] || [];
  if (!destinos.includes(nuevoEstado))
    throw Object.assign(
      new Error(
        `No se puede cambiar de ${actual.estado} a ${nuevoEstado}. ` +
        `Estados permitidos: ${destinos.length ? destinos.join(', ') : 'ninguno'}`
      ),
      { status: 409 }
    );

  if (nuevoEstado === 'RECHAZADA' && actual.fecha_ingreso_real) {
    throw Object.assign(
      new Error('No se puede rechazar una autorización con ingreso registrado. Regístrese la salida primero.'),
      { status: 409 }
    );
  }

  const { rows } = await query(
    `UPDATE autorizacion
        SET estado = $1, modificado_por = $2, fecha_modificacion = NOW()
      WHERE id = $3
      RETURNING *`,
    [nuevoEstado, userId, id]
  );
  return rows[0];
};

// =============================================================================
// SOLAPAMIENTO
// =============================================================================
export const buscarSolapamientos = async ({
  idPersona,
  fechaInicio,
  fechaFin,
  excluirId = null,
}) => {
  const valores = [fechaInicio, fechaFin];
  const filtros = [
    `a.fecha_inicio < $2 AND a.fecha_fin > $1`,
    `a.estado IN ('PENDIENTE','APROBADA','EN_CURSO')`,
  ];

  if (idPersona) {
    valores.push(idPersona);
    filtros.push(`a.id_persona = $${valores.length}`);
  }
  if (excluirId) {
    valores.push(excluirId);
    filtros.push(`a.id <> $${valores.length}`);
  }

  const { rows } = await query(
    `SELECT a.id, a.codigo, a.fecha_inicio, a.fecha_fin, a.estado,
            a.id_persona, a.id_anfitrion,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante
       FROM autorizacion a
       JOIN persona p ON p.id = a.id_persona
      WHERE ${filtros.join(' AND ')}
      ORDER BY a.fecha_inicio ASC`,
    valores
  );
  return rows;
};

export const validarSinSolapamiento = async ({
  idPersona,
  fechaInicio,
  fechaFin,
  excluirId = null,
}) => {
  if (!idPersona) return;

  const conflictos = await buscarSolapamientos({
    idPersona,
    fechaInicio,
    fechaFin,
    excluirId,
  });

  if (conflictos.length > 0) {
    const c = conflictos[0];
    const fmt = (d) =>
      new Date(d).toLocaleString('es-BO', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    throw Object.assign(
      new Error(
        `El visitante ya tiene una visita programada de ${fmt(c.fecha_inicio)} a ${fmt(c.fecha_fin)} (código ${c.codigo}). No se puede registrar otra dentro de ese horario.`
      ),
      { status: 409 }
    );
  }
};

export const verificarDisponibilidad = async ({
  idPersona,
  fechaInicio,
  fechaFin,
}) => {
  const conflictos = await buscarSolapamientos({
    idPersona,
    fechaInicio,
    fechaFin,
  });
  return {
    disponible: conflictos.length === 0,
    conflictos,
  };
};

// =============================================================================
// VERIFICAR (por código)
// =============================================================================
export const verificar = async (codigo, puntoAcceso, userId) => {
  const aut = await obtenerPorCodigo(codigo);
  if (!aut) throw Object.assign(new Error('Autorización no encontrada'), { status: 404 });

  const minGraciaIn  = await getValor('MINUTOS_GRACIA_INGRESO', 0);
  const minGraciaOut = await getValor('MINUTOS_GRACIA_SALIDA', 0);
  const minPermanencia = await getValor('MINUTOS_MINIMOS_PERMANENCIA', 5);

  const ahora         = new Date();
  const ventanaInicio = new Date(new Date(aut.fecha_inicio).getTime() - minGraciaIn * 60000);
  const ventanaFin    = new Date(new Date(aut.fecha_fin).getTime()    + minGraciaOut * 60000);

  const fmt = (d) =>
    new Date(d).toLocaleString('es-BO', {
      day: 'numeric', month: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

  let resultado = 'DENEGADO';
  let motivo = '';

  if (aut.estado === 'PENDIENTE')       motivo = 'Autorización pendiente de aprobación';
  else if (aut.estado === 'RECHAZADA')  motivo = 'Autorización rechazada';
  else if (aut.estado === 'CANCELADA')  motivo = 'Autorización cancelada';
  else if (aut.estado === 'EXPIRADA')   motivo = 'Autorización expirada';
  else if (aut.estado === 'FINALIZADA') motivo = `Visita ya finalizada (${fmt(aut.fecha_salida_real)})`;
  else if (ahora < ventanaInicio)
    motivo = `Aún no es la hora autorizada (inicia ${fmt(aut.fecha_inicio)})`;
  else if (ahora > ventanaFin)
    motivo = `Autorización fuera de rango horario (finalizó ${fmt(aut.fecha_fin)})`;
  else {
    const tipo = aut.fecha_ingreso_real && !aut.fecha_salida_real ? 'SALIDA' : 'INGRESO';

    if (tipo === 'SALIDA') {
      const ingreso = new Date(aut.fecha_ingreso_real);
      const diffMinutos = (ahora.getTime() - ingreso.getTime()) / 60000;

      if (diffMinutos < minPermanencia) {
        const faltan = Math.ceil(minPermanencia - diffMinutos);
        resultado = 'VISITA_EN_CURSO';
        motivo = `El visitante ingresó a las ${fmt(aut.fecha_ingreso_real)}. Por seguridad, debe permanecer al menos ${minPermanencia} minutos. Faltan ${faltan} min para habilitar la salida.`;
      } else {
        await query(
          `UPDATE autorizacion
              SET fecha_salida_real = NOW(),
                  estado = 'FINALIZADA',
                  modificado_por = $1,
                  fecha_modificacion = NOW()
            WHERE id = $2`,
          [userId, aut.id]
        );

        await query(
          `INSERT INTO bitacora_acceso
             (id_autorizacion, tipo_movimiento, punto_acceso, creado_por)
           VALUES ($1,$2,$3,$4)`,
          [aut.id, tipo, puntoAcceso, userId]
        );

        resultado = 'PERMITIDO';
        motivo = tipo;
      }
    } else {
      await query(
        `UPDATE autorizacion
            SET fecha_ingreso_real = NOW(),
                estado = 'EN_CURSO',
                modificado_por = $1,
                fecha_modificacion = NOW()
          WHERE id = $2`,
        [userId, aut.id]
      );

      await query(
        `INSERT INTO bitacora_acceso
           (id_autorizacion, tipo_movimiento, punto_acceso, creado_por)
         VALUES ($1,$2,$3,$4)`,
        [aut.id, tipo, puntoAcceso, userId]
      );

      resultado = 'PERMITIDO';
      motivo = tipo;
    }
  }

  const actualizada = await obtenerPorId(aut.id);
  return { resultado, motivo, autorizacion: actualizada };
};

// =============================================================================
// VERIFICAR (por documento)
// =============================================================================
export const listarVigentesPorDocumento = async (tipo_documento, numero_documento) => {
  const minGraciaIn  = await getValor('MINUTOS_GRACIA_INGRESO', 0);
  const minGraciaOut = await getValor('MINUTOS_GRACIA_SALIDA', 0);

  const { rows } = await query(
    `SELECT a.id, a.codigo, a.estado,
            a.fecha_inicio, a.fecha_fin,
            a.fecha_ingreso_real, a.fecha_salida_real,
            a.motivo,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante,
            p.numero_documento, p.foto_url,
            an.nombres || ' ' || an.primer_apellido ||
              COALESCE(' ' || an.segundo_apellido, '') AS anfitrion,
            l.nombre AS lugar
       FROM autorizacion a
       JOIN persona p       ON p.id  = a.id_persona
       JOIN persona an      ON an.id = a.id_anfitrion
       JOIN lugar_visita l  ON l.id  = a.id_lugar
      WHERE p.tipo_documento   = $1
        AND p.numero_documento = $2
        AND a.estado IN ('APROBADA', 'EN_CURSO')
        AND NOW() BETWEEN
              (a.fecha_inicio - ($3 || ' minutes')::interval) AND
              (a.fecha_fin    + ($4 || ' minutes')::interval)
      ORDER BY a.fecha_inicio ASC`,
    [tipo_documento, numero_documento, minGraciaIn, minGraciaOut]
  );
  return rows;
};

export const verificarPorDocumento = async (
  tipo_documento,
  numero_documento,
  puntoAcceso,
  userId
) => {
  const vigentes = await listarVigentesPorDocumento(tipo_documento, numero_documento);

  if (vigentes.length === 1) {
    const detalle = await verificar(vigentes[0].codigo, puntoAcceso, userId);
    return { ...detalle, requiere_eleccion: false, autorizaciones: [] };
  }

  if (vigentes.length > 1) {
    return {
      resultado: 'MULTIPLE',
      motivo: `Se encontraron ${vigentes.length} autorizaciones vigentes. Selecciona una.`,
      requiere_eleccion: true,
      autorizaciones: vigentes,
    };
  }

  const { rows: candidatas } = await query(
    `SELECT a.id, a.codigo, a.estado,
            a.fecha_inicio, a.fecha_fin,
            a.fecha_ingreso_real, a.fecha_salida_real,
            a.motivo,
            p.nombres || ' ' || p.primer_apellido ||
              COALESCE(' ' || p.segundo_apellido, '') AS visitante,
            p.numero_documento,
            an.nombres || ' ' || an.primer_apellido ||
              COALESCE(' ' || an.segundo_apellido, '') AS anfitrion,
            l.nombre AS lugar
       FROM autorizacion a
       JOIN persona p       ON p.id  = a.id_persona
       JOIN persona an      ON an.id = a.id_anfitrion
       JOIN lugar_visita l  ON l.id  = a.id_lugar
      WHERE p.tipo_documento   = $1
        AND p.numero_documento = $2
        AND a.estado <> 'ELIMINADO'
      ORDER BY a.fecha_inicio DESC
      LIMIT 5`,
    [tipo_documento, numero_documento]
  );

  if (candidatas.length === 0) {
    return {
      resultado: 'DENEGADO',
      motivo: 'No existe ninguna autorización registrada para este documento',
      requiere_eleccion: false,
      autorizaciones: [],
    };
  }

  const ahora = new Date();
  const c = candidatas[0];

  const fmt = (d) =>
    new Date(d).toLocaleString('es-BO', {
      day: 'numeric', month: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

  let motivo;
  if (c.estado === 'PENDIENTE')       motivo = 'Autorización pendiente de aprobación';
  else if (c.estado === 'RECHAZADA')  motivo = 'Autorización rechazada';
  else if (c.estado === 'CANCELADA')  motivo = 'Autorización cancelada';
  else if (c.estado === 'EXPIRADA')   motivo = 'Autorización expirada';
  else if (c.estado === 'FINALIZADA') motivo = `Visita ya finalizada (${fmt(c.fecha_salida_real)})`;
  else if (ahora < new Date(c.fecha_inicio))
    motivo = `Aún no es la hora autorizada (inicia ${fmt(c.fecha_inicio)})`;
  else if (ahora > new Date(c.fecha_fin))
    motivo = `Autorización fuera de rango horario (finalizó ${fmt(c.fecha_fin)})`;
  else motivo = 'No hay autorizaciones vigentes para este documento';

  return {
    resultado: 'DENEGADO',
    motivo,
    requiere_eleccion: false,
    autorizaciones: [],
    autorizacion: c,
  };
};

// =============================================================================
// BITÁCORA
// =============================================================================
export const listarBitacora = async (idAutorizacion) => {
  const { rows } = await query(
    `SELECT b.id, b.tipo_movimiento, b.punto_acceso, b.observacion,
            b.fecha_creacion,
            b.creado_por AS registrado_por
       FROM bitacora_acceso b
      WHERE b.id_autorizacion = $1
      ORDER BY b.fecha_creacion ASC`,
    [idAutorizacion]
  );
  return rows;
};

// =============================================================================
// EXPIRACIÓN
// =============================================================================
export const expirarVencidasRapido = async () => {
  const margenDias = await getValor('EXPIRACION_DIAS_GRACIA', 1);
  const margen = Number(margenDias) >= 0 ? Number(margenDias) : 1;

  const { rowCount } = await query(
    `UPDATE autorizacion
        SET estado = 'EXPIRADA',
            fecha_modificacion = NOW()
      WHERE estado IN ('PENDIENTE', 'APROBADA')
        AND fecha_ingreso_real IS NULL
        AND fecha_fin < NOW() - ($1 || ' days')::interval`,
    [margen]
  );
  return rowCount;
};

// =============================================================================
// FINALIZAR VISITA (manual, para huérfanas)
// =============================================================================
export const finalizarVisita = async (id, { fecha_salida_real, observacion }, userId) => {
  const aut = await obtenerPorId(id);

  const usuario = await cargarUsuarioCompleto(userId);
  validarAccesoAAutorizacion(usuario, aut);

  if (aut.estado !== 'EN_CURSO') {
    throw Object.assign(
      new Error(`Solo se pueden finalizar visitas EN_CURSO (actual: ${aut.estado})`),
      { status: 409 }
    );
  }

  if (!aut.fecha_ingreso_real) {
    throw Object.assign(
      new Error('La visita no tiene ingreso registrado'),
      { status: 400 }
    );
  }

  const salida = fecha_salida_real ? new Date(fecha_salida_real) : new Date();
  const ingreso = new Date(aut.fecha_ingreso_real);

  if (Number.isNaN(salida.getTime()))
    throw Object.assign(new Error('Fecha de salida inválida'), { status: 400 });
  if (salida < ingreso)
    throw Object.assign(
      new Error('La salida no puede ser anterior al ingreso'),
      { status: 400 }
    );
  if (salida > new Date())
    throw Object.assign(
      new Error('La salida no puede ser en el futuro'),
      { status: 400 }
    );

  await query(
    `UPDATE autorizacion
        SET estado = 'FINALIZADA',
            fecha_salida_real = $1,
            observaciones = COALESCE($2, observaciones),
            modificado_por = $3,
            fecha_modificacion = NOW()
      WHERE id = $4`,
    [salida, observacion || null, userId, id]
  );

  await query(
    `INSERT INTO bitacora_acceso
       (id_autorizacion, tipo_movimiento, punto_acceso, observacion, creado_por)
     VALUES ($1, 'SALIDA', 'REGULARIZACION', $2, $3)`,
    [id, observacion || 'Salida registrada manualmente', userId]
  );

  return obtenerPorId(id);
};