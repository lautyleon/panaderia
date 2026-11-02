# Guía para exponer — Panadería La Espiga

Esta guía acompaña los comentarios del código. La idea es explicar el recorrido y las decisiones importantes, no memorizar cada línea.

## Presentación breve

> “Panadería La Espiga es una tienda online hecha con Express, JavaScript y Supabase. Mantiene una arquitectura por capas: las rutas reciben la petición, los middlewares autentican y autorizan, los controllers validan y responden, y los models consultan Supabase. En una compra, el servidor vuelve a consultar precios y stock y la base de datos registra el pedido y descuenta las unidades de forma transaccional.”

## Mapa de carpetas y archivos

### `routes/` — endpoints de la API

`routes/tiendaRoutes.js` es el mapa de la API. Cada línea `router.get`, `router.post`, `router.patch` o `router.delete` declara método y dirección, y conecta middleware y controller. No contiene consultas a Supabase.

### `middlewares/` — controles previos

- `verificarUsuario.js`: lee `Authorization: Bearer TOKEN`, valida el token con Supabase Auth y obtiene el perfil. Si es válido, guarda `{ id, email, nombre, rol }` en `req.usuario`; si falta o no sirve, corta con 401.
- `verificarAdmin.js`: comprueba `req.usuario.rol`. Devuelve 401 si no hay sesión y 403 si el usuario autenticado no es admin.

Frase clave: **autenticación es comprobar quién sos; autorización es comprobar qué permiso tenés**.

### `controllers/` — validan y forman respuestas HTTP

- `authController.js`: valida el registro y el login; responde con 201 al crear cuenta, 200 al iniciar sesión y errores con códigos adecuados.
- `productosController.js`: procesa filtros, valida productos y maneja el catálogo público y CRUD administrativo.
- `categoriasController.js`: valida los nombres e IDs de categoría antes de delegar al model.
- `pedidosController.js`: valida el carrito, usa el usuario puesto por el middleware y atiende historial y gestión administrativa.

Los controllers no hacen las consultas directamente: llaman a funciones de `models/`.

### `models/` — acceso a Supabase

- `productosModel.js`: lista y filtra productos, obtiene uno, crea, actualiza y elimina productos; también obtiene categorías.
- `categoriasModel.js`: operaciones CRUD de categorías.
- `authModel.js`: registra e inicia sesión con Supabase Auth, y trabaja con el perfil. Usa un cliente de Auth separado para que la sesión de un login no afecte al cliente de servicio compartido.
- `pedidosModel.js`: lee pedidos y llama las funciones SQL `crear_pedido` y `cambiar_estado_pedido` mediante RPC.

En un `UPDATE` o `DELETE` se filtra por el ID con `.eq('id', id)`, para afectar un registro específico.

### Otras partes

- `config/supabaseClient.js`: crea el cliente de Supabase con `SUPABASE_URL` y la clave secreta del servidor desde `.env`. La clave no va en el frontend.
- `db/esquema.sql`: define tablas, relaciones, restricciones, datos de ejemplo, RLS, el trigger de perfiles y las funciones SQL de pedidos.
- `public/index.html`: estructura del sitio y formularios; `public/estilos.css`: presentación; `public/app.js`: estado del carrito y llamadas `fetch` a la API.
- `utils/errores.js`: crea errores con un `status` HTTP para que el controller decida cómo responder.
- `index.js`: configura Express, sirve `public/`, monta las rutas, da 404 al final, inicia el servidor local y exporta `app` para Vercel.

## Dónde buscar GET, POST, PATCH y DELETE

Abrí `routes/tiendaRoutes.js` y buscá `router.get`, `router.post`, `router.patch` y `router.delete`.

- **GET** consulta: `/categorias`, `/productos`, `/productos/:id`, `/pedidos`, `/pedidos/:id`.
- **POST** registra o crea: `/registro`, `/login`, `/pedidos`, `/admin/productos`, `/admin/categorias`.
- **PATCH** modifica campos: `/admin/productos/:id`, `/admin/categorias/:id`, `/admin/pedidos/:id/estado`.
- **DELETE** elimina: `/admin/productos/:id`, `/admin/categorias/:id`.

