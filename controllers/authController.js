// CONTROLLER DE USUARIOS
const model = require('../models/authModel');

// El controller valida lo recibido y convierte el resultado del model en HTTP.
async function registro(req, res) {
  const { email, password, nombre } = req.body;
  if (typeof email !== 'string' || !email.includes('@') || typeof nombre !== 'string' || !nombre.trim() || typeof password !== 'string' || password.length < 6 || password.length > 72) {
    return res.status(400).send('Faltan datos o la contraseña es muy corta');
  }
  try {
    const usuario = await model.registrar(email, password, nombre);
    res.status(201).json(usuario);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    res.status(400).json({ error: 'No se pudo registrar: ' + error.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).send('Faltan datos');
  try {
    const sesion = await model.iniciarSesion(email, password);
    if (!sesion) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    res.status(200).json(sesion);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    res.status(500).json({ error: 'Error al iniciar sesion' });
  }
}

module.exports = { registro, login };
