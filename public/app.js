// =========================================================
// FRONT DE LA TIENDA
// El front NUNCA habla con Supabase: todo se le pide a nuestra API con fetch.
// El navegador consume la API; nunca consulta Supabase directamente.
// =========================================================

// ---------- ESTADO ----------
const catalogo = {};  // los productos que ya vinieron de la API, por id (para nombres y precios del carrito)
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];   // [ { producto_id, cantidad } ]
let token = localStorage.getItem('token');                         // lo guardamos al hacer login
let usuarioEmail = localStorage.getItem('email');
let usuarioRol = localStorage.getItem('rol') || 'cliente';
let categoriaActual = null;
let adminCatalogo = {};


// =========================================================
// CATALOGO
// =========================================================

// Pide los productos a la API y los dibuja.
// Si categoriaId tiene valor, pide solo los de esa categoria: /productos?categoria=2
async function cargarProductos(categoriaId) {
  if (categoriaId !== undefined) categoriaActual = categoriaId ? Number(categoriaId) : null;
  pintarCategoriaActiva();
  const params = new URLSearchParams();
  if (categoriaActual) params.set('categoria', categoriaActual);
  const buscar = document.getElementById('buscar')?.value.trim();
  if (buscar) params.set('buscar', buscar);
  try {
    const res = await fetch('/productos' + (params.size ? '?' + params : ''));
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error || 'No se pudieron cargar los productos');
    pintarProductos(datos);
  } catch (error) { document.getElementById('productos').innerHTML = '<p class="vacio">No se pudo conectar con la tienda.</p>'; mostrarMensaje(error.message, 'error'); }
}

