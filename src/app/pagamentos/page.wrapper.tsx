"use client";

import React from 'react';
import PagamentosPage from '@/app/pagamentos/page';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function PagamentosWrapper() {
  return (
    <ProtectedRoute allowed={['admin','financeiro']}>
      <PagamentosPage />
    </ProtectedRoute>
  );
}