`/admin/*` pasa por `verificarUsuario` y luego `verificarAdmin`.

## Ejemplo para explicar una compra

1. El frontend manda `POST /pedidos`, un token Bearer y `items` con `producto_id` y `cantidad`.
2. La ruta ejecuta `verificarUsuario`; el ID confiable sale del token, no de un `usuario_id` enviado por el navegador.
3. `pedidosController.crearPedido` valida que el carrito tenga entre 1 y 50 líneas y cantidades enteras positivas.
4. `pedidosModel.crearPedido` invoca la función PostgreSQL `crear_pedido`.
5. Esa función bloquea las filas de producto mientras verifica stock, usa los precios actuales de la base, calcula subtotales/total, inserta pedido y detalles, y descuenta stock.
6. Si falla una validación, la transacción se revierte. Si sale bien, Express devuelve 201 con el pedido.

El total que dibuja el carrito antes de comprar es una estimación. El total definitivo siempre se calcula en el backend.

## Registro y lugar del mensaje de error

1. `public/index.html`: `required`, `type="email"` y `minlength` aplican validaciones básicas del navegador.
2. `public/app.js`, función `registrar`: hace `fetch('/registro')`; si el servidor devuelve un error, lo muestra con `mostrarMensaje`.
3. `routes/tiendaRoutes.js`: conecta `POST /registro` con `authController.registro`.
4. `controllers/authController.js`: valida los datos y define el código HTTP.
5. `models/authModel.js`: llama a Supabase Auth y guarda/consulta el perfil.

Si Supabase requiere confirmar el correo, el login debe explicarlo con un mensaje propio; no es un error de contraseña. Hay que abrir el enlace de confirmación antes de iniciar sesión.

## Códigos HTTP que conviene recordar

- 200: consulta o modificación correcta.
- 201: se creó un recurso, como cuenta o pedido.
- 204: eliminación correcta sin cuerpo de respuesta.
- 400: datos inválidos o stock insuficiente.
- 401: no hay un token válido.
- 403: hay sesión, pero no permiso de administrador.
- 404: no existe el recurso solicitado.
- 500: error del servidor o dependencia.

## Preguntas posibles del profesor

**¿Por qué el precio no se toma del frontend?**  
Porque el navegador puede alterarse. El servidor busca el precio real en Supabase y calcula el total.

**¿Qué es el middleware?**  
Una función que corre antes del controller. Aquí valida sesión y, para administración, rol.

**¿Diferencia entre 401 y 403?**  
401: no se autenticó. 403: se autenticó, pero no tiene permiso.

**¿Dónde se consulta la base?**  
En `models/`. La ruta enlaza; el controller valida y responde.

**¿Cómo se evita sobreventa?**  
La función SQL bloquea las filas de producto al revisar stock y hace la compra dentro de una transacción.

**¿Qué pasa si el usuario manda un total o precio inventado?**  
No se usa como fuente de verdad: el backend toma los precios de la base y calcula el total.

**¿Cómo se decide quién es admin?**  
El middleware consulta `perfiles.rol`. El rol no se acepta del formulario ni del body de una petición.

**¿Qué significan `req.params`, `req.query` y `req.body`?**  
`params` son partes de la ruta (`/productos/:id`); `query` son filtros (`?buscar=pan`); `body` son los datos enviados en JSON (por ejemplo, los artículos del pedido).

## Demostración sugerida

1. Mostrar `GET /categorias` y `GET /productos?buscar=pan`.
2. Mostrar `POST /login` y explicar que devuelve un token.
3. Mostrar `POST /pedidos` con token Bearer y `{ "items": [{ "producto_id": 1, "cantidad": 1 }] }`.
4. Mostrar `GET /pedidos` y volver a consultar el producto para ver el stock actualizado.
5. Explicar que las rutas admin exigen autenticación y rol admin.
