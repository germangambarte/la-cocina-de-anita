-- Agrega el estado "listo para entregar" a los pedidos
-- Ejecutar en el SQL Editor de Supabase.
alter table public.pedidos
  add column if not exists listo boolean not null default false;
