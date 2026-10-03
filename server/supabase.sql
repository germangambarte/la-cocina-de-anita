create type metodo_pago_enum as enum ('efectivo', 'transferencia', 'pendiente');

create table pedidos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  cliente_nombre text not null,
  cantidad_regular integer default 0 not null,
  cantidad_grande integer default 0 not null,
  hora_entrega time not null, -- Guardamos la hora límite de entrega (ej: 13:30)
  es_delivery boolean default false not null,
  costo_delivery numeric(10, 2) default 0,
  monto_total numeric(10, 2) not null,
  metodo_pago metodo_pago_enum default 'pendiente' not null,
  delivery_pagado boolean default false not null, -- True si ya le pagaste el viaje al cadete
  entregado boolean default false not null
);

-- Asegurar RLS en la tabla
alter table pedidos enable row level security;

-- Borrar cualquier regla pública
drop policy if exists "Permitir lectura pública" on pedidos;
drop policy if exists "Permitir inserción pública" on pedidos;
drop policy if exists "Permitir actualización pública" on pedidos;

-- Crear regla estricta: Solo el usuario logueado puede operar
create policy "Acceso exclusivo para dueño" 
on pedidos 
for all 
to authenticated 
using (true) 
with check (true);

--====================================================
-- 1. Agregar el nombre del plato al pedido
alter table pedidos 
add column menu_nombre text default 'Menú del día';

-- 2. (Opcional) Crear una vista para ver estadísticas de los platos más vendidos
create or replace view ranking_platos as
select 
  menu_nombre,
  count(id) as total_pedidos,
  sum(cantidad_regular) as total_regulares,
  sum(cantidad_grande) as total_grandes,
  sum(cantidad_regular + cantidad_grande) as total_viandas,
  sum(monto_total) as recaudacion_total
from pedidos
group by menu_nombre
order by total_viandas desc;

--========================================
-- Categorías sugeridas para insumos de viandas
create type categoria_gasto_enum as enum (
  'carnes',
  'verduras_hortalizas',
  'pastas_legumbres',
  'almacen_pan',
  'descartables_envases',
  'servicios_gas_luz',
  'varios'
);

create table gastos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  fecha date default CURRENT_DATE not null, -- Fecha de la compra
  concepto text not null, -- Ej: "Compra en verdulería Don José"
  categoria categoria_gasto_enum default 'varios' not null,
  monto numeric(10, 2) not null,
  metodo_pago text default 'efectivo' -- efectivo, transferencia
);

-- Habilitar RLS en Gastos
alter table gastos enable row level security;

create policy "Acceso exclusivo para dueño en gastos" 
on gastos 
for all 
to authenticated 
using (true) 
with check (true);

--=====================================================
-- Crear tabla de configuración clave-valor
create table if not exists configuracion (
  clave text primary key,
  valor text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Habilitar RLS
alter table configuracion enable row level security;

-- Permitir lectura y escritura a usuarios autenticados
create policy "Permitir todo a usuarios autenticados" on configuracion
  for all using (auth.role() = 'authenticated');

-- Insertar el menú por defecto inicial
insert into configuracion (clave, valor)
values ('menu_del_dia', 'Escalopes con puré mixto')
on conflict (clave) do nothing;

--=================================================

-- 1. Eliminar la vista actual
drop view if exists ranking_platos;

-- 2. Volver a crearla
create view ranking_platos as
select 
  trim(menu_nombre) as menu_nombre,
  count(*)::integer as total_pedidos,
  coalesce(sum(cantidad_regular), 0)::integer as total_regulares,
  coalesce(sum(cantidad_grande), 0)::integer as total_grandes,
  coalesce(sum(cantidad_regular + cantidad_grande), 0)::integer as total_viandas,
  coalesce(sum(monto_total), 0) as recaudacion_total
from pedidos
group by trim(menu_nombre);


-- ============================================================
-- CAJA DE GANANCIA: dinero de la ganancia disponible para gastar
-- Ejecutar este script en el SQL Editor de Supabase.
-- ============================================================

-- 1) Configuración de la caja (una sola fila)
--    fecha_inicio  : desde qué día se acumula la ganancia automáticamente
--    saldo_inicial : dinero con el que se arranca la caja ese día
create table if not exists public.caja_config (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  fecha_inicio  date not null,
  saldo_inicial numeric(12,2) not null default 0
);

alter table public.caja_config enable row level security;

create policy "caja_config_select" on public.caja_config
  for select to authenticated using (auth.uid() is not null);
create policy "caja_config_insert" on public.caja_config
  for insert to authenticated with check (auth.uid() is not null);
create policy "caja_config_update" on public.caja_config
  for update to authenticated using (auth.uid() is not null);
create policy "caja_config_delete" on public.caja_config
  for delete to authenticated using (auth.uid() is not null);

-- 2) Retiros de la ganancia (plata que se SACA de la caja para gastos personales)
create table if not exists public.caja_retiros (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fecha      date not null default current_date,
  concepto   text not null,
  monto      numeric(12,2) not null check (monto > 0)
);

alter table public.caja_retiros enable row level security;

create policy "caja_retiros_select" on public.caja_retiros
  for select to authenticated using (auth.uid() is not null);
create policy "caja_retiros_insert" on public.caja_retiros
  for insert to authenticated with check (auth.uid() is not null);
create policy "caja_retiros_update" on public.caja_retiros
  for update to authenticated using (auth.uid() is not null);
create policy "caja_retiros_delete" on public.caja_retiros
  for delete to authenticated using (auth.uid() is not null);


-- Agrega el estado "listo para entregar" a los pedidos
-- Ejecutar en el SQL Editor de Supabase.
alter table public.pedidos
  add column if not exists listo boolean not null default false;
