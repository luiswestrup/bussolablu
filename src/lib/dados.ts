import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ContaPagar = {
  id: string;
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
  nome: string;
  tipo: "despesa" | "receita" | "produto";
};

export type Parceiro = { id: string; nome: string; contato: string | null; documento: string | null };

export type Movimento = {
  id: string;
  produto_id: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  custo_unitario: number | null;
  observacao: string | null;
  data: string;
};

function useTabela<T>(tabela: string, empresaId: string | undefined, colunas: string, ordem: string) {
  return useQuery({
    queryKey: [tabela, empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .eq("empresa_id", empresaId!)
        .order(ordem, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
  });
}

export const usePagar = (empresaId?: string) =>
  useTabela<ContaPagar>(
    "conta_pagar",
    empresaId,
    "id, descricao, valor, categoria_id, fornecedor_id, forma_pagamento, data_vencimento, data_pagamento, status",
    "data_vencimento",
  );

export const useReceber = (empresaId?: string) =>
  useTabela<ContaReceber>(
    "conta_receber",
    empresaId,
    "id, descricao, valor, categoria_id, cliente_id, forma_recebimento, data_vencimento, data_recebimento, status",
    "data_vencimento",
  );

export const useProdutos = (empresaId?: string) =>
  useTabela<Produto>(
    "produto",
    empresaId,
    "id, nome, sku, categoria_id, custo, preco_venda, quantidade, estoque_minimo, ativo",
    "nome",
  );

export const useCategorias = (empresaId?: string) =>
  useTabela<Categoria>("categoria", empresaId, "id, nome, tipo", "nome");

export const useFornecedores = (empresaId?: string) =>
  useTabela<Parceiro>("fornecedor", empresaId, "id, nome, contato, documento", "nome");

export const useClientes = (empresaId?: string) =>
  useTabela<Parceiro>("cliente", empresaId, "id, nome, contato, documento", "nome");

export const useMovimentos = (empresaId?: string) =>
  useTabela<Movimento>(
    "movimento_estoque",
    empresaId,
    "id, produto_id, tipo, quantidade, custo_unitario, observacao, data",
    "data",
  );

/** Situação real considerando vencimento (contas vencidas destacadas). */
export function situacao(
  status: string,
  vencimento: string,
  hojeISO: string,
): "pago" | "recebido" | "pendente" | "vencido" {
  if (status === "pago" || status === "recebido") return status;
  return vencimento < hojeISO ? "vencido" : "pendente";
}