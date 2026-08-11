import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StatusCheque = "emitido" | "compensado" | "devolvido" | "cancelado";

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
  conta_bancaria_id: string | null;
  conciliado: boolean;
  conciliado_em: string | null;
  numero_documento: string | null;
  parcela: string | null;
  valor_pago: number | null;
  valor_desconto: number;
  valor_multa_juros: number;
  numero_cheque: string | null;
  banco_emissor: string | null;
  cheque_conta_bancaria_id: string | null;
  status_cheque: StatusCheque | null;
  grupo_parcelamento_id: string | null;
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
  conta_bancaria_id: string | null;
  conciliado: boolean;
  conciliado_em: string | null;
  numero_documento: string | null;
  parcela: string | null;
  valor_recebido: number | null;
  valor_desconto: number;
  valor_multa_juros: number;
  numero_cheque: string | null;
  banco_emissor: string | null;
  status_cheque: StatusCheque | null;
  grupo_parcelamento_id: string | null;
  percentual_taxa_maquininha: number | null;
  valor_taxa_maquininha: number | null;
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
  natureza_id: string | null;
};

export type Natureza = {
  id: string;
  empresa_id: string;
  nome: string;
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

/** Nome da natureza a partir da lista cadastrada. */
export const nomeNatureza = (
  naturezas: Natureza[],
  id: string | null | undefined,
) => naturezas.find((n) => n.id === id)?.nome ?? "Sem natureza";

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
    "id, descricao, valor, categoria_id, fornecedor_id, forma_pagamento, data_vencimento, data_pagamento, status, conta_bancaria_id, conciliado, conciliado_em, numero_documento, parcela, valor_pago, valor_desconto, valor_multa_juros, numero_cheque, banco_emissor, cheque_conta_bancaria_id, status_cheque, grupo_parcelamento_id",
    "data_vencimento",
  );

export const useReceber = (escopo?: Escopo) =>
  useTabela<ContaReceber>(
    "conta_receber",
    escopo,
    "id, descricao, valor, categoria_id, cliente_id, forma_recebimento, data_vencimento, data_recebimento, status, conta_bancaria_id, conciliado, conciliado_em, numero_documento, parcela, valor_recebido, valor_desconto, valor_multa_juros, numero_cheque, banco_emissor, status_cheque, grupo_parcelamento_id",
    // percentual/valor da taxa da maquininha entram no líquido de cartão
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
  useTabela<Categoria>("categoria", escopo, "id, nome, tipo, natureza_id", "nome");

export const useNaturezas = (escopo?: Escopo) =>
  useTabela<Natureza>("natureza", escopo, "id, nome", "nome");

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

/** UPDATE em lote por lista de ids. */
export async function atualizarEmLote(
  nome: string,
  ids: string[],
  valores: Record<string, unknown>,
): Promise<void> {
  if (!ids.length) return;
  const alvo = supabase.from(nome as never) as unknown as {
    update: (v: Record<string, unknown>) => {
      in: (k: string, v: string[]) => PromiseLike<{ error: Erro }>;
    };
  };
  const { error } = await alvo.update(valores).in("id", ids);
  if (error) throw new Error(error.message);
}

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
  statusCheque?: StatusCheque | null,
): "pago" | "recebido" | "pendente" | "vencido" | "cancelado" {
  // Cheque cancelado saiu de circulação: não entra em caixa nem em aberto.
  if (statusCheque === "cancelado") return "cancelado";
  // Cheque ainda não compensado não conta como pago/recebido, mesmo vencido.
  if (statusCheque === "emitido" || statusCheque === "devolvido") {
    return vencimento < hojeISO ? "vencido" : "pendente";
  }
  if (status === "pago" || status === "recebido") return status;
  return vencimento < hojeISO ? "vencido" : "pendente";
}

/** Datas de cheques a partir da primeira data e do intervalo escolhido. */
export function datasParcelas(
  primeira: string,
  quantidade: number,
  intervalo: "mensal" | "quinzenal" | "semanal",
): string[] {
  return Array.from({ length: Math.max(1, quantidade) }, (_, i) => {
    const d = new Date(`${primeira}T12:00:00`);
    if (intervalo === "mensal") d.setMonth(d.getMonth() + i);
    else d.setDate(d.getDate() + i * (intervalo === "quinzenal" ? 15 : 7));
    return d.toISOString().slice(0, 10);
  });
}