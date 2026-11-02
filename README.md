# Panadería La Espiga

Proyecto final de Diseño Backend 2026: tienda online de panadería construida sobre la plantilla de clase con Express, JavaScript y Supabase. El backend es la autoridad para precios, stock, pedidos, autenticación y permisos.

Para preparar la defensa, consulta [GUIA_EXPOSICION.md](GUIA_EXPOSICION.md), que explica cada carpeta, las rutas y preguntas frecuentes.

## Funcionalidades

- Catálogo público con categorías, búsqueda por nombre, detalle y disponibilidad.
- Registro e inicio de sesión con Supabase Auth; token Bearer para endpoints protegidos.
- Carrito en el navegador. El pedido envía IDs y cantidades; el servidor vuelve a consultar precios y stock.
- Compra atómica: valida disponibilidad, calcula el total, registra el pedido y descuenta stock en una única función PostgreSQL.
- Historial de pedidos propio y consulta de un pedido con autorización por usuario.
- CRUD administrativo de productos y categorías; consulta y cambio de estado de pedidos.
- Cancelar un pedido pendiente repone el stock. Los pedidos confirmados no se pueden cancelar por esta API.
- RLS habilitado. El servidor usa la clave secreta de Supabase; nunca se publica en el frontend.

## Tecnologías y estructura

Node.js, Express 4, Supabase JS, Supabase Auth, PostgreSQL, HTML, CSS y Fetch API. Se mantiene la separación de la plantilla:

```text
config/       cliente de Supabase
middlewares/  autenticación y rol admin
models/       consultas y operaciones Supabase
controllers/  validación, lógica de request/response
routes/       métodos, endpoints y middlewares
utils/        errores de aplicación
db/           esquema, datos iniciales y funciones transaccionales
public/       tienda y panel administrativo básico
index.js      configuración Express y servidor local/Vercel
```

## Configuración local

1. Crea un proyecto Supabase y ejecuta `db/esquema.sql` desde el SQL Editor. El script crea las tablas, las funciones transaccionales, el trigger de perfiles y datos de ejemplo. Si las tablas ya existen, aplica el script sobre el mismo proyecto para agregar los elementos faltantes.
2. En Storage crea el bucket público `productos` y sube las imágenes. Guarda sus URLs HTTPS en `productos.imagen_url`.
3. Copia `.env.example` como `.env` y completa `SUPABASE_URL` y `SUPABASE_KEY` con una clave secreta de servidor (`sb_secret_...` o `service_role` en proyectos que aún usan ese formato). No uses una clave `sb_publishable_`/`anon` aquí, ni publiques la clave secreta en el navegador o Git.
4. Ejecuta `npm install` y `npm start`; abre `http://localhost:3000`.

La confirmación de correo de Supabase puede estar activa. Si lo está, el usuario debe confirmar el correo antes de iniciar sesión. Las cuentas nuevas siempre reciben rol `cliente`.

Si el login indica que falta confirmar el correo, revisa el enlace enviado por Supabase (incluida la carpeta de spam). Para una demo local sin paso de confirmación, el administrador del proyecto puede desactivar **Confirm email** en Authentication → Providers → Email; después de cambiarlo, registra una cuenta nueva para probar.

### Crear el primer administrador

Registra una cuenta desde la tienda y confirma el correo si el proyecto lo requiere. Luego, desde el SQL Editor de Supabase, asigna el rol a ese UUID (consultable en Authentication → Users):

```sql
update public.perfiles
set rol = 'admin'
where id = 'UUID_DEL_USUARIO';
```

La interfaz muestra Administración luego de volver a iniciar sesión. Nunca se acepta el rol enviado por el navegador.

## API

Los errores se devuelven como JSON `{ "error": "..." }`. Los IDs deben ser enteros positivos. Los endpoints administrativos exigen un usuario autenticado con rol `admin`.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/categorias` | Público | Lista categorías |
| GET | `/productos?categoria=1&buscar=pan` | Público | Catálogo filtrable |
| GET | `/productos/:id` | Público | Detalle de producto activo |
| POST | `/registro` | Público | Registro `{ nombre, email, password }` |
| POST | `/login` | Público | Login `{ email, password }`; devuelve `token` y usuario |
| POST | `/pedidos` | Bearer | Compra `{ items: [{ producto_id, cantidad }] }` |
| GET | `/pedidos` | Bearer | Pedidos propios |
| GET | `/pedidos/:id` | Bearer | Pedido propio; admin puede consultar cualquiera |
| POST | `/admin/productos` | Admin | Crear producto |
| GET | `/admin/productos` | Admin | Lista productos activos e inactivos |
| PATCH | `/admin/productos/:id` | Admin | Actualizar campos del producto |
| DELETE | `/admin/productos/:id` | Admin | Eliminar producto si no tiene referencias en pedidos |
| POST | `/admin/categorias` | Admin | Crear categoría `{ nombre }` |
| PATCH | `/admin/categorias/:id` | Admin | Renombrar categoría |
| DELETE | `/admin/categorias/:id` | Admin | Eliminar categoría sin productos asociados |
| GET | `/admin/pedidos` | Admin | Lista todos los pedidos |
| PATCH | `/admin/pedidos/:id/estado` | Admin | Cambia pedido pendiente a `confirmado` o `cancelado` |

Enviar `Authorization: Bearer TOKEN` en las rutas protegidas. Los precios, subtotales, total, usuario y estado inicial se determinan en el servidor/base.

## Deploy en Vercel

Importa el repositorio en Vercel y configura `SUPABASE_URL` y `SUPABASE_KEY` como variables de entorno. `index.js` exporta Express y solo abre un puerto cuando no se ejecuta en Vercel. El deploy no está publicado todavía: **URL: completar cuando exista**.

## Prueba manual con Thunder Client

1. `GET /categorias` y `GET /productos`.
2. `POST /registro`, confirma el correo si es necesario, y luego `POST /login`.
3. Copia el token y envíalo como Bearer en `POST /pedidos`, usando IDs de productos de la respuesta del catálogo.
4. Revisa `GET /pedidos` y el stock actualizado con `GET /productos`.
5. Eleva una cuenta a admin siguiendo la consulta SQL anterior, vuelve a iniciar sesión y prueba rutas `/admin/*`.
6. Verifica que sin token se recibe 401, con cliente en rutas admin 403, y con cantidades mayores al stock la compra responde 400 sin crear pedido ni descontar unidades.

Integrantes: completar · Deploy: completar

Prof. Julia Panei · UTN Neuquén · Diseño Backend 2026
