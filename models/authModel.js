// MODEL DE USUARIOS: registro y login con Supabase Auth
const { createClient } = require('@supabase/supabase-js');
const supabase = require('../config/supabaseClient');
const { crearError } = require('../utils/errores');
// Auth modifica la sesión interna de su cliente; debe estar aislado del cliente
// de servicio compartido para que una sesión de un usuario no afecte otros requests.
const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Registro: Auth crea el usuario y nosotros guardamos su perfil
async function registrar(email, password, nombre) {
  const { data, error } = await authClient.auth.signUp({ email, password, options: { data: { nombre } } });
  if (error) throw error;
  if (!data.user) throw new Error('Supabase no devolvió el usuario creado');
  const { error: perfilError } = await supabase.from('perfiles').upsert({ id: data.user.id, nombre, rol: 'cliente' });
  if (perfilError) {
    // Evita dejar una cuenta sin perfil si la inserción del perfil falla.
    await supabase.auth.admin.deleteUser(data.user.id);
    throw perfilError;
  }
  return { id: data.user.id, email: data.user.email, requiereConfirmacion: !data.session };
}

// Login: devuelve el token, o null si los datos no coinciden
async function iniciarSesion(email, password) {
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase usa 400 para email_not_confirmed también; no confundirlo con
    // credenciales incorrectas, porque la persona debe confirmar su correo.
    if (error.code === 'email_not_confirmed') {
      throw crearError('Tu cuenta existe, pero falta confirmar el correo. Revisa tu bandeja de entrada y correo no deseado.', 403);
    }
    if (error.code === 'invalid_credentials' || error.status === 401) return null;
    throw error;
  }
  const { data: perfil } = await supabase.from('perfiles').select('nombre, rol').eq('id', data.user.id).maybeSingle();
  return { token: data.session.access_token, usuario: { id: data.user.id, email: data.user.email, nombre: perfil?.nombre || '', rol: perfil?.rol || 'cliente' } };
}

module.exports = { registrar, iniciarSesion };
