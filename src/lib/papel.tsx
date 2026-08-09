import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresa } from "@/lib/empresa";

export type Papel = "admin" | "financeiro" | "estoque";

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  estoque: "Estoque",
};

const PESO: Record<Papel, number> = { estoque: 1, financeiro: 2, admin: 3 };

type Vinculo = { empresa_id: string; papel: Papel };

function rpc<T>(nome: string) {
  return (
    supabase as unknown as {
      rpc: (n: string) => PromiseLike<{ data: T; error: { message: string } | null }>;
    }
  ).rpc(nome);
}

/** Papéis do usuário logado, por empresa (fonte de verdade: banco). */
export function usePapel() {
  const { empresaId, consolidado } = useEmpresa();

  const { data: vinculos = [], isLoading } = useQuery({
    queryKey: ["meus_papeis"],
    queryFn: async () => {
      const { data, error } = await rpc<Vinculo[] | null>("meus_papeis");
      if (error) throw new Error(error.message);
      return (data ?? []) as Vinculo[];
    },
  });

  const maior = (lista: Vinculo[]): Papel | null =>
    lista.length === 0
      ? null
      : lista.reduce((a, b) => (PESO[b.papel] > PESO[a.papel] ? b : a)).papel;

  const papel: Papel | null = consolidado
    ? maior(vinculos)
    : (vinculos.find((v) => v.empresa_id === empresaId)?.papel ?? maior(vinculos));

  return {
    papel,
    vinculos,
    eAdmin: papel === "admin",
    eEstoque: papel === "estoque",
    carregando: isLoading,
  };
}

/** Papéis com acesso a cada rota do sistema. */
export const ACESSO: Record<string, Papel[]> = {
  "/dashboard": ["admin", "financeiro", "estoque"],
  "/estoque": ["admin", "financeiro", "estoque"],
  "/pagamentos": ["admin", "financeiro"],
  "/recebimentos": ["admin", "financeiro"],
  "/calendario": ["admin", "financeiro"],
  "/conciliacao": ["admin", "financeiro"],
  "/importar-notas": ["admin", "financeiro"],
  "/relatorios": ["admin", "financeiro"],
  "/configuracoes": ["admin", "financeiro"],
};

export function podeAcessar(rota: string, papel: Papel | null): boolean {
  if (!papel) return false;
  const chave = Object.keys(ACESSO).find((r) => rota.startsWith(r));
  return chave ? ACESSO[chave]!.includes(papel) : true;
}