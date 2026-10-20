// config/env.js
import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  // ---------------------------------------------------------------------------
  // Servidor
  // ---------------------------------------------------------------------------
  PORT: Number(process.env.PORT) || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ---------------------------------------------------------------------------
  // Base de datos
  // ---------------------------------------------------------------------------
  DB: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
	 schema:   process.env.DB_SCHEMA || 'visitasdb', 
  },

  // ---------------------------------------------------------------------------
  // JWT — access token
  // ---------------------------------------------------------------------------
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES: process.env.JWT_EXPIRES || '15m',

  // ---------------------------------------------------------------------------
  // JWT — refresh token
  // ---------------------------------------------------------------------------
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`,
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  JWT_REFRESH_RECORDAR_EXPIRES:
    process.env.JWT_REFRESH_RECORDAR_EXPIRES || '30d',

  // ---------------------------------------------------------------------------
  // Rate limiting por IP (login)
  // ---------------------------------------------------------------------------
  LOGIN_IP_MAX_INTENTOS: Number(process.env.LOGIN_IP_MAX_INTENTOS) || 20,
  LOGIN_IP_VENTANA_MINUTOS: Number(process.env.LOGIN_IP_VENTANA_MINUTOS) || 15,
};