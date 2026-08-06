"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";

type Empresa = { id: string; nome: string; cnpj?: string };

type EmpresaContextValue = {
  empresaAtiva: Empresa | null;
  setEmpresaAtiva: (e: Empresa | null) => void;
  empresas: Empresa[];
  loading: boolean;
};

const EmpresaContext = createContext<EmpresaContextValue | undefined>(undefined);

export const EmpresaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaAtiva, setEmpresaAtiva] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEmpresas([]);
      setEmpresaAtiva(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("usuario_empresa")
        .select("empresa(id,nome,cnpj)")
        .eq("user_id", user.id);

      if (error) {
        console.error(error);
        setEmpresas([]);
        setLoading(false);
        return;
      }
      const mapped = (data || []).map((r: any) => r.empresa as Empresa);
      setEmpresas(mapped);
      if (mapped.length === 1) setEmpresaAtiva(mapped[0]);
      setLoading(false);
    })();
  }, [user, supabase]);

  return (
    <EmpresaContext.Provider value={{ empresaAtiva, setEmpresaAtiva, empresas, loading }}>
      {children}
    </EmpresaContext.Provider>
  );
};

export const useEmpresa = () => {
  const ctx = useContext(EmpresaContext);
  if (!ctx) throw new Error("useEmpresa must be used within EmpresaProvider");
  return ctx;
};
