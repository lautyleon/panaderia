// Autorización: verificarUsuario ya confirmó quién es la persona;
// aquí comprobamos si tiene permiso administrativo.
function verificarAdmin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ error: 'Se requiere iniciar sesion' });
  if (req.usuario.rol !== 'admin') return res.status(403).json({ error: 'Se requiere rol administrador' });
  return next();
}

module.exports = verificarAdmin;
