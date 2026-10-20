import bcrypt from 'bcryptjs';
import { query, pool } from '../config/db.js';

const run = async () => {
  const username = 'admin';
  const email    = 'admin@empresa.com';
  const password = 'Admin123!';

  const exists = await query(`SELECT id FROM usuario WHERE username = $1`, [username]);
  if (exists.rows[0]) {
    console.log('ℹ️ El usuario admin ya existe');
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  const { rows } = await query(
    `INSERT INTO usuario
       (username, email, password_hash, nombres, primer_apellido, segundo_apellido, creado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [username, email, hash, 'Admin', 'Sistema', null, 1]
  );
  const userId = rows[0].id;

  const rolAdmin = await query(`SELECT id FROM rol WHERE nombre = 'ADMIN'`);
  await query(
    `INSERT INTO rol_usuario (id_rol, id_usuario, creado_por) VALUES ($1,$2,$3)`,
    [rolAdmin.rows[0].id, userId, userId]
  );

  console.log('✅ Usuario admin creado:');
  console.log('   username:', username);
  console.log('   password:', password);
  await pool.end();
};

run().catch((e) => { console.error(e); process.exit(1); });