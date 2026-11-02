const supabase = require('../config/supabaseClient');
const { crearError } = require('../utils/errores');

// Consultas CRUD de categorías. Cada UPDATE/DELETE apunta a un id específico.
async function listar() {
  const { data, error } = await supabase.from('categorias').select('id, nombre').order('nombre');
  if (error) throw error;
  return data;
}
async function crear(nombre) {
  const { data, error } = await supabase.from('categorias').insert({ nombre }).select('id, nombre').single();
  if (error) throw error;
  return data;
}
async function actualizar(id, nombre) {
  // El .eq limita la modificación a la categoría identificada por id.
  const { data, error } = await supabase.from('categorias').update({ nombre }).eq('id', id).select('id, nombre').maybeSingle();
  if (error) throw error;
  if (!data) throw crearError('Categoria no encontrada', 404);
  return data;
}
async function eliminar(id) {
  // El .eq evita eliminar accidentalmente toda la tabla.
  const { data, error } = await supabase.from('categorias').delete().eq('id', id).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw crearError('Categoria no encontrada', 404);
  return data;
}
module.exports = { listar, crear, actualizar, eliminar };
