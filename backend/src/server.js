// server.js
import app from './app.js';
import { ENV } from './config/env.js';
import { iniciarJobExpiracion, detenerJobExpiracion } from './jobs/expiracion.job.js';
import { iniciarJobLimpieza, detenerJobLimpieza } from './jobs/limpieza.job.js';

app.listen(ENV.PORT, async () => {
  console.log(`🚀 API en http://localhost:${ENV.PORT}`);

  // Arranca jobs programados
  await iniciarJobExpiracion();
  await iniciarJobLimpieza();

  console.log('✅ Sistema listo');
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Cerrando jobs y servidor…');
  detenerJobExpiracion();
  detenerJobLimpieza();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);