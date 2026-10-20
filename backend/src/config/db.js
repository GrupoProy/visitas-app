import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: ENV.DB.host,
  port: ENV.DB.port,
  user: ENV.DB.user,
  password: ENV.DB.password,
  database: ENV.DB.database,
  options: `-c search_path=${ENV.DB.schema || 'visitasdb'},public`,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('❌ PG pool error:', err));

export const query = (text, params) => pool.query(text, params);