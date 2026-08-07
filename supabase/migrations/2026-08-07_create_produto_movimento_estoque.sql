-- 2026-08-07_create_produto_movimento_estoque.sql

-- 1. Tabela produto
create table if not exists public.produto (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid not null references public.empresa(id) on delete cascade,
  nome text not null,
  sku text,
  categoria_id uuid references public.categoria(id),
  custo numeric(14,2) not null default 0,
  preco_venda numeric(14,2) not null default 0,
  quantidade numeric(14,2) not null default 0,
  estoque_minimo numeric(14,2) not null default 0,
  status text not null default 'ativo',
  criado_em timestamptz default now()
);

-- 2. Tabela movimento_estoque
create table if not exists public.movimento_estoque (
  id uuid default gen_random_uuid() primary key,
  produto_id uuid not null references public.produto(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','saida')),
  quantidade numeric(14,2) not null check (quantidade > 0),
  data date not null default current_date,
  motivo text,
  referencia_conta_pagar_id uuid references public.conta_pagar(id),
  referencia_conta_receber_id uuid references public.conta_receber(id),
  criado_em timestamptz default now()
);

-- 3. Habilitar RLS
alter table public.produto enable row level security;
alter table public.movimento_estoque enable row level security;

-- 4. Policies de isolamento por empresa (via usuario_empresa.user_id = auth.uid())

-- produto policies
create policy "rls_produto_select"
  on public.produto
  for select
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_produto_insert"
  on public.produto
  for insert
  with check (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

create policy "rls_produto_update"
  on public.produto
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

create policy "rls_produto_delete"
  on public.produto
  for delete
  using (
    empresa_id in (
      select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
    )
  );

-- movimento_estoque policies
create policy "rls_mov_estoque_select"
  on public.movimento_estoque
  for select
  using (
    produto_id in (
      select p.id from public.produto p
      where p.empresa_id in (
        select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
      )
    )
  );

create policy "rls_mov_estoque_insert"
  on public.movimento_estoque
  for insert
  with check (
    exists (
      select 1 from public.produto p
      where p.id = produto_id and p.empresa_id in (
        select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
      )
    )
  );

create policy "rls_mov_estoque_update"
  on public.movimento_estoque
  for update
  using (
    exists (
      select 1 from public.produto p
      where p.id = produto_id and p.empresa_id in (
        select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
      )
    )
  )
  with check (
    exists (
      select 1 from public.produto p
      where p.id = produto_id and p.empresa_id in (
        select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
      )
    )
  );

create policy "rls_mov_estoque_delete"
  on public.movimento_estoque
  for delete
  using (
    produto_id in (
      select p.id from public.produto p
      where p.empresa_id in (
        select ue.empresa_id from public.usuario_empresa ue where ue.user_id = auth.uid()
      )
    )
  );

-- 5. Trigger/Function: atualização transacional da quantidade

-- Função que impede atualização direta da coluna quantidade, a menos que a flag 'stock.moving' esteja ativa
create or replace function public.block_direct_quantidade_updates()
returns trigger as $$
begin
  if (TG_OP = 'UPDATE') then
    if NEW.quantidade <> OLD.quantidade then
      -- checar se a flag temporária está ativa
      if current_setting('stock.moving', true) is null or current_setting('stock.moving', true) <> 'true' then
        raise exception 'Edicao direta de produto.quantidade nao permitida; utilize movimentos de estoque (movimento_estoque)';
      end if;
    end if;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_block_produto_quantidade_update
before update on public.produto
for each row
execute function public.block_direct_quantidade_updates();

-- Função que processa movimentacoes e atualiza produto.quantidade de forma transacional
create or replace function public.handle_movimento_estoque()
returns trigger as $$
declare
  delta numeric := 0;
  new_qty numeric;
begin
  if (TG_OP = 'INSERT') then
    if NEW.tipo = 'entrada' then
      delta := NEW.quantidade;
    elsif NEW.tipo = 'saida' then
      delta := - NEW.quantidade;
    else
      raise exception 'Tipo de movimento invalido';
    end if;

    -- ativar flag local de transacao para permitir update da quantidade
    perform set_config('stock.moving', 'true', true);

    update public.produto
      set quantidade = quantidade + delta
      where id = NEW.produto_id
      returning quantidade into new_qty;

    if NOT FOUND then
      raise exception 'Produto nao encontrado';
    end if;

    if new_qty < 0 then
      raise exception 'Movimentacao invalida: quantidade resultante negativa';
    end if;

    return NEW;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_handle_movimento_insert
after insert on public.movimento_estoque
for each row
execute function public.handle_movimento_estoque();

-- 6. View produto_view com flag estoque_baixo
create or replace view public.produto_view as
select
  p.*,
  (p.quantidade < p.estoque_minimo) as estoque_baixo,
  c.nome as categoria_nome
from public.produto p
left join public.categoria c on c.id = p.categoria_id;

-- 7. Indexes
create index if not exists idx_produto_empresa on public.produto (empresa_id);
create index if not exists idx_mov_estoque_produto on public.movimento_estoque (produto_id);
