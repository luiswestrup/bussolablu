import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Empresa = { id: string; nome: string; cnpj: string | null };

type Ctx = {
  empresas: Empresa[];
  empresa: Empresa | null;
  setEmpresaId: (id: string) => void;
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

  useEffect(() => {
    if (!empresas.length) return;
    const salvo = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const valido = empresas.find((e) => e.id === salvo) ?? empresas[0]!;
    setEmpresaIdState((atual) => (atual && empresas.some((e) => e.id === atual) ? atual : valido.id));
  }, [empresas]);

  const setEmpresaId = (id: string) => {
    setEmpresaIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const empresa = empresas.find((e) => e.id === empresaId) ?? null;

  return (
    <EmpresaContext.Provider value={{ empresas, empresa, setEmpresaId, carregando: isLoading }}>
      {children}
    </EmpresaContext.Provider>
  );
}

export function useEmpresa() {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa precisa estar dentro de EmpresaProvider");
  return ctx;
}