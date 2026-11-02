// RUTAS: el mapa de direcciones. Nada de logica aca.
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const productos = require('../controllers/productosController');
const pedidos = require('../controllers/pedidosController');
const categorias = require('../controllers/categoriasController');
const verificarUsuario = require('../middlewares/verificarUsuario');
const verificarAdmin = require('../middlewares/verificarAdmin');

// Rutas públicas: cualquiera puede consultar el catálogo o crear/iniciar una cuenta.
router.post('/registro', auth.registro);
router.post('/login', auth.login);
router.get('/categorias', productos.verCategorias);
router.get('/productos', productos.verProductos);
router.get('/productos/:id', productos.verProducto);
// Rutas de cliente: primero se valida el token y luego se ejecuta el controller.
router.post('/pedidos', verificarUsuario, pedidos.crearPedido);
router.get('/pedidos', verificarUsuario, pedidos.misPedidos);
router.get('/pedidos/:id', verificarUsuario, pedidos.verPedido);

// Administración: debe pasar ambos controles (sesión válida y rol admin).
router.post('/admin/productos', verificarUsuario, verificarAdmin, productos.crearProducto);
router.patch('/admin/productos/:id', verificarUsuario, verificarAdmin, productos.actualizarProducto);
router.delete('/admin/productos/:id', verificarUsuario, verificarAdmin, productos.eliminarProducto);
router.post('/admin/categorias', verificarUsuario, verificarAdmin, categorias.crear);
router.patch('/admin/categorias/:id', verificarUsuario, verificarAdmin, categorias.actualizar);
router.delete('/admin/categorias/:id', verificarUsuario, verificarAdmin, categorias.eliminar);
router.get('/admin/pedidos', verificarUsuario, verificarAdmin, pedidos.pedidosAdmin);
router.get('/admin/productos', verificarUsuario, verificarAdmin, productos.verProductosAdmin);
router.patch('/admin/pedidos/:id/estado', verificarUsuario, verificarAdmin, pedidos.cambiarEstado);

module.exports = router;
