const model = require('../models/categoriasModel');

// Valida los datos de categorías y delega las consultas al model.
async function crear(req, res) {
  const nombre = req.body?.nombre;
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80) return res.status(400).json({ error: 'Nombre de categoria invalido' });
  try { return res.status(201).json(await model.crear(nombre.trim())); }
  catch (error) { return res.status(400).json({ error: error.message }); }
}
async function actualizar(req, res) {
  const id = Number(req.params.id), nombre = req.body?.nombre;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID invalido' });
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80) return res.status(400).json({ error: 'Nombre de categoria invalido' });
  try { return res.status(200).json(await model.actualizar(id, nombre.trim())); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
}
async function eliminar(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID invalido' });
  try { await model.eliminar(id); return res.status(204).end(); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
}
module.exports = { crear, actualizar, eliminar };
