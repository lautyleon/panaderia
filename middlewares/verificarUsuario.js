// MIDDLEWARE: ¿quien compra?
// Va entre la ruta y el controller. Si no hay token valido, corta con 401.
// Si todo esta bien, deja el usuario en req.usuario y sigue.
const supabase = require('../config/supabaseClient');

// Autenticación: valida el token con Auth y agrega el usuario confiable a req.
// Las rutas protegidas usan este middleware antes de llegar al controller.
async function verificarUsuario(req, res, next) {
  const autorizacion = req.get('Authorization') || '';
  const coincidencia = autorizacion.match(/^Bearer\s+(.+)$/i);
  if (!coincidencia) return res.status(401).json({ error: 'Se requiere un token Bearer valido' });
  try {
    const { data: { user }, error } = await supabase.auth.getUser(coincidencia[1]);
    if (error || !user) return res.status(401).json({ error: 'Token invalido o vencido' });
    const { data: perfil, error: perfilError } = await supabase.from('perfiles').select('nombre, rol').eq('id', user.id).maybeSingle();
    if (perfilError) throw perfilError;
    // El rol se lee del perfil de la base; nunca se acepta desde el body del cliente.
    req.usuario = { id: user.id, email: user.email, nombre: perfil?.nombre || '', rol: perfil?.rol || 'cliente' };
    return next();
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo verificar la sesion' });
  }
}

module.exports = verificarUsuario;
