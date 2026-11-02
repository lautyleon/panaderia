// CONTROLLER DE PEDIDOS
const model = require('../models/pedidosModel');

// Validación y códigos HTTP para las operaciones de compra e historial.
// POST /pedidos  (protegida: el usuario sale del token, nunca del body)
async function crearPedido(req, res) {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'El carrito debe incluir entre 1 y 50 productos' });
  }
  if (items.some(item => !item || !Number.isInteger(Number(item.producto_id)) || Number(item.producto_id) < 1 || !Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1 || Number(item.cantidad) > 999)) {
    return res.status(400).json({ error: 'Cada producto debe tener un ID y una cantidad validos' });
  }
  try {
    const pedido = await model.crearPedido(req.usuario.id, items);
    res.status(201).json(pedido);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
}

async function misPedidos(req, res) {
  try { return res.status(200).json(await model.listarPedidos(req.usuario.id)); }
  catch { return res.status(500).json({ error: 'Error al obtener los pedidos' }); }
}
async function verPedido(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID de pedido invalido' });
  try { return res.status(200).json(await model.obtenerPedido(id, req.usuario.rol === 'admin' ? null : req.usuario.id)); }
  catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Error al obtener el pedido' }); }
}
async function pedidosAdmin(req, res) {
  try { return res.status(200).json(await model.listarPedidos()); }
  catch { return res.status(500).json({ error: 'Error al obtener los pedidos' }); }
}
async function cambiarEstado(req, res) {
  const id = Number(req.params.id), estado = req.body?.estado;
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID de pedido invalido' });
  if (!['confirmado', 'cancelado'].includes(estado)) return res.status(400).json({ error: 'Estado invalido' });
  try { return res.status(200).json(await model.actualizarEstado(id, estado)); }
  catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Error al cambiar el estado' }); }
}

module.exports = { crearPedido, misPedidos, verPedido, pedidosAdmin, cambiarEstado };
