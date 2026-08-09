import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContaPagar = {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  fornecedor_id: string | null;
  forma_pagamento: string | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: "pendente" | "pago" | "vencido";
};

export type ContaReceber = {
  id: string;
  empresa_id: string;
  descricao: string;
  valor: number;
  categoria_id: string | null;
  cliente_id: string | null;
  forma_recebimento: string | null;
  data_vencimento: string;
  data_recebimento: string | null;
  status: "pendente" | "recebido" | "vencido";
};

export type Produto = {
  id: string;
  empresa_id: string;
  nome: string;
  sku: string | null;
  categoria_id: string | null;
  custo: number;
  preco_venda: number;
  quantidade: number;
  estoque_minimo: number;
  ativo: boolean;
};

export type Categoria = {
  id: string;
  empresa_id: string;
  nome: string;
  tipo: "despesa" | "receita" | "produto";
  natureza: "mercadoria" | "servico" | "outro" | null;
};

export type ContaBancaria = {
  id: string;
  empresa_id: string;
  banco: string;
  agencia: string | null;
  conta: string | null;
  tipo: string;
  saldo_inicial: number;
};

export type Natureza = "mercadoria" | "servico" | "outro";

export const NATUREZAS: { valor: Natureza; rotulo: string }[] = [
  { valor: "mercadoria", rotulo: "Mercadoria / insumo" },
  { valor: "servico", rotulo: "Serviço prestado" },
  { valor: "outro", rotulo: "Outro" },
];

export const rotuloNatureza = (n: string | null | undefined) =>
  NATUREZAS.find((x) => x.valor === n)?.rotulo ?? "Sem natureza";

export type Parceiro = {
  id: string;
  empresa_id: string;
  nome: string;
  contato: string | null;
  documento: string | null;
};

export type Movimento = {
  id: string;
  empresa_id: string;
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  custo_unitario: number | null;
  observacao: string | null;
  data: string;
};

/** Escopo de consulta: uma empresa ou várias (visão consolidada). */
export type Escopo = string | string[] | undefined;

const ids = (escopo: Escopo): string[] =>
  escopo === undefined ? [] : Array.isArray(escopo) ? escopo : [escopo];

function useTabela<T>(tabela: string, escopo: Escopo, colunas: string, ordem: string) {
  type Loose = {
    select: (c: string) => {
      in: (
        k: string,
        v: string[],
      ) => {
        order: (
          c: string,
          o: { ascending: boolean },
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
  };
  const alvo = ids(escopo);
  return useQuery({
    queryKey: [tabela, alvo.join(",")],
    enabled: alvo.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from(tabela as never) as unknown as Loose)
        .select(colunas.includes("empresa_id") ? colunas : `empresa_id, ${colunas}`)
        .in("empresa_id", alvo)
        .order(ordem, { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as T[];
    },
  });
}

export const usePagar = (escopo?: Escopo) =>
  useTabela<ContaPagar>(
    "conta_pagar",
    escopo,
    "id, descricao, valor, categoria_id, fornecedor_id, forma_pagamento, data_vencimento, data_pagamento, status",
    "data_vencimento",
  );

export const useReceber = (escopo?: Escopo) =>
  useTabela<ContaReceber>(
    "conta_receber",
    escopo,
    "id, descricao, valor, categoria_id, cliente_id, forma_recebimento, data_vencimento, data_recebimento, status",
    "data_vencimento",
  );

export const useProdutos = (escopo?: Escopo) =>
  useTabela<Produto>(
    "produto",
    escopo,
    "id, nome, sku, categoria_id, custo, preco_venda, quantidade, estoque_minimo, ativo",
    "nome",
  );

export const useCategorias = (escopo?: Escopo) =>
  useTabela<Categoria>("categoria", escopo, "id, nome, tipo, natureza", "nome");

export const useContasBancarias = (escopo?: Escopo) =>
  useTabela<ContaBancaria>(
    "conta_bancaria",
    escopo,
    "id, banco, agencia, conta, tipo, saldo_inicial",
    "banco",
  );

export const useFornecedores = (escopo?: Escopo) =>
  useTabela<Parceiro>("fornecedor", escopo, "id, nome, contato, documento", "nome");

export const useClientes = (escopo?: Escopo) =>
  useTabela<Parceiro>("cliente", escopo, "id, nome, contato, documento", "nome");

export const useMovimentos = (escopo?: Escopo) =>
  useTabela<Movimento>(
    "movimento_estoque",
    escopo,
    "id, produto_id, tipo, quantidade, custo_unitario, observacao, data",
    "data",
  );

/** Situação real considerando vencimento (contas vencidas destacadas). */
type Erro = { message: string } | null;
type LooseTable = {
  insert: (v: Record<string, unknown>) => Promise<{ error: Erro }>;
  update: (v: Record<string, unknown>) => { eq: (k: string, val: string) => Promise<{ error: Erro }> };
  delete: () => { eq: (k: string, val: string) => Promise<{ error: Erro }> };
};

/** Acesso simples de escrita a uma tabela da empresa ativa. */
export const tabela = (nome: string) => supabase.from(nome as never) as unknown as LooseTable;

type Resultado = { data: unknown; error: Erro };
type Filtravel = { eq: (coluna: string, valor: string) => Filtravel } & PromiseLike<Resultado>;

/** SELECT genérico com filtros de igualdade. */
export async function selecionar<T>(
  nome: string,
  colunas: string,
  filtros: Record<string, string>,
): Promise<T[]> {
  let consulta = (
    supabase.from(nome as never) as unknown as { select: (c: string) => Filtravel }
  ).select(colunas);
  for (const [coluna, valor] of Object.entries(filtros)) consulta = consulta.eq(coluna, valor);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

/** INSERT retornando o registro criado. */
export async function inserirRetornando<T>(
  nome: string,
  valores: Record<string, unknown>,
  colunas = "id",
): Promise<T> {
  const alvo = supabase.from(nome as never) as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (c: string) => { single: () => PromiseLike<Resultado> };
    };
  };
  const { data, error } = await alvo.insert(valores).select(colunas).single();
  if (error) throw new Error(error.message);
  return data as T;
}

export function situacao(
  status: string,
  vencimento: string,
  hojeISO: string,
): "pago" | "recebido" | "pendente" | "vencido" {
  if (status === "pago" || status === "recebido") return status;
  return vencimento < hojeISO ? "vencido" : "pendente";
}