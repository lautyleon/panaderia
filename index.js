// SERVIDOR
// Enciende Express, pone los middlewares y monta las rutas.
// Funciona igual en tu compu (npm start) y en Vercel.
const express = require('express');
const path = require('path');
const rutas = require('./routes/tiendaRoutes');

const app = express();

// Primero se interpreta JSON y se sirve el frontend; luego se monta la API.
app.use(express.json());                               // body en JSON
app.use(express.static(path.join(__dirname, 'public'))); // el front (en Vercel lo sirve Vercel)

app.use('/', rutas);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = error.status || (error.type === 'entity.parse.failed' ? 400 : 500);
  return res.status(status).json({ error: status === 400 ? 'Solicitud JSON invalida' : 'Error interno del servidor' });
});

// En tu compu levantamos el servidor. En Vercel no hace falta:
// Vercel toma la app exportada y la ejecuta por su cuenta.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log('Tienda en http://localhost:' + PORT));
}

module.exports = app;
