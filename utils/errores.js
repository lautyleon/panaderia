// Crea errores que llevan un status HTTP para que el controller elija la respuesta.
function crearError(mensaje, status = 500) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

module.exports = { crearError };