// Escapa texto proveniente de la API antes de insertarlo como HTML.
function escapar(texto) { return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function buscarProductos() { cargarProductos(categoriaActual); }

// Dibuja las tarjetas (ya resuelto)
function pintarProductos(lista) {
  const grilla = document.getElementById('productos');
  lista.forEach(p => { catalogo[p.id] = p; });   // los recordamos para el carrito
  pintarCarrito();
  if (lista.length === 0) {
    grilla.innerHTML = '<p class="vacio">No hay productos para mostrar.</p>';
    return;
  }
  grilla.innerHTML = '';
  lista.forEach(p => {
    const sinStock = p.stock < 1;
    const imagen = /^https:\/\//i.test(p.imagen_url || '') ? escapar(p.imagen_url) : '';
    grilla.innerHTML += `
      <article class="tarjeta">
        <img src="${imagen}" alt="${escapar(p.nombre)}" loading="lazy">
        <div class="info">
          <span class="categoria">${escapar(p.categorias ? p.categorias.nombre : '')}</span>
          <h3>${escapar(p.nombre)}</h3>
          <p class="descripcion">${escapar(p.descripcion || '')}</p>
          <span class="precio">$${Number(p.precio).toLocaleString('es-AR')}</span>
          <span class="stock">${sinStock ? 'Sin stock' : 'Quedan ' + p.stock}</span>
          <button class="btn btn-principal" onclick="agregar(${p.id})" ${sinStock ? 'disabled' : ''}>
            Agregar al carrito
          </button>
        </div>
      </article>`;
  });
}

// Pide las categorias y arma los botones del filtro (ya resuelto)
async function cargarCategorias() {
  const res = await fetch('/categorias');
  if (!res.ok) return;
  const categorias = await res.json();
  const nav = document.getElementById('categorias');
  nav.innerHTML = '<button data-id="" onclick="cargarProductos(null)">Todos</button>';
  categorias.forEach(c => {
    nav.innerHTML += `<button data-id="${c.id}" onclick="cargarProductos(${Number(c.id)})">${escapar(c.nombre)}</button>`;
  });
  const select = document.getElementById('admin-categoria');
  if (select) select.innerHTML = categorias.map(c => `<option value="${Number(c.id)}">${escapar(c.nombre)}</option>`).join('');
  pintarCategoriaActiva();
}

function pintarCategoriaActiva() {
  document.querySelectorAll('#categorias button').forEach(b => {
    const id = b.dataset.id ? Number(b.dataset.id) : null;
    b.classList.toggle('activa', id === categoriaActual);
  });
}


// =========================================================
// CARRITO (vive en el navegador: no toca la base hasta comprar)
// =========================================================

function guardarCarrito() {
  localStorage.setItem('carrito', JSON.stringify(carrito));
  pintarCarrito();
}

function agregar(id) {
  const item = carrito.find(i => i.producto_id === id);
  if (item) item.cantidad++;
  else carrito.push({ producto_id: id, cantidad: 1 });
  guardarCarrito();
  mostrarMensaje('Producto agregado al carrito', 'ok');
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(i => i.producto_id === id);
  if (!item) return;
  item.cantidad += cambio;
  if (item.cantidad < 1) carrito = carrito.filter(i => i.producto_id !== id);
  guardarCarrito();
}

// Dibuja el carrito. El total es SOLO para mostrar:
// el total de verdad lo calcula el backend con los precios de la base.
function pintarCarrito() {
  const lista = document.getElementById('carrito-lista');
  let total = 0;
  let unidades = 0;
  lista.innerHTML = '';
  carrito.forEach(item => {
    const p = catalogo[item.producto_id];
    const nombre = p ? p.nombre : 'Producto ' + item.producto_id;
    const subtotal = p ? p.precio * item.cantidad : 0;
    total += subtotal;
    unidades += item.cantidad;
    lista.innerHTML += `
      <li>
        <span>${escapar(nombre)}<br><small>$${subtotal}</small></span>
        <span class="cantidad">
          <button onclick="cambiarCantidad(${item.producto_id}, -1)">−</button>
          ${item.cantidad}
          <button onclick="cambiarCantidad(${item.producto_id}, 1)">+</button>
        </span>
      </li>`;
  });
  if (carrito.length === 0) lista.innerHTML = '<li>Tu carrito está vacío</li>';
  document.getElementById('carrito-total').textContent = '$' + total;
  document.getElementById('contador').textContent = unidades;
}

function alternarCarrito() {
  document.getElementById('carrito').classList.toggle('oculto');
}


// =========================================================
// USUARIOS: registro, login y salida
// =========================================================

// Manda nombre, email y contraseña a POST /registro.
// Si sale bien (201), avisa y muestra el formulario de login.
async function registrar(evento) {
  evento.preventDefault();      // que el formulario no recargue la pagina
  const body = { nombre: document.getElementById('reg-nombre').value.trim(), email: document.getElementById('reg-email').value.trim(), password: document.getElementById('reg-password').value };
  try {
    const res = await fetch('/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const datos = await res.json(); if (!res.ok) throw new Error(datos.error || 'No se pudo crear la cuenta');
    evento.target.reset(); mostrarRegistro(false); mostrarMensaje(datos.requiereConfirmacion ? 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.' : 'Cuenta creada. Ya puedes iniciar sesión.', 'ok');
  } catch (error) { mostrarMensaje(error.message, 'error'); }
}

// Manda email y contraseña a POST /login.
// Si sale bien, guarda el token en localStorage y actualiza la barra.
async function iniciarSesion(evento) {
  evento.preventDefault();
  const body = { email: document.getElementById('login-email').value.trim(), password: document.getElementById('login-password').value };
  try {
    const res = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const datos = await res.json(); if (!res.ok) throw new Error(datos.error || 'No se pudo iniciar sesión');
    token = datos.token; usuarioEmail = datos.usuario.email; usuarioRol = datos.usuario.rol || 'cliente';
    localStorage.setItem('token', token); localStorage.setItem('email', usuarioEmail); localStorage.setItem('rol', usuarioRol);
    evento.target.reset(); cerrarModal(); actualizarSesion(); mostrarMensaje('Sesión iniciada', 'ok');
  } catch (error) { mostrarMensaje(error.message, 'error'); }
}

function cerrarSesion() {
  token = null;
  usuarioEmail = null;
  usuarioRol = 'cliente';
  localStorage.removeItem('token');
  localStorage.removeItem('email');
  localStorage.removeItem('rol');
  actualizarSesion();
  mostrarMensaje('Cerraste sesión', 'ok');
}

function actualizarSesion() {
  const logueado = Boolean(token);
  document.getElementById('saludo').textContent = logueado ? usuarioEmail : '';
  document.getElementById('btn-ingresar').classList.toggle('oculto', logueado);
  document.getElementById('btn-salir').classList.toggle('oculto', !logueado);
  document.getElementById('btn-pedidos').classList.toggle('oculto', !logueado);
  document.getElementById('btn-admin').classList.toggle('oculto', !logueado || usuarioRol !== 'admin');
}


// =========================================================
// COMPRA
// =========================================================

// Manda el carrito a POST /pedidos con el token en el header Authorization.
// 201: compra hecha (vaciar carrito y recargar productos para ver el stock nuevo)
// 401: no hay sesion (abrir el login)
// 400: algo del carrito no sirve (mostrar el mensaje del servidor)
async function comprar() {
  if (carrito.length === 0) return mostrarMensaje('Tu carrito está vacío', 'error');
  if (!token) { abrirModal(); return mostrarMensaje('Inicia sesión para comprar', 'error'); }
  try {
    const res = await fetch('/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ items: carrito }) });
    const datos = await res.json(); if (!res.ok) { if (res.status === 401) cerrarSesion(); throw new Error(datos.error || 'No se pudo completar la compra'); }
    carrito = []; guardarCarrito(); await cargarProductos(categoriaActual); mostrarMensaje(`Pedido #${datos.id} creado por $${Number(datos.total).toLocaleString('es-AR')}`, 'ok');
  } catch (error) { mostrarMensaje(error.message, 'error'); }
}

async function verMisPedidos() {
  const seccion = document.getElementById('pedidos'); seccion.classList.toggle('oculto');
  if (seccion.classList.contains('oculto')) return;
  try {
    const res = await fetch('/pedidos', { headers: { Authorization: 'Bearer ' + token } }); const datos = await res.json();
    if (!res.ok) throw new Error(datos.error || 'No se pudieron cargar los pedidos');
    document.getElementById('lista-pedidos').innerHTML = datos.length ? datos.map(p => `<article class="pedido"><h3>Pedido #${p.id} · ${escapar(p.estado)}</h3><p>${new Date(p.creado).toLocaleString('es-AR')} · Total $${Number(p.total).toLocaleString('es-AR')}</p><ul>${p.pedido_items.map(i => `<li>${escapar(i.productos?.nombre || 'Producto')} × ${i.cantidad} — $${Number(i.subtotal).toLocaleString('es-AR')}</li>`).join('')}</ul></article>`).join('') : '<p>Aún no tienes pedidos.</p>';
  } catch (error) { mostrarMensaje(error.message, 'error'); }
}
// El panel admin consume las mismas rutas protegidas que se pueden probar con Thunder Client.
// El panel solo se muestra a usuarios con rol admin; el servidor vuelve a verificarlo en cada ruta.
function alternarAdmin() { document.getElementById('admin').classList.toggle('oculto'); cargarProductosAdmin(); }
async function cargarProductosAdmin() {
  if (usuarioRol !== 'admin') return;
  const productosRes = await fetch('/admin/productos', { headers: { Authorization: 'Bearer ' + token } });
  const lista = await productosRes.json(); if (!productosRes.ok) return mostrarMensaje(lista.error || 'No se pudieron cargar los productos', 'error');
  adminCatalogo = Object.fromEntries(lista.map(p => [p.id, p]));
  document.getElementById('admin-productos').innerHTML = lista.map(p => `<article class="admin-fila"><strong>${escapar(p.nombre)}</strong> · $${Number(p.precio).toLocaleString('es-AR')} · Stock ${p.stock} · ${p.activo ? 'Activo' : 'Oculto'}<button class="btn btn-claro" onclick="editarProductoAdmin(${Number(p.id)})">Editar</button><button class="btn btn-claro" onclick="eliminarProductoAdmin(${Number(p.id)})">Eliminar</button></article>`).join('');
  const categorias = await (await fetch('/categorias')).json();
  document.getElementById('admin-categorias').innerHTML = categorias.map(c => `<article class="admin-fila">${escapar(c.nombre)}<button class="btn btn-claro" onclick="editarCategoriaAdmin(${Number(c.id)})">Editar</button><button class="btn btn-claro" onclick="eliminarCategoriaAdmin(${Number(c.id)})">Eliminar</button></article>`).join('');
  const pedidosRes = await fetch('/admin/pedidos', { headers: { Authorization: 'Bearer ' + token } });
  const pedidos = await pedidosRes.json();
  document.getElementById('admin-pedidos').innerHTML = pedidosRes.ok ? pedidos.map(p => `<article class="admin-fila">Pedido #${p.id} · ${escapar(p.estado)} · $${Number(p.total).toLocaleString('es-AR')}${p.estado === 'pendiente' ? `<button class="btn btn-claro" onclick="estadoPedidoAdmin(${p.id}, 'confirmado')">Confirmar</button><button class="btn btn-claro" onclick="estadoPedidoAdmin(${p.id}, 'cancelado')">Cancelar</button>` : ''}</article>`).join('') : '<p>No se pudieron cargar los pedidos.</p>';
}
async function editarProductoAdmin(id) {
  const actual = adminCatalogo[id]; if (!actual) return;
  const precio = prompt('Precio', actual.precio); if (precio === null) return;
  const stock = prompt('Stock', actual.stock); if (stock === null) return;
  const nombre = prompt('Nombre', actual.nombre); if (nombre === null) return;
  const activo = confirm('¿Producto visible en la tienda? Aceptar = sí, Cancelar = ocultar.');
  const res = await fetch('/admin/productos/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ precio: Number(precio), stock: Number(stock), nombre, activo }) });
  if (!res.ok) { const d = await res.json(); return mostrarMensaje(d.error || 'No se pudo actualizar', 'error'); }
  await cargarProductosAdmin(); await cargarProductos(categoriaActual); mostrarMensaje('Producto actualizado', 'ok');
}
async function guardarCategoria(evento) {
  evento.preventDefault();
  const res = await fetch('/admin/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ nombre: document.getElementById('admin-categoria-nombre').value.trim() }) });
  const d = res.status === 204 ? null : await res.json(); if (!res.ok) return mostrarMensaje(d.error || 'No se pudo crear la categoría', 'error');
  evento.target.reset(); await cargarCategorias(); await cargarProductosAdmin(); mostrarMensaje('Categoría creada', 'ok');
}
async function editarCategoriaAdmin(id) {
  const categorias = await (await fetch('/categorias')).json();
  const nombre = categorias.find(c => Number(c.id) === Number(id))?.nombre || '';
  const nuevo = prompt('Nombre de categoría', nombre); if (nuevo === null) return;
  const res = await fetch('/admin/categorias/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ nombre: nuevo }) });
  if (!res.ok) { const d = await res.json(); return mostrarMensaje(d.error || 'No se pudo actualizar', 'error'); }
  await cargarCategorias(); await cargarProductosAdmin();
}
async function eliminarCategoriaAdmin(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  const res = await fetch('/admin/categorias/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
  if (!res.ok) { const d = await res.json(); return mostrarMensaje(d.error || 'No se pudo eliminar', 'error'); }
  await cargarCategorias(); await cargarProductosAdmin();
}
async function estadoPedidoAdmin(id, estado) {
  const res = await fetch('/admin/pedidos/' + id + '/estado', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ estado }) });
  if (!res.ok) { const d = await res.json(); return mostrarMensaje(d.error || 'No se pudo cambiar el estado', 'error'); }
  await cargarProductosAdmin(); mostrarMensaje('Estado del pedido actualizado', 'ok');
}
async function guardarProducto(evento) {
  evento.preventDefault();
  const body = { nombre: document.getElementById('admin-nombre').value, descripcion: document.getElementById('admin-descripcion').value, precio: Number(document.getElementById('admin-precio').value), stock: Number(document.getElementById('admin-stock').value), categoria_id: Number(document.getElementById('admin-categoria').value), imagen_url: document.getElementById('admin-imagen').value || null };
  try { const res = await fetch('/admin/productos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }); const d = await res.json(); if (!res.ok) throw new Error(d.error || 'No se pudo crear'); evento.target.reset(); await cargarCategorias(); await cargarProductosAdmin(); await cargarProductos(categoriaActual); mostrarMensaje('Producto creado', 'ok'); }
  catch (error) { mostrarMensaje(error.message, 'error'); }
}
async function eliminarProductoAdmin(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try { const res = await fetch('/admin/productos/' + id, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } }); if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'No se pudo eliminar'); } await cargarProductosAdmin(); await cargarProductos(categoriaActual); mostrarMensaje('Producto eliminado', 'ok'); }
  catch (error) { mostrarMensaje(error.message, 'error'); }
}


// =========================================================
// AYUDANTES DE PANTALLA (ya resueltos)
// =========================================================

function mostrarMensaje(texto, tipo) {
  const caja = document.getElementById('mensaje');
  caja.textContent = texto;
  caja.className = 'mensaje ' + tipo;
  clearTimeout(caja.temporizador);
  caja.temporizador = setTimeout(() => caja.classList.add('oculto'), 4000);
}

function abrirModal() {
  document.getElementById('modal').classList.remove('oculto');
}

function cerrarModal() {
  document.getElementById('modal').classList.add('oculto');
}

function mostrarRegistro(mostrar) {
  document.getElementById('form-registro').classList.toggle('oculto', !mostrar);
  document.getElementById('form-login').classList.toggle('oculto', mostrar);
}


// ---------- AL ABRIR LA PAGINA ----------
cargarCategorias();
cargarProductos();
pintarCarrito();
actualizarSesion();
