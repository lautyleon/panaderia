// CONEXION A SUPABASE
// Se crea el cliente UNA vez y se comparte con todo el proyecto.
// Usa la clave SECRETA: solo vive en el servidor, nunca en el front.
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  throw new Error('Configura SUPABASE_URL y SUPABASE_KEY en el archivo .env');
}
if (process.env.SUPABASE_KEY.startsWith('sb_publishable_')) {
  throw new Error('SUPABASE_KEY es publica. Usa una clave secreta de servidor (sb_secret_ o service_role) en .env');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

module.exports = supabase;
