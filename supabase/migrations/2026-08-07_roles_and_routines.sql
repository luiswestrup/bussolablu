-- 2026-08-07_roles_and_routines.sql

-- 1) Policies by role for conta_pagar
create policy if not exists "conta_pagar_select_by_role"
  on public.conta_pagar
  for select
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  );

create policy if not exists "conta_pagar_insert_by_role"
  on public.conta_pagar
  for insert
  with check (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  );

create policy if not exists "conta_pagar_update_by_role"
  on public.conta_pagar
  for update
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  )
  with check (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  );

create policy if not exists "conta_pagar_delete_admin_only"
  on public.conta_pagar
  for delete
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel = 'admin'
    )
  );

-- 2) Policies by role for conta_receber
create policy if not exists "conta_receber_select_by_role"
  on public.conta_receber
  for select
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  );

create policy if not exists "conta_receber_insert_by_role"
  on public.conta_receber
  for insert
  with check (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  );

create policy if not exists "conta_receber_update_by_role"
  on public.conta_receber
  for update
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  )
  with check (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','financeiro')
    )
  );

create policy if not exists "conta_receber_delete_admin_only"
  on public.conta_receber
  for delete
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel = 'admin'
    )
  );

-- 3) produto policies (allow estoque and admin to write; finance can read)
create policy if not exists "produto_select_by_role"
  on public.produto
  for select
  using (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','estoque','financeiro')
    )
  );

create policy if not exists "produto_insert_update_delete_admin_estoque"
  on public.produto
  for insert, update, delete
  with check (
    exists (
      select 1 from public.usuario_empresa ue
      where ue.user_id = auth.uid()
        and ue.empresa_id = empresa_id
        and ue.papel in ('admin','estoque')
    )
  );

-- 4) movimento_estoque policies (allow estoque and admin to insert/read)
create policy if not exists "mov_estoque_select_by_role"
  on public.movimento_estoque
  for select
  using (
    exists (
      select 1 from public.produto p
      join public.usuario_empresa ue on ue.empresa_id = p.empresa_id
      where p.id = produto_id and ue.user_id = auth.uid() and ue.papel in ('admin','estoque','financeiro')
    )
  );

create policy if not exists "mov_estoque_insert_by_role"
  on public.movimento_estoque
  for insert
  with check (
    exists (
      select 1 from public.produto p
      join public.usuario_empresa ue on ue.empresa_id = p.empresa_id
      where p.id = produto_id and ue.user_id = auth.uid() and ue.papel in ('admin','estoque')
    )
  );

-- 5) Function to mark vencidos (persist status in tables)

alter table public.conta_pagar add column if not exists status text;
alter table public.conta_receber add column if not exists status text;

create or replace function public.mark_vencidas()
returns void as $$
begin
  update public.conta_pagar
  set status = case
    when data_pagamento is not null then 'pago'
    when data_vencimento < current_date and data_pagamento is null then 'vencido'
    else 'pendente' end;

  update public.conta_receber
  set status = case
    when data_recebimento is not null then 'recebido'
    when data_vencimento < current_date and data_recebimento is null then 'vencido'
    else 'pendente' end;
end;
$$ language plpgsql;

-- Note: scheduling depends on availability of pg_cron or Supabase Scheduled Functions.
-- If pg_cron is available, you can schedule the function like this (uncomment if allowed):
-- create extension if not exists pg_cron;
-- select cron.schedule('0 5 * * *', $$select public.mark_vencidas()$$);
