import { query } from '../../config/db.js';

// ---------------------------------------------------------------------------
// Cache en memoria: { clave: { valor, tipo_dato, expira } }
// Se invalida automáticamente cada 5 minutos o tras un update.
// ---------------------------------------------------------------------------
const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = new Map();
let cacheTs = 0;

const cargarCache = async () => {
  const { rows } = await query(
    `SELECT clave, valor, tipo_dato
       FROM parametro_sistema
      WHERE estado = 'ACTIVO'`
  );
  cache = new Map(rows.map((r) => [r.clave, { valor: r.valor, tipo_dato: r.tipo_dato }]));
  cacheTs = Date.now();
};

const invalidarCache = () => { cacheTs = 0; };

// ---------------------------------------------------------------------------
// Cast del valor según el tipo_dato
// ---------------------------------------------------------------------------
const castear = (valor, tipo) => {
  if (valor === null || valor === undefined) return valor;
  switch (tipo) {
    case 'INT':     return parseInt(valor, 10);
    case 'BOOLEAN': return String(valor).toLowerCase() === 'true' || valor === '1';
    case 'JSON':    try { return JSON.parse(valor); } catch { return null; }
    case 'DATE':    return new Date(valor);
    default:        return valor;
  }
};

// ---------------------------------------------------------------------------
// API pública del servicio
// ---------------------------------------------------------------------------

/** Obtiene un valor por clave, ya casteado. Usa cache. */
export const getValor = async (clave, defaultValue = null) => {
  if (Date.now() - cacheTs > CACHE_TTL_MS) await cargarCache();
  const entry = cache.get(clave);
  if (!entry) return defaultValue;
  return castear(entry.valor, entry.tipo_dato);
};

/** Obtiene varios valores de una vez. */
export const getValores = async (claves = []) => {
  if (Date.now() - cacheTs > CACHE_TTL_MS) await cargarCache();
  const out = {};
  for (const k of claves) {
    const entry = cache.get(k);
    out[k] = entry ? castear(entry.valor, entry.tipo_dato) : null;
  }
  return out;
};

/** Lista todos los parámetros con filtros opcionales (para el admin). */
export const listar = async ({ grupo, q, soloPublicos = false } = {}) => {
  const filtros = [`estado <> 'ELIMINADO'`];
  const valores = [];

  if (grupo) { valores.push(grupo); filtros.push(`grupo = $${valores.length}`); }
  if (soloPublicos) filtros.push(`es_publico = TRUE`);
  if (q) {
    valores.push(`%${q}%`);
    filtros.push(`(clave ILIKE $${valores.length} OR descripcion ILIKE $${valores.length})`);
  }

  const { rows } = await query(
    `SELECT id, clave, valor, tipo_dato, grupo, descripcion,
            es_editable, es_publico, estado,
            fecha_creacion, fecha_modificacion
       FROM parametro_sistema
      WHERE ${filtros.join(' AND ')}
      ORDER BY grupo ASC, clave ASC`,
    valores
  );
  return rows;
};

/** Lista solo los públicos (para el frontend). */
export const listarPublicos = async () => {
  const { rows } = await query(
    `SELECT clave, valor, tipo_dato
       FROM parametro_sistema
      WHERE estado = 'ACTIVO' AND es_publico = TRUE
      ORDER BY clave ASC`
  );
  const out = {};
  for (const r of rows) out[r.clave] = castear(r.valor, r.tipo_dato);
  return out;
};

/** Crea un parámetro nuevo. */
export const crear = async (datos, userId) => {
  const { rows } = await query(
    `INSERT INTO parametro_sistema
       (clave, valor, tipo_dato, grupo, descripcion, es_editable, es_publico, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      datos.clave,
      String(datos.valor),
      datos.tipo_dato || 'STRING',
      datos.grupo || 'GENERAL',
      datos.descripcion || null,
      datos.es_editable ?? true,
      datos.es_publico ?? false,
      userId,
    ]
  );
  invalidarCache();
  return rows[0];
};

/** Actualiza el valor (y opcionalmente metadatos). */
export const actualizar = async (id, datos, userId) => {
  const actual = await query(
    `SELECT id, es_editable FROM parametro_sistema WHERE id = $1 AND estado <> 'ELIMINADO'`,
    [id]
  );
  if (!actual.rows[0])
    throw Object.assign(new Error('Parámetro no encontrado'), { status: 404 });
  if (!actual.rows[0].es_editable)
    throw Object.assign(new Error('Este parámetro no es editable'), { status: 403 });

  const { rows } = await query(
    `UPDATE parametro_sistema
        SET valor = COALESCE($1, valor),
            tipo_dato = COALESCE($2, tipo_dato),
            grupo = COALESCE($3, grupo),
            descripcion = COALESCE($4, descripcion),
            es_publico = COALESCE($5, es_publico),
            modificado_por = $6,
            fecha_modificacion = NOW()
      WHERE id = $7
      RETURNING *`,
    [
      datos.valor !== undefined ? String(datos.valor) : null,
      datos.tipo_dato ?? null,
      datos.grupo ?? null,
      datos.descripcion ?? null,
      datos.es_publico ?? null,
      userId,
      id,
    ]
  );
  invalidarCache();
  return rows[0];
};

/** Cambia el estado del parámetro. */
export const cambiarEstado = async (id, estado, userId) => {
  if (!['ACTIVO', 'INACTIVO', 'ELIMINADO'].includes(estado))
    throw Object.assign(new Error('Estado inválido'), { status: 400 });

  const { rows } = await query(
    `UPDATE parametro_sistema
        SET estado = $1, modificado_por = $2, fecha_modificacion = NOW()
      WHERE id = $3
      RETURNING *`,
    [estado, userId, id]
  );
  if (!rows[0]) throw Object.assign(new Error('Parámetro no encontrado'), { status: 404 });
  invalidarCache();
  return rows[0];
};

/** Lista los grupos disponibles (para filtros). */
export const listarGrupos = async () => {
  const { rows } = await query(
    `SELECT DISTINCT grupo FROM parametro_sistema
      WHERE estado <> 'ELIMINADO'
      ORDER BY grupo ASC`
  );
  return rows.map((r) => r.grupo);
};

/**
 * Igual que getValor pero garantiza boolean.
 * Útil para parámetros BOOLEAN.
 */
export const getBool = async (clave, defaultValue = false) => {
  const v = await getValor(clave, defaultValue);
  if (typeof v === 'boolean') return v;
  if (v === null || v === undefined) return defaultValue;
  return String(v).toLowerCase() === 'true' || v === '1' || v === 1;
};

/**
 * Devuelve todos los catálogos de estados configurados en parametro_sistema.
 * Se usa para que el frontend no tenga hardcodeados los estados ni sus acciones.
 */
export const obtenerEstados = async () => {
  const { rows } = await query(
    `SELECT clave, valor
       FROM parametro_sistema
      WHERE clave LIKE 'ESTADOS_%'
        AND estado = 'ACTIVO'
        AND es_publico = TRUE`
  );

  const out = {};
  for (const r of rows) {
    const key = r.clave.replace(/^ESTADOS_/, '').toLowerCase();
    out[key] = String(r.valor || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return out;
};