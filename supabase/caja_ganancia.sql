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
