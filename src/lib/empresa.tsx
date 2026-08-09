import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Empresa = { id: string; nome: string; cnpj: string | null };

/** Identificador reservado da visão consolidada (não é um empresa_id real). */
export const TODAS = "todas";

type Ctx = {
  empresas: Empresa[];
  /** Empresa ativa. Fica nula na visão consolidada. */
  empresa: Empresa | null;
  empresaId: string | null;
  setEmpresaId: (id: string) => void;
  /** Permissão vinda do banco (usuario_empresa.pode_ver_consolidado). */
  podeConsolidar: boolean;
  consolidado: boolean;
  /** IDs de empresa que as consultas devem abranger. */
  escopo: string[];
  nomeEmpresa: (id: string | null | undefined) => string;
  carregando: boolean;
};

const EmpresaContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "empresa_ativa";

export function EmpresaProvider({ children }: { children: ReactNode }) {
  const [empresaId, setEmpresaIdState] = useState<string | null>(null);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresa")
        .select("id, nome, cnpj")
        .order("nome");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  // Fonte de verdade da permissão: função no banco, não estado do front-end.
  const { data: podeConsolidar = false } = useQuery({
    queryKey: ["pode_consolidar"],
    queryFn: async () => {
      const { data, error } = await (
        supabase as unknown as {
          rpc: (n: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
        }
      ).rpc("pode_consolidar");
      if (error) throw new Error(error.message);
      return data === true;
    },
  });

  useEffect(() => {
    if (!empresas.length) return;
    const salvo = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const valido =
      salvo === TODAS && podeConsolidar
        ? TODAS
        : (empresas.find((e) => e.id === salvo)?.id ?? empresas[0]!.id);
    setEmpresaIdState((atual) => {
      if (atual === TODAS) return podeConsolidar ? TODAS : empresas[0]!.id;
      return atual && empresas.some((e) => e.id === atual) ? atual : valido;
    });
  }, [empresas, podeConsolidar]);

  const setEmpresaId = (id: string) => {
    const alvo = id === TODAS && !podeConsolidar ? (empresas[0]?.id ?? null) : id;
    if (!alvo) return;
    setEmpresaIdState(alvo);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, alvo);
  };

  const consolidado = empresaId === TODAS && podeConsolidar;
  const empresa = consolidado ? null : (empresas.find((e) => e.id === empresaId) ?? null);
  const escopo = consolidado ? empresas.map((e) => e.id) : empresa ? [empresa.id] : [];
  const nomeEmpresa = (id: string | null | undefined) =>
    empresas.find((e) => e.id === id)?.nome ?? "—";

  return (
    <EmpresaContext.Provider
      value={{
        empresas,
        empresa,
        empresaId,
        setEmpresaId,
        podeConsolidar,
        consolidado,
        escopo,
        nomeEmpresa,
        carregando: isLoading,
      }}
    >
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa precisa estar dentro de EmpresaProvider");
  return ctx;
}
