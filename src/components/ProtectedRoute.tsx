"use client";

import React, { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useEmpresa } from '@/context/EmpresaContext';
import { useEmpresaPapel } from '@/hooks/useEmpresaPapel';

export default function ProtectedRoute({ children, allowed = ['admin','financeiro'] }: { children: ReactNode; allowed?: string[] }) {
  const router = useRouter();
  const papel = useEmpresaPapel();
  const { empresaAtiva, loading } = useEmpresa();

  useEffect(() => {
    if (!loading && empresaAtiva && papel) {
      if (!allowed.includes(papel)) {
        router.replace('/app/dashboard');
      }
    }
  }, [loading, empresaAtiva, papel, router, allowed]);

  if (!empresaAtiva || loading || !papel) return <div>Carregando...</div>;
  if (!allowed.includes(papel)) return null;

  return <>{children}</>;
}
