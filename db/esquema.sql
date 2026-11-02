-- Esquema de Panaderia. Ejecutar en SQL Editor de Supabase.
-- Cada tabla representa una entidad; las claves foráneas conectan sus registros.
create table if not exists categorias (
  id bigint generated always as identity primary key,
  nombre text not null unique check (length(trim(nombre)) between 1 and 80)
);
create table if not exists productos (
  id bigint generated always as identity primary key,
  nombre text not null check (length(trim(nombre)) between 1 and 120),
  descripcion text,
  precio numeric(10,2) not null check (precio >= 0),
  stock integer not null default 0 check (stock >= 0),
  imagen_url text,
  categoria_id bigint references categorias(id) on delete restrict,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table productos add column if not exists created_at timestamptz not null default now();
-- El usuario y la contraseña viven en Supabase Auth; aquí guardamos nombre y rol.
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null default 'cliente' check (rol in ('cliente', 'admin')),
  created_at timestamptz not null default now()
);
-- El pedido pertenece a un usuario; sus líneas se guardan en pedido_items.
create table if not exists pedidos (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users(id) on delete restrict,
  total numeric(10,2) not null check (total >= 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'confirmado', 'cancelado')),
  creado timestamptz not null default now()
);
create table if not exists pedido_items (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos(id) on delete cascade,
  producto_id bigint not null references productos(id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null check (precio_unitario >= 0),
  subtotal numeric(12,2) generated always as (cantidad * precio_unitario) stored
);
alter table pedido_items add column if not exists subtotal numeric(12,2) generated always as (cantidad * precio_unitario) stored;
create index if not exists productos_categoria_activo_idx on productos(categoria_id, activo);
create index if not exists pedidos_usuario_creado_idx on pedidos(usuario_id, creado desc);
create index if not exists pedido_items_pedido_idx on pedido_items(pedido_id);
alter table categorias enable row level security;
alter table productos enable row level security;
alter table perfiles enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;

-- Semilla de datos: permite probar catálogo y filtros sin crear filas a mano.
insert into categorias(nombre) values ('Panes'), ('Facturas'), ('Tortas'), ('Masas'), ('Bizcochos'), ('Pasteleria'), ('Sandwiches'), ('Especiales') on conflict (nombre) do nothing;
insert into productos(nombre, descripcion, precio, stock, imagen_url, categoria_id)
select v.nombre, v.descripcion, v.precio, v.stock, v.imagen_url, c.id from (values
 ('Pan frances', 'Clasico, corteza dorada y miga suave.', 1200::numeric, 40, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/7.jpg', 'Panes'),
 ('Pan integral', 'Harina integral y semillas.', 2200::numeric, 18, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/8.jpg', 'Panes'),
 ('Baguette', 'Baguette artesanal de fermentacion lenta.', 1800::numeric, 20, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/4.jpg', 'Panes'),
 ('Medialunas', 'Docena de medialunas de manteca.', 6500::numeric, 12, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/3.jpg', 'Facturas'),
 ('Facturas surtidas', 'Media docena surtida del dia.', 4800::numeric, 15, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/6.jpg', 'Facturas'),
 ('Torta de chocolate', 'Torta artesanal para compartir.', 18000::numeric, 5, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/11.jpg', 'Tortas'),
 ('Pastafrola', 'Membrillo y masa casera.', 7800::numeric, 8, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/9.jpg', 'Masas'),
 ('Bizcochos de grasa', 'Bolsa horneada en el dia.', 2600::numeric, 16, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/1.jpg', 'Bizcochos'),
 ('Alfajores de maicena', 'Media docena con dulce de leche.', 5400::numeric, 10, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/2.jpg', 'Pasteleria'),
 ('Sandwich de miga', 'Media docena de jamon y queso.', 7200::numeric, 9, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/10.jpg', 'Sandwiches'),
 ('Budin casero', 'Budin de limon glaseado.', 3900::numeric, 10, 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/5.jpg', 'Especiales')
) v(nombre, descripcion, precio, stock, imagen_url, categoria)
join categorias c on c.nombre = v.categoria
where not exists (select 1 from productos p where p.nombre = v.nombre);

-- Completa imágenes en los productos de ejemplo ya insertados sin URL.
update productos p
set imagen_url = v.imagen_url
from (values
 ('Pan frances', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/7.jpg'),
 ('Pan integral', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/8.jpg'),
 ('Baguette', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/4.jpg'),
 ('Medialunas', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/3.jpg'),
 ('Facturas surtidas', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/6.jpg'),
 ('Torta de chocolate', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/11.jpg'),
 ('Pastafrola', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/9.jpg'),
 ('Bizcochos de grasa', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/1.jpg'),
 ('Alfajores de maicena', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/2.jpg'),
 ('Sandwich de miga', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/10.jpg'),
 ('Budin casero', 'https://vnbnvjkxwzsincchkbdk.supabase.co/storage/v1/object/public/productos/5.jpg')
) as v(nombre, imagen_url)
where p.nombre = v.nombre and (p.imagen_url is null or p.imagen_url = '');

-- La compra se procesa en una sola transaccion y bloquea filas para evitar sobreventa.
create or replace function crear_pedido(p_usuario_id uuid, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  item record;
  producto productos%rowtype;
  nuevo_id bigint;
  total_pedido numeric(10,2) := 0;
  detalles jsonb := '[]'::jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then raise exception 'CARRITO_INVALIDO'; end if;
  if exists (select 1 from jsonb_to_recordset(p_items) x(producto_id bigint, cantidad integer) where x.producto_id is null or x.cantidad is null or x.cantidad <= 0) then raise exception 'CARRITO_INVALIDO'; end if;
  for item in select x.producto_id, sum(x.cantidad)::integer cantidad from jsonb_to_recordset(p_items) x(producto_id bigint, cantidad integer) group by x.producto_id order by x.producto_id loop
    select * into producto from productos where id = item.producto_id for update;
    if not found or not producto.activo then raise exception 'PRODUCTO_NO_DISPONIBLE'; end if;
    if producto.stock < item.cantidad then raise exception 'STOCK_INSUFICIENTE'; end if;
    total_pedido := total_pedido + producto.precio * item.cantidad;
    detalles := detalles || jsonb_build_array(jsonb_build_object('producto_id', producto.id, 'cantidad', item.cantidad, 'precio_unitario', producto.precio, 'subtotal', producto.precio * item.cantidad, 'nombre', producto.nombre));
  end loop;
  insert into pedidos(usuario_id, total) values (p_usuario_id, total_pedido) returning id into nuevo_id;
  for item in select * from jsonb_to_recordset(detalles) x(producto_id bigint, cantidad integer, precio_unitario numeric, subtotal numeric, nombre text) loop
    insert into pedido_items(pedido_id, producto_id, cantidad, precio_unitario) values (nuevo_id, item.producto_id, item.cantidad, item.precio_unitario);
    update productos set stock = stock - item.cantidad where id = item.producto_id;
  end loop;
  return jsonb_build_object('id', nuevo_id, 'usuario_id', p_usuario_id, 'total', total_pedido, 'estado', 'pendiente', 'items', detalles);
end;
$$;

create or replace function cambiar_estado_pedido(p_pedido_id bigint, p_estado text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare pedido pedidos%rowtype;
begin
  select * into pedido from pedidos where id = p_pedido_id for update;
  if not found then raise exception 'PEDIDO_NO_ENCONTRADO'; end if;
  if p_estado not in ('confirmado', 'cancelado') or pedido.estado <> 'pendiente' then raise exception 'TRANSICION_INVALIDA'; end if;
  if p_estado = 'cancelado' then update productos p set stock = p.stock + pi.cantidad from pedido_items pi where pi.pedido_id = p_pedido_id and p.id = pi.producto_id; end if;
  update pedidos set estado = p_estado where id = p_pedido_id returning * into pedido;
  return jsonb_build_object('id', pedido.id, 'usuario_id', pedido.usuario_id, 'total', pedido.total, 'estado', pedido.estado, 'creado', pedido.creado);
end;
$$;
revoke all on function crear_pedido(uuid, jsonb) from public, anon, authenticated;
revoke all on function cambiar_estado_pedido(bigint, text) from public, anon, authenticated;
grant execute on function crear_pedido(uuid, jsonb) to service_role;
grant execute on function cambiar_estado_pedido(bigint, text) to service_role;

-- Se crea perfil de cliente al registrarse; el rol no se toma del formulario.
create or replace function crear_perfil_nuevo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles(id, nombre, rol) values (new.id, coalesce(new.raw_user_meta_data->>'nombre', ''), 'cliente');
  return new;
end;
$$;
drop trigger if exists al_crear_usuario_perfil on auth.users;
create trigger al_crear_usuario_perfil after insert on auth.users for each row execute procedure crear_perfil_nuevo();
