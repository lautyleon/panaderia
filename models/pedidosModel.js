const supabase = require('../config/supabaseClient');
const { crearError } = require('../utils/errores');

// El model coordina la API de datos; las operaciones críticas se resuelven en SQL.
async function crearPedido(usuarioId, items) {
  // RPC ejecuta la función PostgreSQL en una sola transacción.
  const { data, error } = await supabase.rpc('crear_pedido', { p_usuario_id: usuarioId, p_items: items });
  if (error) {
    const mensajes = { CARRITO_INVALIDO: 'El carrito contiene productos o cantidades invalidas', PRODUCTO_NO_DISPONIBLE: 'Uno de los productos no esta disponible', STOCK_INSUFICIENTE: 'No hay stock suficiente para uno de los productos' };
    const clave = Object.keys(mensajes).find(k => error.message?.includes(k));
    throw crearError(clave ? mensajes[clave] : 'No se pudo procesar la compra', clave ? 400 : 500);
  }
  return data;
}
async function listarPedidos(usuarioId = null) {
  // Cuando llega usuarioId, limita el historial al dueño del pedido.
  let consulta = supabase.from('pedidos').select('id, usuario_id, total, estado, creado, pedido_items(id, producto_id, cantidad, precio_unitario, subtotal, productos(nombre, imagen_url))').order('creado', { ascending: false });
  if (usuarioId) consulta = consulta.eq('usuario_id', usuarioId);
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}
async function obtenerPedido(id, usuarioId = null) {
  // Para un cliente se filtra por pedido y por dueño; para admin solo por pedido.
  let consulta = supabase.from('pedidos').select('id, usuario_id, total, estado, creado, pedido_items(id, producto_id, cantidad, precio_unitario, subtotal, productos(nombre, imagen_url))').eq('id', id);
  if (usuarioId) consulta = consulta.eq('usuario_id', usuarioId);
  const { data, error } = await consulta.maybeSingle();
  if (error) throw error;
  if (!data) throw crearError('Pedido no encontrado', 404);
  return data;
}
async function actualizarEstado(id, estado) {
  const { data, error } = await supabase.rpc('cambiar_estado_pedido', { p_pedido_id: id, p_estado: estado });
  if (error) {
    if (error.message?.includes('PEDIDO_NO_ENCONTRADO')) throw crearError('Pedido no encontrado', 404);
    if (error.message?.includes('TRANSICION_INVALIDA')) throw crearError('Transicion de estado no permitida', 400);
    throw error;
  }
  return data;
}
module.exports = { crearPedido, listarPedidos, obtenerPedido, actualizarEstado };
