// MODEL DE PRODUCTOS: el catalogo
const supabase = require('../config/supabaseClient');
const { crearError } = require('../utils/errores');

// En esta capa viven las consultas a Supabase para categorías y productos.
// Las categorias para el filtro del front (ya resuelto)
// Trae solo los campos que necesita el selector de categorías.
async function obtenerCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('id, nombre')
    .order('nombre');
  if (error) throw error;
  return data;
}

// Los productos activos, con el nombre de su categoria.
// Si llega categoriaId, filtra por esa categoria.
async function obtenerProductos({ categoriaId, buscar } = {}) {
  // La tienda pública ve activos; categoría y texto son filtros opcionales.
  let consulta = supabase.from('productos')
    .select('id, nombre, descripcion, precio, stock, imagen_url, categoria_id, activo, categorias(id, nombre)')
    .eq('activo', true).order('nombre');
  if (categoriaId) consulta = consulta.eq('categoria_id', categoriaId);
  if (buscar) consulta = consulta.ilike('nombre', `%${buscar.replace(/[,%()]/g, '')}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

async function obtenerProductoPorId(id, incluirInactivos = false) {
  // maybeSingle permite detectar el caso sin filas y responder 404 desde el model.
  let consulta = supabase.from('productos').select('*, categorias(id, nombre)').eq('id', id);
  if (!incluirInactivos) consulta = consulta.eq('activo', true);
  const { data, error } = await consulta.maybeSingle();
  if (error) throw error;
  if (!data) throw crearError('Producto no encontrado', 404);
  return data;
}

async function obtenerProductosAdmin() {
  const { data, error } = await supabase.from('productos').select('*, categorias(id, nombre)').order('nombre');
  if (error) throw error;
  return data;
}

async function crearProducto(producto) {
  const { data, error } = await supabase.from('productos').insert(producto).select('*, categorias(id, nombre)').single();
  if (error) throw error;
  return data;
}

async function actualizarProducto(id, cambios) {
  const { data, error } = await supabase.from('productos').update(cambios).eq('id', id).select('*, categorias(id, nombre)').maybeSingle();
  if (error) throw error;
  if (!data) throw crearError('Producto no encontrado', 404);
  return data;
}

async function eliminarProducto(id) {
  // El filtro por id evita que el DELETE afecte más de un producto.
  const { data, error } = await supabase.from('productos').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw crearError('Producto no encontrado', 404);
  return data;
}

module.exports = { obtenerCategorias, obtenerProductos, obtenerProductoPorId, obtenerProductosAdmin, crearProducto, actualizarProducto, eliminarProducto };
