"use client";

import { useEffect, useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { useEmpresa } from '@/context/EmpresaContext';

export function useEmpresaPapel() {
  const supabase = useSupabaseClient();
  const user = useUser();
  const { empresaAtiva } = useEmpresa();
  const [papel, setPapel] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !empresaAtiva) {
      setPapel(null);
      return;
    }
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('usuario_empresa')
        .select('papel')
        .eq('user_id', user.id)
        .eq('empresa_id', empresaAtiva.id)
        .single();
      if (!mounted) return;
      if (error) {
        console.error(error);
        setPapel(null);
        return;
      }
      setPapel((data as any).papel);
    })();
    return () => { mounted = false; };
  }, [user, empresaAtiva, supabase]);

  return papel;
}
