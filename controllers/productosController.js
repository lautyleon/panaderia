// CONTROLLER DE PRODUCTOS
const model = require('../models/productosModel');

// Endpoints públicos del catálogo y endpoints administrativos de productos.
async function verCategorias(req, res) {
  try {
    const categorias = await model.obtenerCategorias();
    res.status(200).json(categorias);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las categorias' });
  }
}

// GET /productos  o  GET /productos?categoria=2
async function verProductos(req, res) {
  const categoriaId = req.query.categoria ? Number(req.query.categoria) : null;
  if (req.query.categoria && (!Number.isInteger(categoriaId) || categoriaId < 1)) return res.status(400).json({ error: 'Categoria invalida' });
  const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim() : '';
  if (buscar.length > 80) return res.status(400).json({ error: 'La busqueda es demasiado larga' });
  try {
    const productos = await model.obtenerProductos({ categoriaId, buscar });
    res.status(200).json(productos);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    res.status(500).json({ error: 'Error al obtener los productos' });
  }
}

async function verProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID de producto invalido' });
  try { return res.status(200).json(await model.obtenerProductoPorId(id)); }
  catch (error) { return res.status(error.status || 500).json({ error: error.status ? error.message : 'Error al obtener el producto' }); }
}
async function verProductosAdmin(req, res) {
  try { return res.status(200).json(await model.obtenerProductosAdmin()); }
  catch { return res.status(500).json({ error: 'Error al obtener los productos' }); }
}

function validarProducto(body, parcial = false) {
  // En PATCH se validan solo los campos enviados; en POST se requieren los obligatorios.
  const salida = {};
  if (!parcial || body.nombre !== undefined) {
    if (typeof body.nombre !== 'string' || !body.nombre.trim() || body.nombre.trim().length > 120) return 'Nombre invalido';
    salida.nombre = body.nombre.trim();
  }
  if (!parcial || body.descripcion !== undefined) {
    if (body.descripcion != null && (typeof body.descripcion !== 'string' || body.descripcion.length > 1000)) return 'Descripcion invalida';
    salida.descripcion = body.descripcion?.trim() || null;
  }
  if (!parcial || body.precio !== undefined) {
    if (!Number.isFinite(Number(body.precio)) || Number(body.precio) < 0 || Number(body.precio) > 99999999) return 'Precio invalido';
    salida.precio = Number(body.precio);
  }
  if (!parcial || body.stock !== undefined) {
    if (!Number.isInteger(Number(body.stock)) || Number(body.stock) < 0) return 'Stock invalido';
    salida.stock = Number(body.stock);
  }
  if (!parcial || body.categoria_id !== undefined) {
    if (!Number.isInteger(Number(body.categoria_id)) || Number(body.categoria_id) < 1) return 'Categoria invalida';
    salida.categoria_id = Number(body.categoria_id);
  }
  if (body.imagen_url !== undefined) {
    if (body.imagen_url !== null && (typeof body.imagen_url !== 'string' || body.imagen_url.length > 2048 || !/^https:\/\//i.test(body.imagen_url))) return 'URL de imagen invalida';
    salida.imagen_url = body.imagen_url || null;
  }
  if (body.activo !== undefined) {
    if (typeof body.activo !== 'boolean') return 'El campo activo debe ser booleano';
    salida.activo = body.activo;
  }
  return salida;
}
async function crearProducto(req, res) {
  const producto = validarProducto(req.body || {});
  if (typeof producto === 'string') return res.status(400).json({ error: producto });
  try { return res.status(201).json(await model.crearProducto(producto)); }
  catch (error) { return res.status(400).json({ error: error.message }); }
}
async function actualizarProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID invalido' });
  const cambios = validarProducto(req.body || {}, true);
  if (typeof cambios === 'string' || !Object.keys(cambios).length) return res.status(400).json({ error: typeof cambios === 'string' ? cambios : 'No hay cambios para guardar' });
  try { return res.status(200).json(await model.actualizarProducto(id, cambios)); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
}
async function eliminarProducto(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID invalido' });
  try { await model.eliminarProducto(id); return res.status(204).end(); }
  catch (error) { return res.status(error.status || 400).json({ error: error.message }); }
}

module.exports = { verCategorias, verProductos, verProducto, verProductosAdmin, crearProducto, actualizarProducto, eliminarProducto };
