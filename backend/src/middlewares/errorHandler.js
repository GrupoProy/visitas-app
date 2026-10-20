// middlewares/errorHandler.js

// ---------------------------------------------------------------------------
// 404 — se monta al final, después de todas las rutas
// ---------------------------------------------------------------------------
export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
};

// ---------------------------------------------------------------------------
// Error handler global
// ---------------------------------------------------------------------------
export const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;

  const payload = {
    success: false,
    code: err.code || (status >= 500 ? 'INTERNAL' : 'ERROR'),
    message: err.message || 'Error interno del servidor',
  };

  // Extras útiles para el frontend
  if (err.detalles) payload.detalles = err.detalles;
  if (err.errors) payload.errors = err.errors;
  if (err.minutosRestantes != null) payload.minutosRestantes = err.minutosRestantes;

  // Log de errores 5xx
  if (status >= 500) {
    console.error('[errorHandler]', err);
  }

  res.status(status).json(payload);
};