import pg from 'pg';
import { ENV } from '../config/env.js';

const { Pool } = pg;
const MAX = 30;
let intento = 0;

const esperar = async () => {
  while (intento < MAX) {
    try {
      const pool = new Pool({
        host: ENV.DB.host,
        port: ENV.DB.port,
        user: ENV.DB.user,
        password: ENV.DB.password,
        database: ENV.DB.database,
        connectionTimeoutMillis: 2000,
      });
      await pool.query('SELECT 1');
      await pool.end();
      console.log('✅ PostgreSQL listo');
      process.exit(0);
    } catch {
      intento++;
      console.log(`⏳ Esperando PostgreSQL… (${intento}/${MAX})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  console.error('❌ No se pudo conectar a PostgreSQL');
  process.exit(1);
};

esperar();