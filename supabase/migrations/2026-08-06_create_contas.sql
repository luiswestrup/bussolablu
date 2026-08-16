-- 2026-08-06_create_contas.sql

-- 1. Tabelas conta_pagar e conta_receber
create table if not exists public.conta_pagar (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  descricao text not null,
  valor numeric(14,2) not null,
  categoria_id uuid references public.categoria(id),
  fornecedor_id uuid references public.fornecedor(id),
  forma_pagamento text,
  data_vencimento date not null,
  data_pagamento date null,
  criado_em timestamptz default now()
);

create table if not exists public.conta_receber (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  descricao text not null,
  valor numeric(14,2) not null,
  cliente_id uuid references public.cliente(id),
  forma_recebimento text,
  data_vencimento date not null,
  data_recebimento date null,
  criado_em timestamptz default now()
);

-- 2. Habilitar RLS
alter table public.conta_pagar enable row level security;
alter table public.conta_receber enable row level security;
ALTER TABLE public.conta_pagar ADD COLUMN observacao text;
ALTER TABLE public.conta_receber ADD COLUMN observacao text;

-- 3. Policies de isolamento por empresa (via usuario_empresa.user_id = auth.uid())

create policy "rls_conta_pagar_select"
  on public.conta_pagar
  for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_conta_pagar_insert"
  on public.conta_pagar
  for insert
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_conta_pagar_update"
  on public.conta_pagar
  for update
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  )
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_conta_pagar_delete"
  on public.conta_pagar
  for delete
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

-- conta_receber policies
create policy "rls_conta_receber_select"
  on public.conta_receber
  for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_conta_receber_insert"
  on public.conta_receber
  for insert
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_conta_receber_update"
  on public.conta_receber
  for update
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  )
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_conta_receber_delete"
  on public.conta_receber
  for delete
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

-- 4. Views que calculam status automaticamente
create or replace view public.conta_pagar_view as
select
  cp.*,
  case
    when cp.data_pagamento is not null then 'pago'
    when cp.data_vencimento < current_date and cp.data_pagamento is null then 'vencido'
    else 'pendente'
  end as status
from public.conta_pagar cp;

create or replace view public.conta_receber_view as
select
  cr.*,
  case
    when cr.data_recebimento is not null then 'recebido'
    when cr.data_vencimento < current_date and cr.data_recebimento is null then 'vencido'
    else 'pendente'
  end as status
from public.conta_receber cr;

-- 5. Indexes opcionais
create index if not exists idx_conta_pagar_empresa_venc on public.conta_pagar (empresa_id, data_vencimento);
create index if not exists idx_conta_receber_empresa_venc on public.conta_receber (empresa_id, data_vencimento);
